// Minimal parser for SQL schemas: reads CREATE TABLE statements (and
// ALTER TABLE ... ADD FOREIGN KEY) from PostgreSQL, MySQL, SQLite or SQL Server
// dumps and returns a schema usable by the diagram and the SQL generator.
// It is not a full SQL parser: views, indexes, triggers... are ignored.

const IDENT = String.raw`(?:"(?:[^"]|"")+"|\x60[^\x60]+\x60|\[[^\]]+\]|[\w$]+)`;
const QUALIFIED = String.raw`${IDENT}(?:\s*\.\s*${IDENT})*`;

/** `"public"."users"` -> `users` */
export function unquoteIdentifier(raw) {
	const parts = raw.match(new RegExp(IDENT, "g")) ?? [raw];
	const last = parts[parts.length - 1].trim();
	if (/^".*"$/.test(last)) return last.slice(1, -1).replace(/""/g, '"');
	if (/^[`[].*[`\]]$/.test(last)) return last.slice(1, -1);
	return last;
}

const identList = (s) =>
	(s.match(new RegExp(IDENT, "g")) ?? []).map(unquoteIdentifier);

const stripComments = (sql) =>
	sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").replace(/^\s*#[^\n]*/gm, " ");

/** Splits on commas that are not inside parentheses or quotes. */
function splitTopLevel(body) {
	const parts = [];
	let depth = 0;
	let quote = null;
	let current = "";
	for (const ch of body) {
		if (quote) {
			if (ch === quote) quote = null;
		} else if (ch === "'" || ch === '"' || ch === "`") {
			quote = ch;
		} else if (ch === "(") {
			depth++;
		} else if (ch === ")") {
			depth--;
		} else if (ch === "," && depth === 0) {
			parts.push(current.trim());
			current = "";
			continue;
		}
		current += ch;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
}

/** Returns the text between the parenthesis at `start` and its matching one. */
function balancedBody(sql, start) {
	let depth = 0;
	let quote = null;
	for (let i = start; i < sql.length; i++) {
		const ch = sql[i];
		if (quote) {
			if (ch === quote) quote = null;
		} else if (ch === "'" || ch === '"' || ch === "`") {
			quote = ch;
		} else if (ch === "(") {
			depth++;
		} else if (ch === ")" && --depth === 0) {
			return { body: sql.slice(start + 1, i), end: i };
		}
	}
	return null;
}

/** Maps a SQL type (VARCHAR(80), int unsigned, timestamp with time zone...) to a generic type. */
export function mapSqlType(rawType) {
	const t = rawType.toLowerCase().trim();
	const length = Number((t.match(/\(\s*(\d+)/) ?? [])[1]) || null;
	if (/^tinyint\s*\(\s*1\s*\)/.test(t) || /^(bool|boolean|bit)\b/.test(t))
		return { type: "boolean", length: null };
	if (/^(bigint|int8|bigserial|serial8)\b/.test(t)) return { type: "bigint", length: null };
	if (/^(int|integer|int4|int2|smallint|tinyint|mediumint|serial|smallserial)\b/.test(t))
		return { type: "integer", length: null };
	if (/^(decimal|numeric|money|smallmoney|number)\b/.test(t)) return { type: "decimal", length: null };
	if (/^(float|double|real|float4|float8)\b/.test(t)) return { type: "float", length: null };
	if (/^(timestamp|datetime|datetime2|smalldatetime|datetimeoffset)\b/.test(t))
		return { type: "datetime", length: null };
	if (/^date\b/.test(t)) return { type: "date", length: null };
	if (/^jsonb?\b/.test(t)) return { type: "json", length: null };
	if (/^uuid\b|^uniqueidentifier\b/.test(t)) return { type: "string", length: 36 };
	if (/char|varying|varchar2|nvarchar|string/.test(t) && !/max/.test(t))
		return { type: "string", length: length ?? 255 };
	return { type: "text", length: null };
}

const CONSTRAINT_START =
	/\b(NOT\s+NULL|NULL|PRIMARY\s+KEY|REFERENCES|DEFAULT|UNIQUE|CHECK|AUTO_INCREMENT|AUTOINCREMENT|IDENTITY|GENERATED|COLLATE|CONSTRAINT|COMMENT|ON\s+UPDATE|CHARACTER\s+SET)\b/i;

const referenceRe = new RegExp(
	String.raw`REFERENCES\s+(${QUALIFIED})\s*(?:\(([^)]*)\))?`,
	"i"
);

function parseColumn(def) {
	const nameMatch = def.match(new RegExp(`^(${IDENT})\\s*`));
	if (!nameMatch) return null;
	const name = unquoteIdentifier(nameMatch[1]);
	const rest = def.slice(nameMatch[0].length);
	const idx = rest.search(CONSTRAINT_START);
	const rawType = (idx === -1 ? rest : rest.slice(0, idx)).trim() || "TEXT";
	const constraints = idx === -1 ? "" : rest.slice(idx);

	const ref = constraints.match(referenceRe);
	const pk = /PRIMARY\s+KEY/i.test(constraints);
	return {
		name,
		rawType: rawType.replace(/\s+/g, " "),
		...mapSqlType(rawType),
		nullable: !pk && !/NOT\s+NULL/i.test(constraints),
		pk,
		unique: /\bUNIQUE\b/i.test(constraints),
		fk: ref
			? {
					table: unquoteIdentifier(ref[1]),
					column: ref[2] ? identList(ref[2])[0] : null,
			  }
			: null,
	};
}

const tableConstraintRe = {
	primary: /^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*(?:CLUSTERED\s*|NONCLUSTERED\s*)?\(([^)]*)\)/i,
	foreign: new RegExp(
		String.raw`^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*(?:${IDENT}\s*)?\(([^)]*)\)\s*REFERENCES\s+(${QUALIFIED})\s*(?:\(([^)]*)\))?`,
		"i"
	),
	unique: /^(?:CONSTRAINT\s+\S+\s+)?UNIQUE\s*(?:KEY|INDEX)?\s*(?:\S+\s*)?\(([^)]*)\)/i,
	// `KEY idx (col)` is an index but `key VARCHAR(10)` is a column named "key"
	other: new RegExp(
		String.raw`^(?:CONSTRAINT\s+\S+\s+)?(?:CHECK\s*\(|FULLTEXT\b|SPATIAL\b|EXCLUDE\b|(?:KEY|INDEX)\s*(?:${IDENT}\s*)?\(\s*[^\s\d)])`,
		"i"
	),
};

/**
 * @param {string} sql
 * @returns {{ schema: {tables: object[]}, errors: string[] }}
 */
export function parseSqlSchema(sql) {
	const errors = [];
	const clean = stripComments(sql);
	const tables = [];
	const foreignKeys = []; // { table, columns, refTable, refColumns }

	const createRe = new RegExp(
		String.raw`CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:GLOBAL|LOCAL)\s+)?(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(${QUALIFIED})\s*\(`,
		"gi"
	);
	let match;
	while ((match = createRe.exec(clean))) {
		const name = unquoteIdentifier(match[1]);
		const block = balancedBody(clean, match.index + match[0].length - 1);
		if (!block) {
			errors.push(`Table "${name}": missing closing parenthesis.`);
			break;
		}
		createRe.lastIndex = block.end;

		const columns = [];
		const pkColumns = [];
		const uniqueColumns = [];
		for (const def of splitTopLevel(block.body)) {
			let m;
			if ((m = def.match(tableConstraintRe.primary))) {
				pkColumns.push(...identList(m[1]));
			} else if ((m = def.match(tableConstraintRe.foreign))) {
				foreignKeys.push({
					table: name,
					columns: identList(m[1]),
					refTable: unquoteIdentifier(m[2]),
					refColumns: m[3] ? identList(m[3]) : [],
				});
			} else if ((m = def.match(tableConstraintRe.unique))) {
				const cols = identList(m[1]);
				if (cols.length === 1) uniqueColumns.push(cols[0]);
			} else if (!tableConstraintRe.other.test(def)) {
				const col = parseColumn(def);
				if (col) columns.push(col);
			}
		}
		for (const col of columns) {
			if (pkColumns.includes(col.name)) {
				col.pk = true;
				col.nullable = false;
			}
			if (uniqueColumns.includes(col.name)) col.unique = true;
			if (col.fk) {
				foreignKeys.push({
					table: name,
					columns: [col.name],
					refTable: col.fk.table,
					refColumns: col.fk.column ? [col.fk.column] : [],
				});
				col.fk = null;
			}
		}
		if (tables.some((t) => t.id === name)) {
			errors.push(`Table "${name}" is defined twice, the last definition is used.`);
			tables.splice(tables.findIndex((t) => t.id === name), 1);
		}
		tables.push({ id: name, name, source: "sql", columns, rows: [] });
	}

	const alterRe = new RegExp(
		String.raw`ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(${QUALIFIED})\s+ADD\s+(?:CONSTRAINT\s+${IDENT}\s+)?FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+(${QUALIFIED})\s*(?:\(([^)]*)\))?`,
		"gi"
	);
	while ((match = alterRe.exec(clean))) {
		foreignKeys.push({
			table: unquoteIdentifier(match[1]),
			columns: identList(match[2]),
			refTable: unquoteIdentifier(match[3]),
			refColumns: match[4] ? identList(match[4]) : [],
		});
	}

	const byId = new Map(tables.map((t) => [t.id, t]));
	for (const fk of foreignKeys) {
		const table = byId.get(fk.table);
		const target = byId.get(fk.refTable);
		if (!table) continue;
		if (!target) {
			errors.push(`${fk.table}: referenced table "${fk.refTable}" not found.`);
			continue;
		}
		const refColumns = fk.refColumns.length
			? fk.refColumns
			: target.columns.filter((c) => c.pk).map((c) => c.name);
		fk.columns.forEach((colName, i) => {
			const col = table.columns.find((c) => c.name === colName);
			if (!col || !refColumns[i]) return;
			const oneToOne =
				col.unique || (col.pk && table.columns.filter((c) => c.pk).length === 1);
			col.fk = {
				tableId: target.id,
				column: refColumns[i],
				cardinality: oneToOne ? "1:1" : "1:N",
			};
		});
	}

	if (tables.length === 0) errors.push("No CREATE TABLE statement found.");
	return { schema: { tables }, errors };
}

// Infers a relational schema (tables, columns, primary and foreign keys) from JSON data.
//
// - the root array becomes the main table, each object one row
// - a nested object becomes a child table in a 1:1 relation
// - an array of objects becomes a child table in a 1:N relation
// - an array of primitives becomes a child table with a single "value" column
// Child tables get a foreign key column "<parent>_id" referencing the parent primary key.
// A column named "id" holding unique integers is reused as primary key, otherwise a
// surrogate "id" column is added.

import { isPlainObject } from "./jsonGraph";

/**
 * Schema shape shared with the SQL parser:
 * {
 *   tables: [{
 *     id, name, source: "json" | "sql",
 *     columns: [{ name, type, length, rawType?, nullable, pk, unique?, fk: { tableId, column, cardinality } | null }],
 *     rows: [{ [columnName]: value }]
 *   }]
 * }
 * Generic column types: integer, bigint, float, decimal, boolean, date, datetime, string, text, json
 */

export const COLUMN_TYPES = [
	"integer",
	"bigint",
	"float",
	"decimal",
	"boolean",
	"date",
	"datetime",
	"string",
	"text",
	"json",
];

const INT32_MAX = 2147483647;
const VARCHAR_MAX = 255;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE =
	/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function inferValueType(v) {
	if (v === null || v === undefined) return null;
	if (typeof v === "boolean") return "boolean";
	if (typeof v === "number") {
		if (!Number.isInteger(v)) return "float";
		return Math.abs(v) > INT32_MAX ? "bigint" : "integer";
	}
	if (typeof v === "string") {
		if (DATE_RE.test(v)) return "date";
		if (DATETIME_RE.test(v)) return "datetime";
		return "string";
	}
	return "json";
}

const NUMERIC_RANK = { integer: 1, bigint: 2, float: 3 };

/** Smallest type able to hold values of both types. */
export function mergeTypes(a, b) {
	if (!a) return b;
	if (!b || a === b) return a;
	if (NUMERIC_RANK[a] && NUMERIC_RANK[b])
		return NUMERIC_RANK[a] > NUMERIC_RANK[b] ? a : b;
	if (
		(a === "date" && b === "datetime") ||
		(a === "datetime" && b === "date")
	)
		return "datetime";
	return "string";
}

/** "Prénom du client" -> "prenom_du_client" */
export function sanitizeName(name) {
	let s = String(name)
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^A-Za-z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase();
	if (s === "") s = "col";
	if (/^\d/.test(s)) s = `c_${s}`;
	return s;
}

const uniqueIn = (used, base) => {
	let name = base;
	let i = 2;
	while (used.has(name)) name = `${base}_${i++}`;
	used.add(name);
	return name;
};

const escapeKey = (key) => String(key).replace(/~/g, "~0").replace(/\//g, "~1");

export function inferSchema(data, { rootName = "data" } = {}) {
	const tables = [];
	const byPath = new Map();
	const tableNames = new Set();

	const getTable = (path, baseName, parent, relation) => {
		let table = byPath.get(path);
		if (!table) {
			const base = sanitizeName(baseName);
			const name =
				parent && tableNames.has(base)
					? uniqueIn(tableNames, `${parent.name}_${base}`)
					: uniqueIn(tableNames, base);
			table = {
				id: path,
				name,
				parent,
				relation,
				cols: new Map(), // original key -> column
				colNames: new Set(),
				rows: [],
			};
			byPath.set(path, table);
			tables.push(table);
		} else if (relation === "1:N") {
			// the same key holds an object in some rows and an array in others
			table.relation = "1:N";
		}
		return table;
	};

	const observe = (table, key, value) => {
		let col = table.cols.get(key);
		if (!col) {
			col = {
				name: uniqueIn(table.colNames, sanitizeName(key)),
				type: null,
				nonNull: 0,
				maxLength: 0,
			};
			table.cols.set(key, col);
		}
		if (value !== null && value !== undefined) {
			col.nonNull++;
			col.type = mergeTypes(col.type, inferValueType(value));
			col.maxLength = Math.max(col.maxLength, String(value).length);
		}
		return col;
	};

	const addRow = (table, obj, parentRow) => {
		const row = { values: {}, parent: parentRow };
		table.rows.push(row);

		for (const [key, value] of Object.entries(obj)) {
			const path = `${table.id}/${escapeKey(key)}`;
			if (isPlainObject(value)) {
				addRow(getTable(path, key, table, "1:1"), value, row);
			} else if (Array.isArray(value)) {
				for (const item of value) {
					if (isPlainObject(item)) {
						addRow(getTable(path, key, table, "1:N"), item, row);
					} else {
						const child = getTable(`${path}[]`, `${table.name}_${key}`, table, "1:N");
						const v = Array.isArray(item) ? JSON.stringify(item) : item;
						addRow(child, { value: v }, row);
					}
				}
			} else {
				row.values[observe(table, key, value).name] = value ?? null;
			}
		}
	};

	const root = () => getTable("$", rootName, null, null);
	if (Array.isArray(data)) {
		data.forEach((item) =>
			addRow(root(), isPlainObject(item) ? item : { value: item }, null)
		);
	} else if (isPlainObject(data)) {
		addRow(root(), data, null);
	} else if (data !== undefined) {
		addRow(root(), { value: data }, null);
	}

	// Primary keys first: the foreign keys of the children need the parent ids
	for (const table of tables) {
		const idCol = [...table.cols.values()].find((c) => c.name === "id");
		const ids = table.rows.map((r) => r.values.id);
		const naturalKey =
			idCol &&
			(idCol.type === "integer" || idCol.type === "bigint") &&
			idCol.nonNull === table.rows.length &&
			new Set(ids).size === ids.length;

		if (naturalKey) {
			table.pk = { name: "id", type: idCol.type, surrogate: false };
		} else {
			const name = table.colNames.has("id")
				? uniqueIn(table.colNames, "row_id")
				: uniqueIn(table.colNames, "id");
			table.pk = { name, type: "integer", surrogate: true };
			table.rows.forEach((r, i) => (r.values[name] = i + 1));
		}
		table.rows.forEach((r) => (r.id = r.values[table.pk.name]));
	}

	for (const table of tables) {
		if (!table.parent) continue;
		const name = uniqueIn(table.colNames, `${table.parent.name}_id`);
		table.fk = {
			name,
			type: table.parent.pk.type,
			tableId: table.parent.id,
			column: table.parent.pk.name,
		};
		table.rows.forEach((r) => (r.values[name] = r.parent.id));
	}

	return {
		tables: tables.map((t) => {
			const columns = [];
			if (t.pk.surrogate) {
				columns.push({
					name: t.pk.name,
					type: "integer",
					length: null,
					nullable: false,
					pk: true,
					fk: null,
				});
			}
			if (t.fk) {
				columns.push({
					name: t.fk.name,
					type: t.fk.type,
					length: null,
					nullable: false,
					pk: false,
					fk: {
						tableId: t.fk.tableId,
						column: t.fk.column,
						cardinality: t.relation,
					},
				});
			}
			for (const col of t.cols.values()) {
				let type = col.type ?? "string";
				if (type === "string" && col.maxLength > VARCHAR_MAX) type = "text";
				const isPk = !t.pk.surrogate && col.name === t.pk.name;
				const column = {
					name: col.name,
					type,
					length: type === "string" ? VARCHAR_MAX : null,
					nullable: !isPk && col.nonNull < t.rows.length,
					pk: isPk,
					fk: null,
				};
				// keep the natural primary key first
				isPk ? columns.unshift(column) : columns.push(column);
			}
			return {
				id: t.id,
				name: t.name,
				source: "json",
				columns,
				rows: t.rows.map((r) => r.values),
			};
		}),
	};
}

/** Applies the user edits made in the diagram (table renames, column types). */
export function applySchemaOverrides(schema, overrides) {
	if (!schema) return schema;
	const { tableNames = {}, columnTypes = {} } = overrides;
	return {
		...schema,
		tables: schema.tables.map((t) => ({
			...t,
			name: tableNames[t.id] ?? t.name,
			columns: t.columns.map((c) => {
				const type = columnTypes[`${t.id}::${c.name}`];
				if (!type) return c;
				return {
					...c,
					type,
					rawType: undefined,
					length: type === "string" ? c.length ?? VARCHAR_MAX : null,
				};
			}),
		})),
	};
}

/** Foreign key relations of a schema, one entry per foreign key column. */
export function schemaRelations(schema) {
	const relations = [];
	for (const table of schema.tables) {
		for (const col of table.columns) {
			if (!col.fk) continue;
			const target = schema.tables.find((t) => t.id === col.fk.tableId);
			if (!target) continue;
			relations.push({
				id: `${table.id}.${col.name}->${target.id}.${col.fk.column}`,
				from: { tableId: table.id, column: col.name },
				to: { tableId: target.id, column: col.fk.column },
				cardinality: col.fk.cardinality ?? "1:N",
			});
		}
	}
	return relations;
}

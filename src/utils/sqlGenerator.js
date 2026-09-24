// Generates SQL (CREATE TABLE + INSERT) and Mermaid ER diagrams from a schema
// (see schemaInference.js for the schema shape).

import { schemaRelations } from "./schemaInference";

const quoteWith = (open, close = open) => (name) =>
	`${open}${String(name).split(close).join(close + close)}${close}`;

const escapeString = (s) => `'${s.replace(/'/g, "''")}'`;

export const DIALECTS = {
	postgres: {
		label: "PostgreSQL",
		quote: quoteWith('"'),
		types: {
			integer: "INTEGER",
			bigint: "BIGINT",
			float: "DOUBLE PRECISION",
			decimal: "NUMERIC(18, 4)",
			boolean: "BOOLEAN",
			date: "DATE",
			datetime: "TIMESTAMP",
			string: (length) => `VARCHAR(${length})`,
			text: "TEXT",
			json: "JSONB",
		},
		boolean: (v) => (v ? "TRUE" : "FALSE"),
		string: escapeString,
		tableSuffix: "",
	},
	mysql: {
		label: "MySQL / MariaDB",
		quote: quoteWith("`"),
		types: {
			integer: "INT",
			bigint: "BIGINT",
			float: "DOUBLE",
			decimal: "DECIMAL(18, 4)",
			boolean: "BOOLEAN",
			date: "DATE",
			datetime: "DATETIME",
			string: (length) => `VARCHAR(${length})`,
			text: "TEXT",
			json: "JSON",
		},
		boolean: (v) => (v ? "TRUE" : "FALSE"),
		// MySQL also treats the backslash as an escape character
		string: (s) => escapeString(s.replace(/\\/g, "\\\\")),
		tableSuffix: " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
	},
	sqlite: {
		label: "SQLite",
		quote: quoteWith('"'),
		types: {
			integer: "INTEGER",
			bigint: "INTEGER",
			float: "REAL",
			decimal: "NUMERIC",
			boolean: "INTEGER",
			date: "TEXT",
			datetime: "TEXT",
			string: () => "TEXT",
			text: "TEXT",
			json: "TEXT",
		},
		boolean: (v) => (v ? "1" : "0"),
		string: escapeString,
		tableSuffix: "",
	},
	sqlserver: {
		label: "SQL Server",
		quote: quoteWith("[", "]"),
		types: {
			integer: "INT",
			bigint: "BIGINT",
			float: "FLOAT",
			decimal: "DECIMAL(18, 4)",
			boolean: "BIT",
			date: "DATE",
			datetime: "DATETIME2",
			string: (length) => `NVARCHAR(${length})`,
			text: "NVARCHAR(MAX)",
			json: "NVARCHAR(MAX)",
		},
		boolean: (v) => (v ? "1" : "0"),
		string: (s) => `N${escapeString(s)}`,
		tableSuffix: "",
	},
};

export function columnSqlType(column, dialect) {
	const type = DIALECTS[dialect].types[column.type] ?? DIALECTS[dialect].types.text;
	return typeof type === "function" ? type(column.length ?? 255) : type;
}

/** Tables ordered so that a referenced table is created before the tables referencing it. */
export function sortTablesByDependencies(schema) {
	const byId = new Map(schema.tables.map((t) => [t.id, t]));
	const sorted = [];
	const state = new Map(); // id -> "visiting" | "done"

	const visit = (table) => {
		if (state.get(table.id)) return; // done, or a cycle: keep the current order
		state.set(table.id, "visiting");
		for (const col of table.columns) {
			const target = col.fk && byId.get(col.fk.tableId);
			if (target && target !== table) visit(target);
		}
		state.set(table.id, "done");
		sorted.push(table);
	};
	schema.tables.forEach(visit);
	return sorted;
}

export function generateCreateTables(schema, dialect = "postgres") {
	const d = DIALECTS[dialect];
	const q = d.quote;
	const nameOf = new Map(schema.tables.map((t) => [t.id, t.name]));

	return sortTablesByDependencies(schema)
		.map((table) => {
			const lines = table.columns.map(
				(c) =>
					`  ${q(c.name)} ${columnSqlType(c, dialect)}${
						c.nullable && !c.pk ? "" : " NOT NULL"
					}${c.unique && !c.pk ? " UNIQUE" : ""}`
			);
			const pk = table.columns.filter((c) => c.pk);
			if (pk.length > 0) {
				lines.push(`  PRIMARY KEY (${pk.map((c) => q(c.name)).join(", ")})`);
			}
			for (const c of table.columns) {
				if (c.fk && nameOf.has(c.fk.tableId)) {
					lines.push(
						`  FOREIGN KEY (${q(c.name)}) REFERENCES ${q(
							nameOf.get(c.fk.tableId)
						)} (${q(c.fk.column)})`
					);
				}
			}
			return `CREATE TABLE ${q(table.name)} (\n${lines.join(",\n")}\n)${
				d.tableSuffix
			};`;
		})
		.join("\n\n");
}

export function sqlLiteral(value, dialect = "postgres") {
	const d = DIALECTS[dialect];
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "boolean") return d.boolean(value);
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
	if (typeof value === "object") return d.string(JSON.stringify(value));
	return d.string(String(value));
}

export function generateInserts(schema, dialect = "postgres", { batchSize = 100 } = {}) {
	const q = DIALECTS[dialect].quote;
	const statements = [];

	for (const table of sortTablesByDependencies(schema)) {
		const rows = table.rows ?? [];
		if (rows.length === 0) continue;
		const columns = table.columns.map((c) => c.name);
		const header = `INSERT INTO ${q(table.name)} (${columns.map(q).join(", ")}) VALUES`;

		for (let i = 0; i < rows.length; i += batchSize) {
			const values = rows
				.slice(i, i + batchSize)
				.map((row) => `  (${columns.map((c) => sqlLiteral(row[c], dialect)).join(", ")})`);
			statements.push(`${header}\n${values.join(",\n")};`);
		}
	}
	return statements.join("\n\n");
}

export function generateSql(schema, { dialect = "postgres", includeData = true } = {}) {
	const parts = [
		`-- Generated for ${DIALECTS[dialect].label}`,
		generateCreateTables(schema, dialect),
	];
	if (includeData) {
		const inserts = generateInserts(schema, dialect);
		if (inserts) parts.push(inserts);
	}
	return parts.join("\n\n") + "\n";
}

const mermaidName = (name) =>
	String(name).replace(/[^A-Za-z0-9_-]+/g, "_") || "_";

export function generateMermaid(schema) {
	const nameOf = new Map(schema.tables.map((t) => [t.id, mermaidName(t.name)]));
	const lines = ["erDiagram"];

	for (const rel of schemaRelations(schema)) {
		const arrow = rel.cardinality === "1:1" ? "||--||" : "||--o{";
		lines.push(
			`    ${nameOf.get(rel.to.tableId)} ${arrow} ${nameOf.get(rel.from.tableId)} : "${rel.from.column}"`
		);
	}
	for (const table of schema.tables) {
		lines.push(`    ${nameOf.get(table.id)} {`);
		for (const c of table.columns) {
			const keys = [c.pk && "PK", c.fk && "FK"].filter(Boolean).join(", ");
			lines.push(`        ${c.type} ${mermaidName(c.name)}${keys ? ` ${keys}` : ""}`);
		}
		lines.push("    }");
	}
	return lines.join("\n") + "\n";
}

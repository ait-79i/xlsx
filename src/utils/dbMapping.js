// Mapping JSON onto database tables (or collections, or indexes).
//
// mapping = {
//   tables: [{
//     id, name,
//     rowsFrom: "" | "lines" | "customer.orders"   // one row per item, or per element of that list
//     columns: [{ id, name, type, key, source }]
//   }]
// }
// column.type is a generic type (see schemaInference COLUMN_TYPES).
// column.source says where the value comes from, for each row:
//   { kind: "field", path }   a value of the row (path "" = the element itself, for lists of values)
//   { kind: "parent", path }  a value of the object holding the list (to link a row to its parent)
//   { kind: "root", path }    a value of the top level item
//   { kind: "index" }         position in its list, from 1
//   { kind: "row" }           running number in the table, from 1 (a surrogate key)
//   { kind: "parentRow" }     running number of the parent row (links to a parent's surrogate key)
//   { kind: "const", value }  the same value on every row
//   { kind: "none" }          always empty (NULL)
import { isPlainObject } from "./jsonGraph";
import { COLUMN_TYPES, inferValueType, mergeTypes, sanitizeName } from "./schemaInference";
import { convertValue } from "./converter";

export { COLUMN_TYPES };
export const SOURCE_KINDS = ["field", "parent", "root", "index", "row", "parentRow", "const", "none"];

const SAMPLE = 500;
let counter = 0;
const uid = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export const splitPath = (path) => (path ? String(path).split(".") : []);

export function getPath(value, path) {
	let v = value;
	for (const key of splitPath(path)) {
		if (!isPlainObject(v)) return undefined;
		v = v[key];
	}
	return v;
}

/** "first_name", "firstName", "First Name" -> "firstname" (to match names loosely) */
export const looseName = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();

// ------------------------------------------------------------------ rows

/**
 * The rows of a table: one per item, or one per element of the list at `rowsFrom`.
 * Each row knows its element (value), the top level item (root), the row holding its list (parent),
 * its position in that list (index) and its running number (row).
 * Objects on the way are walked through: "customer.orders" lists the orders of each item's customer.
 */
export function expandRows(items, rowsFrom) {
	let level = items.map((item, i) => ({ value: item, base: item, root: item, parent: null, index: i + 1, row: i + 1 }));
	for (const segment of splitPath(rowsFrom)) {
		const next = [];
		let row = 0;
		for (const ctx of level) {
			const v = isPlainObject(ctx.value) ? ctx.value[segment] : undefined;
			if (Array.isArray(v)) {
				v.forEach((element, j) => next.push({ value: element, base: element, root: ctx.root, parent: ctx, index: j + 1, row: ++row }));
			} else if (v !== undefined && v !== null) {
				next.push({ ...ctx, value: v });
			}
		}
		level = next;
	}
	return level;
}

/** Lists in the data that can give rows, as paths from the top level item: ["lines", "lines.taxes"]. */
export function listPaths(items) {
	const found = new Set();
	const visit = (value, prefix, depth) => {
		if (depth > 6 || !isPlainObject(value)) return;
		for (const [key, v] of Object.entries(value)) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (Array.isArray(v)) {
				found.add(path);
				v.slice(0, 50).forEach((e) => visit(e, path, depth + 1));
			} else if (isPlainObject(v)) {
				visit(v, path, depth + 1);
			}
		}
	};
	items.slice(0, SAMPLE).forEach((item) => visit(item, "", 0));
	return [...found].sort();
}

/** Values that a column can read in the rows of `rowsFrom`: paths of the elements (objects are walked into). */
export function fieldPaths(items, rowsFrom) {
	const paths = new Map(); // path -> generic type
	const add = (path, v) => paths.set(path, mergeTypes(paths.get(path), inferValueType(v)));
	const visit = (value, prefix) => {
		if (isPlainObject(value)) {
			for (const [key, v] of Object.entries(value)) {
				const path = prefix ? `${prefix}.${key}` : key;
				if (isPlainObject(v)) {
					add(path, v);
					visit(v, path);
				} else add(path, v);
			}
		} else if (!prefix) add("", value);
	};
	expandRows(items.slice(0, SAMPLE), rowsFrom).forEach((ctx) => visit(ctx.value, ""));
	return [...paths].map(([path, type]) => ({ path, type: type ?? "string" }));
}

// value types of the columns, applied to every value
const CONVERSIONS = { integer: "integer", bigint: "integer", float: "number", decimal: "number", boolean: "boolean", date: "date", string: "text", text: "text" };

/** A value converted for a column; ok is false when it could not be (it becomes null). */
export function columnValue(raw, type) {
	if (raw === undefined || raw === null) return { value: null, ok: true };
	if (type === "json") return { value: raw, ok: true };
	if (type === "datetime") {
		if (raw instanceof Date) return { value: raw.toISOString(), ok: true };
		return typeof raw === "string" || typeof raw === "number" ? { value: raw, ok: true } : { value: null, ok: false };
	}
	const as = CONVERSIONS[type];
	if (!as) return { value: raw, ok: true };
	return convertValue(raw, as);
}

const readSource = (ctx, source = { kind: "none" }) => {
	switch (source.kind) {
		case "field": return getPath(ctx.value, source.path);
		case "parent": return ctx.parent ? getPath(ctx.parent.base, source.path) : undefined;
		case "root": return getPath(ctx.root, source.path);
		case "index": return ctx.index;
		case "row": return ctx.row;
		case "parentRow": return ctx.parent?.row;
		case "const": return source.value === "" ? null : source.value;
		default: return null;
	}
};

/**
 * Every table with its rows of values (in column order), and the values that could not be converted.
 * @returns {{ table, rows: any[][], issues: Map<string, number> }[]}
 */
export function buildTables(items, mapping) {
	return mapping.tables.map((table) => {
		const issues = new Map();
		const rows = expandRows(items, table.rowsFrom).map((ctx) =>
			table.columns.map((col) => {
				const { value, ok } = columnValue(readSource(ctx, col.source), col.type);
				if (!ok) issues.set(col.name, (issues.get(col.name) ?? 0) + 1);
				return value;
			})
		);
		return { table, rows, issues };
	});
}

// ------------------------------------------------------------------ automatic tables

const typeFor = (type, maxLength) => {
	if (!type) return "string";
	if (type === "string" && maxLength > 255) return "text";
	return type;
};

/**
 * Tables built from the data.
 * Relational targets (flatten: true): nested objects become prefixed columns (address_city), each list of
 * objects its own table linked to its parent, lists of values a JSON column.
 * Document targets (flatten: false): one collection, documents kept as they are.
 */
export function autoMapping(items, { rootName = "data", flatten = true } = {}) {
	const sample = items.slice(0, SAMPLE);
	const tables = [];
	const usedTables = new Set();
	const tableName = (base) => {
		let name = sanitizeName(base);
		for (let n = 2; usedTables.has(name); n++) name = `${sanitizeName(base)}_${n}`;
		usedTables.add(name);
		return name;
	};

	if (!flatten) {
		const types = new Map();
		sample.forEach((item) => Object.entries(item ?? {}).forEach(([k, v]) => types.set(k, mergeTypes(types.get(k), inferValueType(v)))));
		const columns = [...types].map(([key, type]) => ({
			id: uid("c"), name: key, type: type ?? "string", key: key === "_id" || key === "id", source: { kind: "field", path: key },
		}));
		return { tables: [{ id: uid("t"), name: tableName(rootName), rowsFrom: "", columns }] };
	}

	// rowsFrom: list path from the top; parent: { name, keyPath | null } of the table holding the list
	const addTable = (name, rowsFrom, elements, parent) => {
		const stats = new Map(); // path -> { type, max }
		const lists = new Map(); // path -> elements
		const visit = (value, prefix) => {
			for (const [key, v] of Object.entries(value)) {
				const path = prefix ? `${prefix}.${key}` : key;
				if (isPlainObject(v)) visit(v, path);
				else if (Array.isArray(v) && v.some(isPlainObject)) {
					if (!lists.has(path)) lists.set(path, []);
					lists.get(path).push(...v.filter(isPlainObject));
				} else {
					const s = stats.get(path) ?? { type: null, max: 0 };
					s.type = mergeTypes(s.type, Array.isArray(v) ? "json" : inferValueType(v));
					if (typeof v === "string") s.max = Math.max(s.max, v.length);
					stats.set(path, s);
				}
			}
		};
		const primitives = elements.filter((e) => !isPlainObject(e));
		elements.filter(isPlainObject).forEach((e) => visit(e, ""));

		const usedCols = new Set();
		const colName = (base) => {
			let n = sanitizeName(base);
			for (let i = 2; usedCols.has(n); i++) n = `${sanitizeName(base)}_${i}`;
			usedCols.add(n);
			return n;
		};
		const columns = [];
		const hasId = stats.has("id") && ["integer", "bigint", "string"].includes(stats.get("id").type);
		if (!hasId) columns.push({ id: uid("c"), name: colName("id"), type: "integer", key: true, source: { kind: "row" } });
		if (parent) {
			columns.push({
				id: uid("c"),
				name: colName(`${parent.name}_id`),
				type: parent.keyType,
				key: false,
				// the parent row is the element holding the list (objects on the way are walked through)
				source: parent.keyPath ? { kind: "parent", path: parent.keyPath } : { kind: "parentRow" },
			});
		}
		if (primitives.length) {
			let type = null;
			primitives.forEach((v) => { type = mergeTypes(type, inferValueType(v)) });
			columns.push({ id: uid("c"), name: colName("value"), type: type ?? "string", key: false, source: { kind: "field", path: "" } });
		}
		for (const [path, s] of stats) {
			columns.push({ id: uid("c"), name: colName(path.replace(/\./g, "_")), type: typeFor(s.type, s.max), key: path === "id", source: { kind: "field", path } });
		}
		const table = { id: uid("t"), name, rowsFrom, columns };
		tables.push(table);

		const keyCol = columns.find((c) => c.key);
		const me = {
			name,
			rowsFrom,
			keyType: keyCol?.type === "string" ? "string" : "integer",
			// the parent key read from the element itself only works when it is a field of the element
			keyPath: keyCol?.source.kind === "field" ? keyCol.source.path : null,
		};
		for (const [path, children] of lists) {
			const childFrom = rowsFrom ? `${rowsFrom}.${path}` : path;
			addTable(tableName(`${name}_${path.split(".").pop()}`), childFrom, children, me);
		}
	};

	addTable(tableName(rootName), "", sample, null);
	return { tables };
}

// ------------------------------------------------------------------ your own tables

const singular = (s) => s.replace(/ies$/, "y").replace(/s$/, "");

/**
 * Tables from CREATE TABLE statements (parseSqlSchema), with each column matched to the data by name.
 * A table whose name matches a list of the data reads its rows from that list.
 */
export function mappingFromSchema(schema, items) {
	const lists = listPaths(items);
	const matched = schema.tables.map((t) => {
		const name = looseName(t.name);
		const rowsFrom = lists.find((p) => {
			const last = looseName(p.split(".").pop());
			return last === name || singular(last) === singular(name) || name.endsWith(last) || name.endsWith(singular(last));
		}) ?? "";
		const fields = fieldPaths(items, rowsFrom);
		const columns = t.columns.map((c) => {
			const loose = looseName(c.name);
			const field = fields.find((f) => looseName(f.path) === loose)
				?? fields.find((f) => looseName(f.path.split(".").pop()) === loose)
				// a key named order_id or orderId is the "id" of the row
				?? (c.pk && loose.endsWith("id") ? fields.find((f) => f.path === "id") : undefined);
			let source = { kind: "none" };
			if (field && !(c.fk && rowsFrom)) source = { kind: "field", path: field.path };
			else if (!c.fk && c.pk && ["integer", "bigint"].includes(c.type)) source = { kind: "row" };
			return { id: uid("c"), name: c.name, type: c.type ?? "string", key: !!c.pk, source, fk: c.fk };
		});
		return { id: uid("t"), schemaId: t.id, name: t.name, rowsFrom, columns };
	});

	// second pass: a foreign key of a nested table reads what fills the referenced column of its parent
	const bySchemaId = new Map(matched.map((t) => [t.schemaId, t]));
	for (const table of matched) {
		for (const col of table.columns) {
			if (!col.fk || !table.rowsFrom) continue;
			const target = bySchemaId.get(col.fk.tableId);
			const ref = target?.columns.find((c) => c.name === col.fk.column) ?? target?.columns.find((c) => c.key);
			if (ref?.source.kind === "field") col.source = { kind: "parent", path: ref.source.path };
			else if (ref?.source.kind === "row") col.source = { kind: "parentRow" };
		}
	}
	return {
		tables: matched.map(({ schemaId, columns, ...t }) => ({ ...t, columns: columns.map(({ fk, ...c }) => c) })),
	};
}

/** Tables in an order where a table comes after the table holding its list. */
export const orderedTables = (mapping) =>
	[...mapping.tables].sort((a, b) => splitPath(a.rowsFrom).length - splitPath(b.rowsFrom).length);

export const newTable = (name = "new_table") => ({ id: uid("t"), name, rowsFrom: "", columns: [] });
export const newColumn = (name = "column") => ({ id: uid("c"), name, type: "string", key: false, source: { kind: "none" } });

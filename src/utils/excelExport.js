import * as XLSX from "xlsx";
import { isPlainObject } from "./jsonGraph";

/** { a: { b: 1 }, tags: ["x", "y"] } -> { "a.b": 1, tags: "x, y" } */
export function flattenObject(obj, prefix = "", out = {}) {
	for (const [key, value] of Object.entries(obj)) {
		const name = prefix ? `${prefix}.${key}` : key;
		if (isPlainObject(value)) {
			flattenObject(value, name, out);
		} else if (Array.isArray(value)) {
			out[name] = value.every((v) => v === null || typeof v !== "object")
				? value.join(", ")
				: JSON.stringify(value);
		} else {
			out[name] = value;
		}
	}
	return out;
}

export function jsonToRows(data) {
	const items = Array.isArray(data) ? data : [data];
	return items.map((item) => (isPlainObject(item) ? flattenObject(item) : { value: item }));
}

// Excel sheet names: max 31 chars, no []:*?/\ and unique
const sheetName = (name, used) => {
	const base = String(name).replace(/[[\]:*?/\\]/g, "_").slice(0, 31) || "sheet";
	let result = base;
	let i = 2;
	while (used.has(result.toLowerCase())) {
		const suffix = `_${i++}`;
		result = base.slice(0, 31 - suffix.length) + suffix;
	}
	used.add(result.toLowerCase());
	return result;
};

/** One sheet, nested objects flattened into "parent.child" columns. */
export function downloadJsonAsExcel(data, fileName = "data.xlsx") {
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(jsonToRows(data)), "data");
	XLSX.writeFile(workbook, fileName);
}

/** One sheet per table of the schema, with its rows. */
export function downloadSchemaAsExcel(schema, fileName = "tables.xlsx") {
	const workbook = XLSX.utils.book_new();
	const used = new Set();
	for (const table of schema.tables) {
		const header = table.columns.map((c) => c.name);
		const sheet = XLSX.utils.json_to_sheet(table.rows ?? [], { header });
		XLSX.utils.book_append_sheet(workbook, sheet, sheetName(table.name, used));
	}
	XLSX.writeFile(workbook, fileName);
}

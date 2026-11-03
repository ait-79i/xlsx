// Output formats shared by the converter and the JSON structure page
import * as XLSX from "xlsx";
import { jsonToRows } from "./excelExport";

/**
 * The JSON to deliver: the list itself, or the list under a key ({ "customers": [...] }).
 * @param {{ root: "array"|"object", rootKey: string }} output
 */
export function wrapOutput(items, output = {}) {
	if (output.root === "object" && String(output.rootKey ?? "").trim()) {
		return { [output.rootKey.trim()]: items };
	}
	return items;
}

/** One JSON object per line (JSON Lines / NDJSON), as bulk APIs and log tools expect. */
export const toJsonLines = (items) => items.map((item) => JSON.stringify(item)).join("\n") + (items.length ? "\n" : "");

/** CSV with nested keys flattened into "parent.child" columns. */
export function toCsv(items) {
	const rows = jsonToRows(items);
	const header = [...new Set(rows.flatMap((r) => Object.keys(r)))];
	return XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows, { header }));
}

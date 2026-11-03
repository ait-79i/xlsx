// Excel to JSON converter: reading a workbook and turning its rows into JSON through a "shape".
//
// The shape is a tree describing the output object, built from the sheet columns:
//   { id, kind: "field", source: <column index>, key, include }
//   { id, kind: "group", key, children: [...] }
//   { id, kind: "concat", key, include, separator, skipEmpty, parts: [field, ...] }
//     one text value joining the values of its parts, in order
// The rows themselves are never modified: renaming, grouping or excluding only edits the shape,
// so every change can be undone and the original sheet stays visible.
import * as XLSX from "xlsx";

export const EXCEL_EXTENSIONS = [".xlsx", ".xlsm", ".xlsb", ".xls", ".xlam", ".csv", ".ods"];

export const isSpreadsheetFile = (name = "") =>
	EXCEL_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

const pad = (n) => String(n).padStart(2, "0");

// Dates without a time become "2024-03-01", others an ISO-like local timestamp
export const formatDate = (d) => {
	const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return date;
	return `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const cellValue = (v) => {
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : formatDate(v);
	if (typeof v === "string" && v.trim() === "") return null;
	return v ?? null;
};

/** Header cells -> unique, non empty column names ("Column C" for a blank header). */
export function columnNames(headerRow, letters) {
	const used = new Map();
	return letters.map((letter, i) => {
		const raw = headerRow[i];
		let name = raw === null || raw === undefined || String(raw).trim() === ""
			? `Column ${letter}`
			: String(raw instanceof Date ? formatDate(raw) : raw).trim();
		const seen = used.get(name) ?? 0;
		used.set(name, seen + 1);
		if (seen > 0) {
			let n = seen + 1;
			while (used.has(`${name}_${n}`)) n++;
			name = `${name}_${n}`;
			used.set(name, 1);
		}
		return name;
	});
}

/**
 * One worksheet -> { name, letters, matrix, headerRow }: every non blank row, cells already cleaned.
 * The headers are in matrix[headerRow] (the first row unless the user picks another one).
 */
export function readSheet(ws, name) {
	const ref = ws?.["!ref"];
	if (!ref) return { name, letters: [], matrix: [], headerRow: 0 };
	const range = XLSX.utils.decode_range(ref);
	const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false, raw: true });
	if (raw.length === 0) return { name, letters: [], matrix: [], headerRow: 0 };

	const width = Math.max(...raw.map((r) => r.length));
	const letters = Array.from({ length: width }, (_, i) => XLSX.utils.encode_col(range.s.c + i));
	const matrix = raw
		.map((r) => letters.map((_, i) => cellValue(r[i])))
		.filter((r) => r.some((v) => v !== null));
	return { name, letters, matrix, headerRow: guessHeaderRow(matrix) };
}

const isLabel = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Row that most likely holds the headers: the first of the first 10 rows where most cells are text,
 * which skips titles and notes written above a table. 0 when nothing looks better.
 */
export function guessHeaderRow(matrix) {
	if (matrix.length < 2) return 0;
	const width = Math.max(...matrix.map((r) => r.filter((v) => v !== null).length));
	if (width < 2) return 0;
	const limit = Math.min(10, matrix.length - 1);
	for (let i = 0; i < limit; i++) {
		const labels = matrix[i].filter(isLabel).length;
		if (labels >= 2 && labels >= Math.ceil(width * 0.6)) return i;
	}
	return 0;
}

/** Row whose cells match the most of the given column names (for a saved structure), or null. */
export function matchHeaderRow(sheet, names) {
	if (!sheet.matrix) return null;
	const wanted = new Set(names);
	let best = null;
	let bestScore = 0;
	sheet.matrix.slice(0, 20).forEach((row, i) => {
		const score = columnNames(row, sheet.letters).filter((n) => wanted.has(n)).length;
		if (score > bestScore) {
			best = i;
			bestScore = score;
		}
	});
	return best;
}

/** Column names referenced by a saved structure. */
export function mappingColumns(data) {
	const names = [];
	const visit = (node) => {
		if (node.kind === "group") node.children.forEach(visit);
		else if (node.kind === "concat") node.parts.forEach(visit);
		else if (node.column !== undefined) names.push(node.column);
	};
	data.shape.forEach(visit);
	return names;
}

/** Stored sheet -> { name, columns: [{ name, letter }], rows, headerRow, rowCount } using its header row. */
export function sheetView(sheet) {
	// sheets stored before the header row could be chosen
	if (!sheet.matrix) return { ...sheet, headerRow: 0, rowCount: sheet.rows.length };
	const { name, letters, matrix, headerRow = 0 } = sheet;
	if (matrix.length === 0) return { name, columns: [], rows: [], headerRow: 0, rowCount: 0 };
	const header = Math.min(headerRow, matrix.length - 1);
	const names = columnNames(matrix[header], letters);
	return {
		name,
		headerRow: header,
		columns: names.map((n, i) => ({ name: n, letter: letters[i] })),
		rows: matrix.slice(header + 1),
		rowCount: matrix.length - header - 1,
	};
}

/** ArrayBuffer of an Excel / CSV / ODS file -> every sheet of the workbook. */
export function readWorkbook(buffer) {
	const wb = XLSX.read(buffer, { type: "array", cellDates: true });
	return wb.SheetNames.map((name) => readSheet(wb.Sheets[name], name));
}

// ------------------------------------------------------------------ shape

let counter = 0;
export const newId = (prefix = "n") => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** The default shape: one key per column, in the sheet order. */
export const initialShape = (columns) =>
	columns.map((c, i) => ({ id: `c${i}`, kind: "field", source: i, key: c.name, include: true, type: "auto" }));

/** Calls fn(node, parentId, index, siblings) for every node, depth first. */
export function walk(nodes, fn, parentId = null) {
	nodes.forEach((node, index) => {
		fn(node, parentId, index, nodes);
		if (node.kind === "group") walk(node.children, fn, node.id);
	});
}

export function findNode(nodes, id) {
	let found = null;
	walk(nodes, (node, parentId, index, siblings) => {
		if (node.id === id) found = { node, parentId, index, siblings };
	});
	return found;
}

/** Path of keys from the root to a node, e.g. ["address", "city"]. */
export function nodePath(nodes, id, prefix = []) {
	for (const node of nodes) {
		if (node.id === id) return [...prefix, node.key];
		if (node.kind === "group") {
			const path = nodePath(node.children, id, [...prefix, node.key]);
			if (path) return path;
		}
	}
	return null;
}

/** column index -> { id, path, include } of the field built from it */
export function fieldsBySource(nodes) {
	const map = new Map();
	const visit = (list, prefix, parentIncluded) => {
		for (const node of list) {
			const path = [...prefix, node.key];
			if (node.kind === "group") visit(node.children, path, parentIncluded);
			else if (node.kind === "concat") {
				for (const part of node.parts) map.set(part.source, { id: node.id, path, include: parentIncluded && node.include, concat: true });
			} else map.set(node.source, { id: node.id, path, include: parentIncluded && node.include });
		}
	};
	visit(nodes, [], true);
	return map;
}

// Returns a copy of the tree where the children of `parentId` (null = top level) are replaced
const mapChildren = (nodes, parentId, fn) => {
	if (parentId === null) return fn(nodes);
	return nodes.map((node) => {
		if (node.kind !== "group") return node;
		if (node.id === parentId) return { ...node, children: fn(node.children) };
		return { ...node, children: mapChildren(node.children, parentId, fn) };
	});
};

const updateNode = (nodes, id, patch) =>
	nodes.map((node) => {
		if (node.id === id) return { ...node, ...patch };
		if (node.kind === "group") return { ...node, children: updateNode(node.children, id, patch) };
		return node;
	});

/** Error code for a key, or null when it can be used next to `siblings` (ignoring `selfId`). */
export function keyError(key, siblings, selfIds = []) {
	const k = String(key ?? "").trim();
	if (!k) return "emptyKey";
	if (siblings.some((s) => !selfIds.includes(s.id) && s.key === k)) return "keyTaken";
	return null;
}

const fail = (error) => ({ error });
const ok = (nodes) => ({ nodes });

export function renameNode(nodes, id, key) {
	const found = findNode(nodes, id);
	if (!found) return fail("notFound");
	const error = keyError(key, found.siblings, [id]);
	if (error) return fail(error);
	return ok(updateNode(nodes, id, { key: String(key).trim() }));
}

export function setIncluded(nodes, ids, include) {
	let next = nodes;
	for (const id of ids) {
		const found = findNode(next, id);
		if (found && found.node.kind !== "group") next = updateNode(next, id, { include });
	}
	return next;
}

/**
 * Moves the selected nodes into a new group, created where the first of them stood.
 * They must share the same parent.
 */
export function groupNodes(nodes, ids, key) {
	if (ids.length === 0) return fail("selectColumn");
	const found = ids.map((id) => findNode(nodes, id));
	if (found.some((f) => !f)) return fail("notFound");
	const parentId = found[0].parentId;
	if (found.some((f) => f.parentId !== parentId)) return fail("sameLevel");
	const siblings = found[0].siblings;
	const error = keyError(key, siblings, ids);
	if (error) return fail(error);

	const group = {
		id: newId("g"),
		kind: "group",
		key: String(key).trim(),
		children: siblings.filter((s) => ids.includes(s.id)),
	};
	const first = Math.min(...found.map((f) => f.index));
	return ok(
		mapChildren(nodes, parentId, (list) => {
			const rest = [];
			list.forEach((node, i) => {
				if (i === first) rest.push(group);
				if (!ids.includes(node.id)) rest.push(node);
			});
			return rest;
		})
	);
}

/** Replaces a group by its children. */
export function ungroupNode(nodes, id) {
	const found = findNode(nodes, id);
	if (!found || found.node.kind !== "group") return fail("notFound");
	const others = found.siblings.filter((s) => s.id !== id);
	const clash = found.node.children.find((c) => others.some((o) => o.key === c.key));
	if (clash) return fail("keyTaken");
	return ok(
		mapChildren(nodes, found.parentId, (list) =>
			list.flatMap((node) => (node.id === id ? node.children : [node]))
		)
	);
}

/** Moves a node out of its group, right after that group. Empty groups are removed. */
export function moveOut(nodes, id) {
	const found = findNode(nodes, id);
	if (!found || found.parentId === null) return fail("notFound");
	const parent = findNode(nodes, found.parentId);
	if (parent.siblings.some((s) => s.key === found.node.key)) return fail("keyTaken");

	let next = mapChildren(nodes, found.parentId, (list) => list.filter((n) => n.id !== id));
	const emptied = findNode(next, found.parentId).node.children.length === 0;
	next = mapChildren(next, parent.parentId, (list) =>
		list.flatMap((n) => {
			if (n.id !== found.parentId) return [n];
			return emptied ? [found.node] : [n, found.node];
		})
	);
	return ok(next);
}

/** Moves a node one place up (-1) or down (+1) among its siblings. */
export function moveNode(nodes, id, step) {
	const found = findNode(nodes, id);
	if (!found) return fail("notFound");
	const target = found.index + step;
	if (target < 0 || target >= found.siblings.length) return ok(nodes);
	return ok(
		mapChildren(nodes, found.parentId, (list) => {
			const copy = [...list];
			[copy[found.index], copy[target]] = [copy[target], copy[found.index]];
			return copy;
		})
	);
}

// ------------------------------------------------------------------ output

/**
 * Builds one JSON object per row.
 * @param {"null"|"omit"|"empty"} options.emptyCells what an empty cell becomes
 */
export function buildJson(rows, shape, { emptyCells = "null" } = {}) {
	const build = (row, list) => {
		const obj = {};
		for (const node of list) {
			if (node.kind === "group") {
				const child = build(row, node.children);
				// a group whose fields are all excluded is left out
				if (includedCount(node.children) === 0) continue;
				if (Object.keys(child).length > 0 || emptyCells !== "omit") obj[node.key] = child;
				continue;
			}
			if (!node.include) continue;
			const value = node.kind === "concat"
				? concatValues(node.parts.map((p) => row[p.source]), node)
				: convertValue(row[node.source] ?? null, node.type).value;
			if (value === null) {
				if (emptyCells === "omit") continue;
				obj[node.key] = emptyCells === "empty" ? "" : null;
			} else {
				obj[node.key] = value;
			}
		}
		return obj;
	};
	return rows.map((row) => build(row, shape));
}

/** Number of fields that end up in the output. */
export const includedCount = (shape) => {
	let n = 0;
	walk(shape, (node) => {
		if (node.kind !== "group" && node.include) n++;
	});
	return n;
};

// ------------------------------------------------------------------ concatenation

export const SEPARATORS = [" ", ", ", " - ", "/", "_", ""];

const isEmpty = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

const asText = (v) => {
	if (Array.isArray(v)) return v.every((x) => x === null || typeof x !== "object") ? v.join(", ") : JSON.stringify(v);
	if (v !== null && typeof v === "object") return JSON.stringify(v);
	return String(v);
};

/** Values -> one text, or null when there is nothing to join. */
export function concatValues(values, { separator = " ", skipEmpty = true } = {}) {
	const kept = skipEmpty ? values.filter((v) => !isEmpty(v)) : values;
	if (kept.length === 0 || kept.every(isEmpty)) return null;
	return kept.map((v) => (isEmpty(v) ? "" : asText(v))).join(separator);
}

/** Default key of a combination: firstName + lastName -> "firstName_lastName" */
export const suggestConcatKey = (keys) => keys.join("_");

/**
 * Replaces the selected fields (same level) by one combined key, where the first of them stood.
 * `ids` is the order of the parts in the joined text.
 */
export function concatNodes(nodes, ids, { key, separator = " ", skipEmpty = true }) {
	if (ids.length < 2) return fail("concatTwo");
	const found = ids.map((id) => findNode(nodes, id));
	if (found.some((f) => !f)) return fail("notFound");
	if (found.some((f) => f.node.kind !== "field")) return fail("concatFields");
	const parentId = found[0].parentId;
	if (found.some((f) => f.parentId !== parentId)) return fail("sameLevel");
	const error = keyError(key, found[0].siblings, ids);
	if (error) return fail(error);

	const concat = {
		id: newId("k"),
		kind: "concat",
		key: String(key).trim(),
		include: true,
		separator,
		skipEmpty,
		parts: found.map((f) => f.node),
	};
	const first = Math.min(...found.map((f) => f.index));
	return ok(
		mapChildren(nodes, parentId, (list) => {
			const rest = [];
			list.forEach((node, i) => {
				if (i === first) rest.push(concat);
				if (!ids.includes(node.id)) rest.push(node);
			});
			return rest;
		})
	);
}

/** Changes the key, the separator, the option or the order of the parts of a combined key. */
export function updateConcat(nodes, id, { key, separator, skipEmpty, order }) {
	const found = findNode(nodes, id);
	if (!found || found.node.kind !== "concat") return fail("notFound");
	const patch = {};
	if (key !== undefined) {
		const error = keyError(key, found.siblings, [id]);
		if (error) return fail(error);
		patch.key = String(key).trim();
	}
	if (separator !== undefined) patch.separator = separator;
	if (skipEmpty !== undefined) patch.skipEmpty = skipEmpty;
	if (order) {
		const byId = new Map(found.node.parts.map((p) => [p.id, p]));
		if (order.length !== byId.size || order.some((pid) => !byId.has(pid))) return fail("notFound");
		patch.parts = order.map((pid) => byId.get(pid));
	}
	return ok(updateNode(nodes, id, patch));
}

/** Puts the parts of a combined key back as separate keys. */
export function splitConcat(nodes, id) {
	const found = findNode(nodes, id);
	if (!found || found.node.kind !== "concat") return fail("notFound");
	const others = found.siblings.filter((s) => s.id !== id);
	if (found.node.parts.some((p) => others.some((o) => o.key === p.key))) return fail("keyTaken");
	return ok(
		mapChildren(nodes, found.parentId, (list) =>
			list.flatMap((node) => (node.id === id ? node.parts : [node]))
		)
	);
}

// ------------------------------------------------------------------ value types

// "auto" keeps the value as read from the sheet (numbers stay numbers, text stays text)
export const VALUE_TYPES = ["auto", "text", "number", "integer", "boolean", "date"];

const TRUE_WORDS = ["true", "yes", "y", "oui", "o", "vrai", "1", "x", "on"];
const FALSE_WORDS = ["false", "no", "n", "non", "faux", "0", "off"];

const toNumber = (v) => {
	if (typeof v === "number") return v;
	if (typeof v === "boolean") return v ? 1 : 0;
	let text = String(v).trim().replace(/[\s  ]/g, "");
	// 1.234,56 or 1234,56: comma as the decimal mark
	if (/^-?[\d.]*,\d+$/.test(text)) text = text.replace(/\./g, "").replace(",", ".");
	// 1,234.56: comma between thousands
	else text = text.replace(/,(?=\d{3}(\D|$))/g, "");
	if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text)) return NaN;
	return Number(text);
};

// Excel stores dates as days since 1899-12-30
const fromSerial = (n) => {
	const d = new Date(Math.round((n - 25569) * 86400000));
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const toDate = (v) => {
	if (typeof v === "number") return v > 0 && v < 2958466 ? fromSerial(v) : null;
	const text = String(v).trim();
	if (/^\d{4}-\d{2}-\d{2}([T ][\d:.]+Z?)?$/.test(text)) return text.slice(0, 10);
	// day first, as written in most countries: 31/12/2024, 31.12.2024, 31-12-2024
	const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text);
	if (m) {
		const [, d, mo, y] = m.map(Number);
		const year = y < 100 ? 2000 + y : y;
		if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${year}-${pad(mo)}-${pad(d)}`;
	}
	return null;
};

/**
 * Converts a cell to the chosen type.
 * @returns {{ value, ok: boolean }} ok is false when the value could not be converted (it becomes null)
 */
export function convertValue(v, type = "auto") {
	if (v === null || v === undefined || !type || type === "auto") return { value: v ?? null, ok: true };
	switch (type) {
		case "text":
			return { value: typeof v === "object" ? JSON.stringify(v) : String(v), ok: true };
		case "number":
		case "integer": {
			const n = toNumber(v);
			if (Number.isNaN(n) || (type === "integer" && !Number.isInteger(n))) return { value: null, ok: false };
			return { value: n, ok: true };
		}
		case "boolean": {
			if (typeof v === "boolean") return { value: v, ok: true };
			const word = String(v).trim().toLowerCase();
			if (TRUE_WORDS.includes(word)) return { value: true, ok: true };
			if (FALSE_WORDS.includes(word)) return { value: false, ok: true };
			return { value: null, ok: false };
		}
		case "date": {
			const d = toDate(v);
			return d ? { value: d, ok: true } : { value: null, ok: false };
		}
		default:
			return { value: v, ok: true };
	}
}

/** Sets the type of a field. */
export function setFieldType(nodes, id, type) {
	const found = findNode(nodes, id);
	if (!found || found.node.kind !== "field" || !VALUE_TYPES.includes(type)) return fail("notFound");
	return ok(updateNode(nodes, id, { type }));
}

/** Number of values each typed field could not convert, by field id. values(field) lists its values. */
export function typeIssues(values, shape) {
	const issues = new Map();
	walk(shape, (node) => {
		if (node.kind !== "field" || !node.type || node.type === "auto") return;
		let bad = 0;
		for (const v of values(node)) if (!convertValue(v, node.type).ok) bad++;
		if (bad > 0) issues.set(node.id, bad);
	});
	return issues;
}

// ------------------------------------------------------------------ saved structures

/** What is stored for a saved structure: the shape with column names instead of positions. */
export function mappingData(shape, columns, options = {}) {
	const named = (node) => {
		if (node.kind === "group") return { ...node, children: node.children.map(named) };
		if (node.kind === "concat") return { ...node, parts: node.parts.map(named) };
		return { ...node, column: columns[node.source]?.name };
	};
	return { shape: shape.map(named), options };
}

/**
 * Applies a saved structure to new columns, matching them by name.
 * Keys whose column is gone are dropped; new columns are added at the end.
 * @returns {{ nodes, missing: string[], added: string[] }}
 */
export function applyMapping(data, columns) {
	const index = new Map(columns.map((c, i) => [c.name, i]));
	const used = new Set();
	const missing = [];
	const place = (node) => {
		if (node.kind === "group") {
			const children = node.children.map(place).filter(Boolean);
			return children.length ? { ...node, id: newId("g"), children } : null;
		}
		if (node.kind === "concat") {
			const parts = node.parts.map(place).filter(Boolean);
			if (parts.length === 0) return null;
			if (parts.length === 1) return { ...parts[0], key: node.key };
			return { ...node, id: newId("k"), parts };
		}
		const source = index.get(node.column);
		if (source === undefined || used.has(source)) {
			missing.push(node.column);
			return null;
		}
		used.add(source);
		const { column, ...field } = node;
		return { ...field, id: `c${source}`, source };
	};
	const nodes = data.shape.map(place).filter(Boolean);
	const added = [];
	columns.forEach((c, i) => {
		if (used.has(i)) return;
		added.push(c.name);
		// a new column whose name is already a top level key gets a unique one
		let key = c.name;
		for (let n = 2; nodes.some((x) => x.key === key); n++) key = `${c.name}_${n}`;
		nodes.push({ id: `c${i}`, kind: "field", source: i, key, include: true, type: "auto" });
	});
	return { nodes, missing, added };
}

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

/** One worksheet -> { name, columns: [{ name, letter }], rows: [[...cells]] } (first row = headers). */
export function readSheet(ws, name) {
	const ref = ws?.["!ref"];
	if (!ref) return { name, columns: [], rows: [] };
	const range = XLSX.utils.decode_range(ref);
	const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false, raw: true });
	if (matrix.length === 0) return { name, columns: [], rows: [] };

	const width = Math.max(...matrix.map((r) => r.length));
	const letters = Array.from({ length: width }, (_, i) => XLSX.utils.encode_col(range.s.c + i));
	const names = columnNames(matrix[0], letters);
	const rows = matrix
		.slice(1)
		.map((r) => letters.map((_, i) => cellValue(r[i])))
		.filter((r) => r.some((v) => v !== null));

	return { name, columns: names.map((n, i) => ({ name: n, letter: letters[i] })), rows };
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
	columns.map((c, i) => ({ id: `c${i}`, kind: "field", source: i, key: c.name, include: true }));

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
				: row[node.source] ?? null;
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

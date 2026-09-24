// Turns any JSON value into React Flow nodes and edges.
// Every object/array becomes a node; its primitive fields are listed as rows,
// and each nested object/array row is linked by an edge to the child node.

export const JSON_NODE_WIDTH = 260;
export const JSON_NODE_HEADER_HEIGHT = 32;
export const JSON_NODE_ROW_HEIGHT = 22;

export const ROOT_ID = "$";

export const isPlainObject = (v) =>
	v !== null && typeof v === "object" && !Array.isArray(v);

const isContainer = (v) => v !== null && typeof v === "object";

export const valueType = (v) => {
	if (v === null || v === undefined) return "null";
	if (Array.isArray(v)) return "array";
	return typeof v;
};

// Node ids use a JSON Pointer like syntax so that keys containing "/" stay unique
const escapeKey = (key) => String(key).replace(/~/g, "~0").replace(/\//g, "~1");
export const childId = (parentId, key) => `${parentId}/${escapeKey(key)}`;

// Human readable path, e.g. $[0].address["zip code"]
export const childJsonPath = (parentPath, key, parentIsArray) => {
	if (parentIsArray) return `${parentPath}[${key}]`;
	return /^[A-Za-z_$][\w$]*$/.test(key)
		? `${parentPath}.${key}`
		: `${parentPath}[${JSON.stringify(key)}]`;
};

const containerSize = (v) =>
	Array.isArray(v) ? v.length : Object.keys(v).length;

/**
 * @param {*} data any JSON value
 * @param {object} options
 * @param {number} options.maxItems max array items shown per array
 * @param {Set<string>} options.collapsed ids of the nodes whose children are hidden
 * @param {number} options.maxNodes hard limit to keep the canvas usable
 * @returns {{nodes: object[], edges: object[], truncated: boolean}}
 */
export function jsonToGraph(
	data,
	{ maxItems = 10, collapsed = new Set(), maxNodes = 1500 } = {}
) {
	const nodes = [];
	const edges = [];
	let truncated = false;

	const visit = (value, id, label, jsonPath, parent) => {
		if (nodes.length >= maxNodes) {
			truncated = true;
			return false;
		}

		const rows = [];
		let hidden = 0;
		let kind;

		if (!isContainer(value)) {
			kind = "value";
			rows.push({ key: "value", type: valueType(value), value, jsonPath });
		} else {
			const isArray = Array.isArray(value);
			kind = isArray ? "array" : "object";
			const entries = isArray
				? value.slice(0, maxItems).map((v, i) => [String(i), v])
				: Object.entries(value);
			hidden = isArray ? Math.max(0, value.length - maxItems) : 0;

			for (const [key, v] of entries) {
				const path = childJsonPath(jsonPath, key, isArray);
				if (isContainer(v)) {
					rows.push({
						key,
						type: Array.isArray(v) ? "array" : "object",
						size: containerSize(v),
						childId: childId(id, key),
						collapsed: collapsed.has(childId(id, key)),
						jsonPath: path,
					});
				} else {
					rows.push({ key, type: valueType(v), value: v, jsonPath: path });
				}
			}
		}

		nodes.push({
			id,
			type: "json",
			position: { x: 0, y: 0 },
			data: {
				label,
				kind,
				size: isContainer(value) ? containerSize(value) : null,
				rows,
				hidden,
				jsonPath,
			},
		});

		if (parent) {
			edges.push({
				id: `${parent.id}->${id}`,
				source: parent.id,
				sourceHandle: parent.handle,
				target: id,
				type: "smoothstep",
			});
		}

		for (const row of rows) {
			if (row.childId && !row.collapsed) {
				const child = Array.isArray(value)
					? value[Number(row.key)]
					: value[row.key];
				const childLabel = Array.isArray(value) ? `${label}[${row.key}]` : row.key;
				visit(child, row.childId, childLabel, row.jsonPath, { id, handle: row.key });
			}
		}
		return true;
	};

	visit(data, ROOT_ID, "root", "$", null);
	return { nodes, edges, truncated };
}

/** Ids of every nested object/array (everything but the root), used by "collapse all". */
export function containerIds(data, { maxItems = 10 } = {}) {
	const ids = [];
	const walk = (value, id) => {
		if (!isContainer(value)) return;
		const entries = Array.isArray(value)
			? value.slice(0, maxItems).map((v, i) => [String(i), v])
			: Object.entries(value);
		for (const [key, v] of entries) {
			if (isContainer(v)) {
				ids.push(childId(id, key));
				walk(v, childId(id, key));
			}
		}
	};
	walk(data, ROOT_ID);
	return ids;
}

export const jsonNodeSize = (node) => ({
	width: JSON_NODE_WIDTH,
	height:
		JSON_NODE_HEADER_HEIGHT +
		(node.data.rows.length + (node.data.hidden > 0 ? 1 : 0)) *
			JSON_NODE_ROW_HEIGHT +
		2,
});

const rowMatches = (row, term) =>
	row.key.toLowerCase().includes(term) ||
	(row.value !== undefined && String(row.value).toLowerCase().includes(term));

/** Ids of the nodes whose label, keys or primitive values contain the search term. */
export function searchNodes(nodes, search) {
	const term = search.trim().toLowerCase();
	if (!term) return [];
	return nodes
		.filter(
			(n) =>
				n.data.label.toLowerCase().includes(term) ||
				n.data.rows.some((row) => rowMatches(row, term))
		)
		.map((n) => n.id);
}

export const isRowMatch = (row, search) => {
	const term = search.trim().toLowerCase();
	return term !== "" && rowMatches(row, term);
};

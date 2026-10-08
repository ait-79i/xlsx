// JSON structure: reshaping existing JSON with the same "shape" tree as the Excel converter
// (see converter.js). Here a field's `source` is the path of the value in the original items,
// e.g. ["customer", "city"], and groups are inferred from the nested objects of the input.
import { isPlainObject } from "./jsonGraph";
import { concatValues } from "./converter";

/**
 * Input JSON -> the list of objects to reshape.
 * An array of objects is used as is, a single object is wrapped (and unwrapped on output).
 * @returns {{ items: object[], single: boolean } | { error: string }}
 */
export function normalizeInput(value) {
	if (isPlainObject(value)) return { items: [value], single: true };
	if (Array.isArray(value)) {
		if (value.length === 0) return { error: "emptyArray" };
		if (!value.every(isPlainObject)) return { error: "notObjects" };
		return { items: value, single: false };
	}
	return { error: "notObjects" };
}

let counter = 0;
const id = (prefix) => `${prefix}${(counter++).toString(36)}`;

/**
 * Builds the default shape from the keys found in the items (in order of first appearance).
 * A key holding an object in every item where it is present becomes a group.
 * Only the first `sample` items are read, which is enough to find the keys of regular data.
 */
export function inferShape(items, { sample = 2000 } = {}) {
	const build = (objects, path) => {
		const order = [];
		const seen = new Map(); // key -> { objects: [], allObjects: bool }
		for (const obj of objects) {
			for (const [key, value] of Object.entries(obj)) {
				if (!seen.has(key)) {
					seen.set(key, { objects: [], allObjects: true });
					order.push(key);
				}
				const entry = seen.get(key);
				if (isPlainObject(value)) entry.objects.push(value);
				else if (value !== null && value !== undefined) entry.allObjects = false;
			}
		}
		return order.map((key) => {
			const { objects: nested, allObjects } = seen.get(key);
			const childPath = [...path, key];
			if (allObjects && nested.length > 0) {
				const children = build(nested, childPath);
				// {} everywhere: keep it as a plain value
				if (children.length > 0) return { id: id("g"), kind: "group", key, origin: childPath, children };
			}
			return { id: id("f"), kind: "field", source: childPath, key, include: true };
		});
	};
	return build(items.slice(0, sample), []);
}

export const getPath = (obj, path) => {
	let value = obj;
	for (const key of path) {
		if (!isPlainObject(value) || !(key in value)) return undefined;
		value = value[key];
	}
	return value;
};

/**
 * Applies the shape to every item.
 * @param {"omit"|"null"} options.missing what a key absent from an item becomes
 */
export function reshape(items, shape, { missing = "omit" } = {}) {
	const build = (item, list) => {
		const out = {};
		for (const node of list) {
			if (node.kind === "group") {
				const child = build(item, node.children);
				if (Object.keys(child).length > 0) out[node.key] = child;
				continue;
			}
			if (!node.include) continue;
			const value = node.kind === "concat"
				? concatValues(node.parts.map((p) => getPath(item, p.source)), node) ?? undefined
				: getPath(item, node.source);
			if (value === undefined) {
				if (missing === "null") out[node.key] = null;
			} else {
				out[node.key] = value;
			}
		}
		return out;
	};
	return items.map((item) => build(item, shape));
}

/** Original path of a field, or of the first field of a group ("customer.city"). */
export const originOf = (node) => (node.kind === "field" ? node.source : node.origin ?? null);

/** Number of items in which each field (by id) is present, to flag optional keys. */
export function presence(items, shape) {
	const counts = new Map();
	const visit = (list) => {
		for (const node of list) {
			if (node.kind === "group") visit(node.children);
			else if (node.kind === "concat") continue;
			else counts.set(node.id, items.reduce((n, item) => n + (getPath(item, node.source) === undefined ? 0 : 1), 0));
		}
	};
	visit(shape);
	return counts;
}

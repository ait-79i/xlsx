import { inferShape, normalizeInput, presence, reshape } from "./reshape";
import { concatNodes, groupNodes, moveOut, renameNode, setIncluded, ungroupNode } from "./converter";

const items = [
	{ id: 1, name: "Amina", customer: { city: "Rabat", zip: "10000" }, tags: ["a"] },
	{ id: 2, name: "Louis", customer: { city: "Lyon" }, vip: true },
];

test("input: arrays of objects, single objects, and what can't be reshaped", () => {
	expect(normalizeInput(items)).toEqual({ items, single: false });
	expect(normalizeInput({ a: 1 })).toEqual({ items: [{ a: 1 }], single: true });
	expect(normalizeInput([1, 2]).error).toBe("notObjects");
	expect(normalizeInput([]).error).toBe("emptyArray");
	expect(normalizeInput("x").error).toBe("notObjects");
});

test("the inferred shape keeps every key of every item, nested objects as groups", () => {
	const shape = inferShape(items);
	expect(shape.map((n) => n.key)).toEqual(["id", "name", "customer", "tags", "vip"]);
	expect(shape[2].kind).toBe("group");
	expect(shape[2].children.map((n) => n.key)).toEqual(["city", "zip"]);
	expect(shape[3].kind).toBe("field"); // arrays stay values
	// unchanged shape -> same data
	expect(reshape(items, shape)).toEqual(items);
});

test("missing keys are left out or set to null", () => {
	const shape = inferShape(items);
	expect(reshape(items, shape, { missing: "null" })[1]).toEqual({
		id: 2, name: "Louis", customer: { city: "Lyon", zip: null }, tags: null, vip: true,
	});
});

test("flatten a group, regroup, rename and exclude", () => {
	let shape = inferShape(items);
	const customer = shape[2];
	shape = ungroupNode(shape, customer.id).nodes;
	expect(reshape(items, shape)[0]).toEqual({ id: 1, name: "Amina", city: "Rabat", zip: "10000", tags: ["a"] });

	const [, name, city] = shape;
	shape = groupNodes(shape, [name.id, city.id], "person").nodes;
	shape = renameNode(shape, city.id, "town").nodes;
	shape = setIncluded(shape, [shape.find((n) => n.key === "tags").id], false);
	expect(reshape(items, shape)[0]).toEqual({ id: 1, person: { name: "Amina", town: "Rabat" }, zip: "10000" });

	shape = moveOut(shape, name.id).nodes;
	expect(Object.keys(reshape(items, shape)[0])).toEqual(["id", "person", "name", "zip"]);
	// the input is never modified
	expect(items[0].customer.city).toBe("Rabat");
});

test("presence counts the items holding each key", () => {
	const shape = inferShape(items);
	const counts = presence(items, shape);
	expect(counts.get(shape[0].id)).toBe(2);
	expect(counts.get(shape[2].children[1].id)).toBe(1);
	expect(counts.get(shape[4].id)).toBe(1);
});

test("combine keys from different nested objects after flattening", () => {
	let shape = inferShape(items);
	shape = ungroupNode(shape, shape[2].id).nodes; // id, name, city, zip, tags, vip
	const byKey = (k) => shape.find((n) => n.key === k).id;
	shape = concatNodes(shape, [byKey("zip"), byKey("city")], { key: "place", separator: " " }).nodes;
	expect(reshape(items, shape)[0].place).toBe("10000 Rabat");
	expect(reshape(items, shape)[1].place).toBe("Lyon");
});

import {
	jsonToGraph,
	containerIds,
	searchNodes,
	jsonNodeSize,
	ROOT_ID,
} from "./jsonGraph";
import { layoutGraph } from "./layout";
import { flattenObject, jsonToRows } from "./excelExport";

const data = [
	{ name: "Léa", address: { city: "Paris", "zip code": "75001" }, tags: ["a", "b"] },
	{ name: "Omar", address: null, tags: [] },
];

describe("jsonToGraph", () => {
	test("creates a node per object and array", () => {
		const { nodes, edges } = jsonToGraph(data);
		expect(nodes.map((n) => n.id).sort()).toEqual(
			[
				ROOT_ID,
				"$/0",
				"$/0/address",
				"$/0/tags",
				"$/1",
				"$/1/tags",
			].sort()
		);
		expect(edges).toContainEqual(
			expect.objectContaining({ source: "$/0", sourceHandle: "address", target: "$/0/address" })
		);
		const address = nodes.find((n) => n.id === "$/0/address");
		expect(address.data.rows[1]).toMatchObject({
			key: "zip code",
			value: "75001",
			jsonPath: '$[0].address["zip code"]',
		});
		expect(nodes.find((n) => n.id === "$/0").data.label).toBe("root[0]");
	});

	test("limits array items and hides collapsed nodes", () => {
		const big = Array.from({ length: 25 }, (_, i) => ({ i }));
		const { nodes } = jsonToGraph(big, { maxItems: 5 });
		expect(nodes).toHaveLength(6);
		expect(nodes.find((n) => n.id === ROOT_ID).data.hidden).toBe(20);

		const collapsed = jsonToGraph(data, { collapsed: new Set(["$/0"]) });
		expect(collapsed.nodes.map((n) => n.id)).not.toContain("$/0/address");
		const root = collapsed.nodes.find((n) => n.id === ROOT_ID);
		expect(root.data.rows[0].collapsed).toBe(true);
	});

	test("stops at maxNodes", () => {
		const { nodes, truncated } = jsonToGraph(data, { maxNodes: 2 });
		expect(nodes).toHaveLength(2);
		expect(truncated).toBe(true);
	});

	test("handles primitive roots", () => {
		const { nodes } = jsonToGraph(42);
		expect(nodes[0].data.rows).toEqual([
			{ key: "value", type: "number", value: 42, jsonPath: "$" },
		]);
	});

	test("lists container ids and searches", () => {
		expect(containerIds(data)).toEqual(["$/0", "$/0/address", "$/0/tags", "$/1", "$/1/tags"]);
		const { nodes } = jsonToGraph(data);
		expect(searchNodes(nodes, "paris")).toEqual(["$/0/address"]);
		expect(searchNodes(nodes, "  ")).toEqual([]);
	});

	test("lays out nodes from left to right", () => {
		const { nodes, edges } = jsonToGraph(data);
		const laid = layoutGraph(nodes, edges, { getSize: jsonNodeSize });
		const x = (id) => laid.find((n) => n.id === id).position.x;
		expect(x(ROOT_ID)).toBeLessThan(x("$/0"));
		expect(x("$/0")).toBeLessThan(x("$/0/address"));
	});
});

describe("excel export", () => {
	test("flattens nested objects", () => {
		expect(flattenObject({ a: { b: 1, c: { d: 2 } }, t: ["x", "y"], o: [{ z: 1 }] })).toEqual({
			"a.b": 1,
			"a.c.d": 2,
			t: "x, y",
			o: '[{"z":1}]',
		});
		expect(jsonToRows([1, { a: 1 }])).toEqual([{ value: 1 }, { a: 1 }]);
	});
});

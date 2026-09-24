import dagre from "@dagrejs/dagre";

/**
 * Positions nodes with dagre (layered graph layout).
 * @param {object[]} nodes React Flow nodes
 * @param {object[]} edges React Flow edges
 * @param {object} options
 * @param {(node: object) => {width: number, height: number}} options.getSize
 * @param {"LR"|"TB"} options.direction
 */
export function layoutGraph(
	nodes,
	edges,
	{ getSize, direction = "LR", nodesep = 30, ranksep = 90 }
) {
	const g = new dagre.graphlib.Graph();
	g.setGraph({ rankdir: direction, nodesep, ranksep });
	g.setDefaultEdgeLabel(() => ({}));

	const sizes = new Map(nodes.map((n) => [n.id, getSize(n)]));
	nodes.forEach((n) => g.setNode(n.id, sizes.get(n.id)));
	edges.forEach((e) => g.setEdge(e.source, e.target));

	dagre.layout(g);

	return nodes.map((n) => {
		const { x, y } = g.node(n.id);
		const { width, height } = sizes.get(n.id);
		// dagre gives the center of the node, React Flow expects the top left corner
		return { ...n, position: { x: x - width / 2, y: y - height / 2 } };
	});
}

import { toPng } from "html-to-image";
import { getNodesBounds, getViewportForBounds } from "@xyflow/react";

const MAX_SIZE = 8000;
const PADDING = 40;

/** Renders every node of the flow (not only the visible part) into a PNG and downloads it. */
export async function downloadFlowAsPng(container, nodes, fileName = "diagram.png") {
	const viewportEl = container?.querySelector(".react-flow__viewport");
	if (!viewportEl || nodes.length === 0) return;

	const bounds = getNodesBounds(nodes);
	const width = Math.min(Math.ceil(bounds.width) + PADDING * 2, MAX_SIZE);
	const height = Math.min(Math.ceil(bounds.height) + PADDING * 2, MAX_SIZE);
	const viewport = getViewportForBounds(bounds, width, height, 0.05, 1, 0.02);

	const dataUrl = await toPng(viewportEl, {
		backgroundColor: "#ffffff",
		width,
		height,
		// the icon fonts are cross-origin stylesheets that cannot be inlined
		skipFonts: true,
		style: {
			width: `${width}px`,
			height: `${height}px`,
			transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
		},
	});

	const link = document.createElement("a");
	link.download = fileName;
	link.href = dataUrl;
	link.click();
}

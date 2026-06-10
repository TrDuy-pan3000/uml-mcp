import dagre from "dagre";
const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 80;
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 30;
const PADDING = 10;
export function computeLayout(diagram, options) {
    const direction = options?.direction || "TB";
    const nodeSep = options?.nodeSep ?? 80;
    const rankSep = options?.rankSep ?? 120;
    const fixedWidth = options?.nodeWidth ?? DEFAULT_NODE_WIDTH;
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: direction,
        nodesep: nodeSep,
        ranksep: rankSep,
        edgesep: 60,
        marginx: 40,
        marginy: 40,
    });
    // Add nodes to dagre graph
    for (const node of diagram.nodes) {
        const height = calcNodeHeight(node);
        g.setNode(node.id, {
            width: fixedWidth,
            height,
        });
    }
    // Add edges to dagre graph
    for (const edge of diagram.edges) {
        if (edge.sourceId && edge.targetId) {
            g.setEdge(edge.sourceId, edge.targetId);
        }
    }
    // Run layout
    dagre.layout(g);
    // Extract positions
    const positions = new Map();
    for (const node of diagram.nodes) {
        const dagreNode = g.node(node.id);
        if (dagreNode) {
            const height = calcNodeHeight(node);
            positions.set(node.id, {
                x: Math.round(dagreNode.x - fixedWidth / 2),
                y: Math.round(dagreNode.y - height / 2),
                width: fixedWidth,
                height,
            });
        }
    }
    return { positions };
}
function calcNodeHeight(node) {
    const totalLines = 1 + node.attributes.length + node.methods.length; // header + attrs + methods
    return Math.max(DEFAULT_NODE_HEIGHT, HEADER_HEIGHT + totalLines * ROW_HEIGHT + PADDING);
}

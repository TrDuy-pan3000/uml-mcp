import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";
import { parseMermaid } from "../mermaid-parser.js";
import { computeLayout } from "../layout.js";
import { LayoutDirectionSchema } from "../types.js";
const DEFAULT_LAYOUT_DIRECTION = "TB";
const DEFAULT_NODE_SPACING = 80;
const DEFAULT_RANK_SPACING = 120;
const UML_TO_MERMAID_EDGE = {
    UMLAssociation: "-->",
    UMLGeneralization: "<|--",
    UMLInterfaceRealization: "..|>",
    UMLDependency: "..>",
    UMLAggregation: "o--",
    UMLComposition: "*--",
};
function buildMermaidFromSummary(summary) {
    const { views, elements } = summary;
    const nodes = views.filter((v) => v.kind === "node");
    const edges = views.filter((v) => v.kind === "edge");
    const lines = ["classDiagram"];
    for (const n of nodes) {
        const elem = elements.find((e) => e._id === n.modelId);
        const owned = elem?.ownedElements?.filter((o) => o.name) ?? [];
        const attrs = owned.filter((o) => o._type !== "UMLOperation" || !o._type);
        const ops = owned.filter((o) => o._type === "UMLOperation");
        const hasBody = attrs.length > 0 || ops.length > 0;
        if (n.isAbstract) {
            lines.push(`class <<abstract>> ${n.name}`);
        }
        else if (n.type === "UMLInterface") {
            lines.push(`class <<interface>> ${n.name}`);
        }
        else {
            lines.push(`class ${n.name}`);
        }
        if (hasBody) {
            lines.push("{");
            for (const a of attrs) {
                const line = a.name;
                if (line)
                    lines.push(`  ${line}`);
            }
            for (const o of ops) {
                const line = o.name + "()";
                if (o.name)
                    lines.push(`  ${line}`);
            }
            lines.push("}");
        }
    }
    for (const e of edges) {
        const arrow = UML_TO_MERMAID_EDGE[e.type] || "-->";
        const parts = [`  ${e.tailName} ${arrow} ${e.headName}`];
        if (e.name)
            parts.push(` : ${e.name}`);
        lines.push(parts.join(""));
    }
    return lines.join("\n");
}
function mergeNodes(existing, newNodes) {
    const seen = new Set(existing.map((n) => n.label));
    const merged = [...existing];
    for (const n of newNodes) {
        if (!seen.has(n.label)) {
            merged.push(n);
            seen.add(n.label);
        }
    }
    return merged;
}
function mergeEdges(existing, newEdges) {
    const existingSet = new Set(existing.map((e) => `${e.sourceId}|${e.targetId}|${e.type}`));
    const merged = [...existing];
    for (const e of newEdges) {
        const key = `${e.sourceId}|${e.targetId}|${e.type}`;
        if (!existingSet.has(key)) {
            merged.push(e);
            existingSet.add(key);
        }
    }
    return merged;
}
function mermaidFromMerged(nodes, edges) {
    const lines = ["classDiagram"];
    for (const n of nodes) {
        if (n.type === "interface") {
            lines.push(`class <<interface>> ${n.label}`);
        }
        else if (n.type === "abstract") {
            lines.push(`class <<abstract>> ${n.label}`);
        }
        else {
            lines.push(`class ${n.label}`);
        }
        if (n.attributes.length > 0 || n.methods.length > 0) {
            lines.push("{");
            for (const a of n.attributes)
                lines.push(`  ${a}`);
            for (const m of n.methods)
                lines.push(`  ${m}`);
            lines.push("}");
        }
    }
    for (const e of edges) {
        const edgeSymbols = {
            inheritance: "<|--",
            association: "-->",
            dependency: "..>",
            realization: "..|>",
            aggregation: "o--",
            composition: "*--",
        };
        const arrow = edgeSymbols[e.type] || "-->";
        const parts = [`  ${e.sourceId} ${arrow} ${e.targetId}`];
        if (e.label)
            parts.push(` : ${e.label}`);
        lines.push(parts.join(""));
    }
    return lines.join("\n");
}
export function registerAddToDiagramTool(server) {
    server.tool("add_to_diagram", "Add new classes and relationships from Mermaid code into an existing diagram. Reads current diagram, merges with new elements, regenerates with proper layout. Requires staruml-mcp-extension.", {
        diagramId: z.string().describe("ID of the existing diagram to extend"),
        code: z.string().describe("Mermaid classDiagram code for new elements to add"),
        layoutDirection: LayoutDirectionSchema,
        nodeSpacing: z.number().int().min(1).max(400).optional().default(DEFAULT_NODE_SPACING),
        rankSpacing: z.number().int().min(1).max(400).optional().default(DEFAULT_RANK_SPACING),
    }, async (args) => {
        try {
            if (!(await api.isExtAvailable())) {
                return response.error(JsonRpcErrorCode.ServerError, "staruml-mcp-extension is required.");
            }
            // Step 1: Read existing diagram
            const summary = await api.getDiagramSummary(args.diagramId);
            const oldDiagramName = summary.diagram.name;
            // Step 2: Parse new Mermaid code
            const newParsed = parseMermaid(args.code);
            if (newParsed.nodes.length === 0) {
                return response.error(JsonRpcErrorCode.InvalidParams, "No new elements found in Mermaid code.");
            }
            // Step 3: Build existing nodes/edges from summary
            const existingNodes = [];
            for (const v of summary.views.filter((v) => v.kind === "node")) {
                const elem = summary.elements.find((e) => e._id === v.modelId);
                const owned = elem?.ownedElements?.filter((o) => o.name) ?? [];
                const attrs = owned.filter((o) => o._type !== "UMLOperation" || !o._type).map((o) => o.name);
                const ops = owned.filter((o) => o._type === "UMLOperation").map((o) => o.name + "()");
                existingNodes.push({
                    id: v.name,
                    label: v.name,
                    type: v.type === "UMLInterface" ? "interface" : v.isAbstract ? "abstract" : "class",
                    attributes: attrs,
                    methods: ops,
                });
            }
            // Ensure newParsed nodes have id = label (already true from parser)
            for (const n of newParsed.nodes) {
                if (!n.id)
                    n.id = n.label;
            }
            const existingEdges = [];
            for (const v of summary.views.filter((v) => v.kind === "edge")) {
                existingEdges.push({
                    sourceId: v.tailName,
                    targetId: v.headName,
                    type: edgeTypeFromUml(v.type),
                    label: v.name,
                });
            }
            // Step 4: Compute truly new nodes (exclude implicit nodes from edge references)
            const existingNames = new Set(existingNodes.map((n) => n.label));
            const trulyNewNodes = newParsed.nodes.filter((n) => !existingNames.has(n.label));
            const trulyNewEdges = newParsed.edges.filter((e) => {
                const key = `${e.sourceId}|${e.targetId}|${e.type}`;
                return !existingEdges.some((ee) => `${ee.sourceId}|${ee.targetId}|${ee.type}` === key);
            });
            // Merge
            const mergedNodes = mergeNodes(existingNodes, newParsed.nodes);
            const mergedEdges = mergeEdges(existingEdges, newParsed.edges);
            // Step 5: Compute dagre layout for merged set
            const mergedDiagram = { nodes: mergedNodes, edges: mergedEdges };
            const layout = computeLayout(mergedDiagram, {
                direction: args.layoutDirection || DEFAULT_LAYOUT_DIRECTION,
                nodeSep: args.nodeSpacing || DEFAULT_NODE_SPACING,
                rankSep: args.rankSpacing || DEFAULT_RANK_SPACING,
            });
            // Step 6: Generate Mermaid code for merged diagram
            const mergedCode = mermaidFromMerged(mergedNodes, mergedEdges);
            // Step 7: Create new diagram via built-in API
            await api.callBuiltIn("/generate_diagram", { code: mergedCode });
            // Step 8: Apply positions + routing via extension
            let postProcessed = false;
            try {
                const diagrams = await api.getAllDiagramsInfo();
                const newDiag = Array.isArray(diagrams)
                    ? diagrams[diagrams.length - 1]
                    : diagrams;
                const newDiagramId = newDiag._id || newDiag.id;
                const viewsData = await api.getDiagramViews(newDiagramId);
                const views = viewsData?.views || [];
                for (const node of mergedNodes) {
                    const pos = layout.positions.get(node.label);
                    if (!pos)
                        continue;
                    const view = views.find((v) => v.kind === "node" && v.name === node.label);
                    if (view) {
                        await api.updateView({
                            id: view._id,
                            left: Math.round(pos.x),
                            top: Math.round(pos.y),
                        });
                    }
                }
                await api.routeDiagramEdges(newDiagramId);
                // Add attributes/methods to new nodes (ones that didn't exist before)
                const newNames = new Set(newParsed.nodes.map((n) => n.label));
                for (const node of newParsed.nodes) {
                    if (node.attributes.length === 0 && node.methods.length === 0)
                        continue;
                    const view = views.find((v) => v.kind === "node" && v.name === node.label);
                    if (!view)
                        continue;
                    try {
                        const found = await api.findElements({ type: "UMLClass", query: node.label });
                        const elems = found?.elements || [];
                        const model = elems.find((e) => e.name === node.label);
                        if (model) {
                            for (const attr of node.attributes) {
                                const attrName = attr.replace(/^[+#~-]\s*/, "").split(":")[0].trim();
                                await api.callExt("/create_element", { type: "UMLAttribute", parentId: model._id, name: attrName });
                            }
                            for (const method of node.methods) {
                                const methodName = method.replace(/^[+#~-]\s*/, "").split("(")[0].trim();
                                await api.callExt("/create_element", { type: "UMLOperation", parentId: model._id, name: methodName });
                            }
                        }
                    }
                    catch { /* best-effort */ }
                }
                postProcessed = true;
                // Step 9: Delete old diagram
                try {
                    await api.deleteElement(args.diagramId);
                }
                catch { /* non-critical */ }
                return response.text(`Diagram "${oldDiagramName}" extended: added ${trulyNewNodes.length} elements and ${trulyNewEdges.length} connections. New diagram id: ${newDiagramId}`);
            }
            catch {
                if (postProcessed) {
                    return response.text(`Diagram extended but old diagram may not have been deleted.`);
                }
                // Fallback: return success without post-processing
                return response.text(`Diagram regenerated with ${mergedNodes.length} elements and ${mergedEdges.length} connections (post-processing skipped).`);
            }
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to extend diagram: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
function edgeTypeFromUml(umlType) {
    const reverse = {
        UMLAssociation: "association",
        UMLGeneralization: "inheritance",
        UMLInterfaceRealization: "realization",
        UMLDependency: "dependency",
        UMLAggregation: "aggregation",
        UMLComposition: "composition",
    };
    return reverse[umlType] || "association";
}

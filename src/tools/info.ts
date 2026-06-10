import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";

export function registerInfoTools(server: any) {
  server.tool(
    "get_all_diagrams_info",
    "Get information for all diagrams in StarUML.",
    {},
    async ({}) => {
      try {
        const data = await api.getAllDiagramsInfo();
        return response.text(`All diagrams: ${JSON.stringify(data)}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get all diagrams info: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "get_current_diagram_info",
    "Get information for the current diagram in StarUML.",
    {},
    async ({}) => {
      try {
        const data = await api.getCurrentDiagramInfo();
        if (data) {
          return response.text(`Current diagram: ${JSON.stringify(data)}`);
        }
        return response.text("No current diagram found.");
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get current diagram info: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "get_diagram_image_by_id",
    "Get the image of a diagram by its ID in StarUML.",
    {
      diagramId: z.string().describe("ID of the diagram to get the image for."),
    },
    async ({ diagramId }: { diagramId: string }) => {
      try {
        const image = await api.getDiagramImage(diagramId);
        return response.image("image/png", image);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get diagram image: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "get_project_info",
    "Get information about the current StarUML project.",
    {},
    async ({}) => {
      try {
        const data = await api.getProjectInfo();
        return response.text(`Project info: ${JSON.stringify(data)}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get project info: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "get_diagram_ids",
    "List all diagram names and IDs in the StarUML project.",
    {},
    async ({}) => {
      try {
        const data = await api.getAllDiagramsInfo();
        const list = Array.isArray(data)
          ? data.map((d: any) => ({ id: d.id || d._id, name: d.name }))
          : [{ id: data.id || data._id, name: data.name }];
        return response.text(`Diagrams:\n${list.map((d: any) => `  - ${d.name} (id: ${d.id})`).join("\n")}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to list diagrams: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "get_diagram_summary",
    "Get a complete summary of a diagram: all nodes with positions, attributes, methods, types, and all edges with connections. Requires staruml-mcp-extension.",
    {
      diagramId: z.string().describe("Diagram _id to inspect"),
    },
    async (args: { diagramId: string }) => {
      try {
        const summary = await api.getDiagramSummary(args.diagramId);
        const { diagram, views, elements } = summary;
        const nodes = views.filter((v: any) => v.kind === "node");
        const edges = views.filter((v: any) => v.kind === "edge");
        const lines: string[] = [];
        lines.push(`Diagram: ${diagram.name} (id: ${diagram._id})`);
        lines.push(`Nodes: ${nodes.length}, Edges: ${edges.length}`);
        lines.push("");
        if (nodes.length > 0) {
          lines.push("=== NODES ===");
          for (const n of nodes) {
            const elem = elements.find((e: any) => e._id === n.modelId);
            const attrs = elem?.ownedElements?.filter((o: any) => o.name)?.map((o: any) => o.name) ?? [];
            const isAbstract = n.isAbstract ? " {abstract}" : "";
            lines.push(`  ${n.name}${isAbstract} (${n.type}) at (${n.left}, ${n.top}) ${n.width}x${n.height} modelId=${n.modelId}`);
            if (attrs.length > 0) {
              lines.push(`    Attributes: ${attrs.join(", ")}`);
            }
          }
        }
        if (edges.length > 0) {
          lines.push("");
          lines.push("=== EDGES ===");
          for (const e of edges) {
            lines.push(`  ${e.tailName} ${e.type} --> ${e.headName}  lineStyle=${e.lineStyle}`);
          }
        }
        return response.text(lines.join("\n"));
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get diagram summary: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

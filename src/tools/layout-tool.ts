import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";
import { parseMermaid } from "../mermaid-parser.js";
import { computeLayout } from "../layout.js";
import { LayoutDirectionSchema } from "../types.js";

export function registerLayoutTools(server: any) {
  server.tool(
    "apply_layout",
    "Apply auto-layout to the current diagram. Supports direction and spacing options.",
    {
      direction: LayoutDirectionSchema,
      nodeSpacing: z
        .number()
        .int()
        .min(1)
        .max(400)
        .optional()
        .default(80)
        .describe("Spacing between nodes in pixels."),
      rankSpacing: z
        .number()
        .int()
        .min(1)
        .max(400)
        .optional()
        .default(120)
        .describe("Spacing between ranks in pixels."),
      edgeSpacing: z
        .number()
        .int()
        .min(1)
        .max(400)
        .optional()
        .default(60)
        .describe("Spacing between edges in pixels."),
    },
    async (args: {
      direction?: string;
      nodeSpacing?: number;
      rankSpacing?: number;
      edgeSpacing?: number;
    }) => {
      try {
        // 1. Try MCP Layout Bridge extension (port 58322)
        try {
          const fetch = (await import("node-fetch")).default;
          const res = await fetch("http://127.0.0.1:58322/layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: args.direction || "TB" }),
          });
          if (res.ok) {
            return response.text(
              `Auto-layout applied (direction: ${args.direction || "TB"}).`
            );
          }
        } catch {
          // fall through
        }

        // 2. Try built-in API
        try {
          await api.layoutDiagram({
            direction: args.direction || "TB",
            nodeSpacing: args.nodeSpacing,
            rankSpacing: args.rankSpacing,
            edgeSpacing: args.edgeSpacing,
          });
          return response.text(
            `Auto-layout applied (direction: ${args.direction || "TB"}).`
          );
        } catch {
          return response.text(
            "Auto-layout could not be applied. Use Format > Auto Layout in StarUML, or install the mcp-layout-bridge extension."
          );
        }
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Layout failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "arrange_elements",
    "Arrange elements on the current diagram using a dagre layout algorithm for optimal positioning.",
    {
      diagramId: z.string().describe("Diagram _id"),
      direction: z
        .enum(["TB", "LR", "BT", "RL"])
        .optional()
        .default("TB")
        .describe("Layout direction"),
      nodeSep: z.number().optional().default(80).describe("Node spacing"),
      rankSep: z.number().optional().default(120).describe("Rank spacing"),
    },
    async (args: {
      diagramId: string;
      direction?: string;
      nodeSep?: number;
      rankSep?: number;
    }) => {
      try {
        // Get current views with their positions
        const views: any[] = await api.getDiagramViews(args.diagramId);
        if (!views || views.length === 0) {
          return response.text("No views found in this diagram.");
        }

        // Build a pseudo-Mermaid diagram from existing views
        const nodes = views
          .filter((v: any) => v.left !== undefined)
          .map((v: any) => ({
            id: v._id,
            label: v.model?.name || v._id,
            type: "class" as const,
            attributes: [] as string[],
            methods: [] as string[],
          }));

        const mermaid = { nodes, edges: [] as any[] };

        // Compute new positions
        const layout = computeLayout(mermaid, {
          direction: (args.direction as any) || "TB",
          nodeSep: args.nodeSep,
          rankSep: args.rankSep,
        });

        // Move each view to its new position
        let moved = 0;
        for (const node of nodes) {
          const pos = layout.positions.get(node.id);
          if (pos) {
            try {
              await api.updateView({
                id: node.id,
                left: pos.x,
                top: pos.y,
              });
              moved++;
            } catch {
              // skip views that can't be moved
            }
          }
        }

        return response.text(
          `Arranged ${moved} of ${nodes.length} elements using ${args.direction || "TB"} layout.`
        );
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Arrange failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

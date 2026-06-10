import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";

export function registerViewTools(server: any) {
  server.tool(
    "get_diagram_views",
    "List all visual views on a diagram with their positions (left, top, width, height). Requires staruml-mcp-extension.",
    {
      diagramId: z.string().describe("Diagram _id"),
    },
    async (args: { diagramId: string }) => {
      try {
        const views = await api.getDiagramViews(args.diagramId);
        return response.text(`Views: ${JSON.stringify(views)}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to get views: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "move_view",
    "Move a visual view to a specific position on the diagram. Requires staruml-mcp-extension.",
    {
      viewId: z.string().describe("View _id"),
      left: z.number().describe("New left X coordinate"),
      top: z.number().describe("New top Y coordinate"),
    },
    async (args: { viewId: string; left: number; top: number }) => {
      try {
        await api.updateView({ id: args.viewId, left: args.left, top: args.top });
        return response.text(`Moved view ${args.viewId} to (${args.left}, ${args.top})`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to move view: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "resize_view",
    "Resize a visual view on the diagram. Requires staruml-mcp-extension.",
    {
      viewId: z.string().describe("View _id"),
      width: z.number().describe("New width"),
      height: z.number().describe("New height"),
    },
    async (args: { viewId: string; width: number; height: number }) => {
      try {
        await api.updateView({ id: args.viewId, width: args.width, height: args.height });
        return response.text(`Resized view ${args.viewId} to ${args.width}x${args.height}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to resize view: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "align_views",
    "Align multiple views relative to each other. Requires staruml-mcp-extension.",
    {
      viewIds: z.array(z.string()).min(2).describe("Array of view _ids to align"),
      alignment: z
        .enum(["left", "right", "top", "bottom", "center", "middle"])
        .describe("Alignment type: left, right, top, bottom, center (horizontal), middle (vertical)"),
    },
    async (args: { viewIds: string[]; alignment: string }) => {
      try {
        await api.alignViews(args);
        return response.text(`Aligned ${args.viewIds.length} views: ${args.alignment}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to align views: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

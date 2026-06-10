import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";
import { parseMermaid } from "../mermaid-parser.js";
import { computeLayout } from "../layout.js";
import { LayoutDirectionSchema, STARUML_EDGE_TYPES, STARUML_NODE_TYPES } from "../types.js";

const DEFAULT_LAYOUT_DIRECTION = "TB";
const DEFAULT_NODE_SPACING = 40;
const DEFAULT_RANK_SPACING = 60;

async function getOrCreateModelId(): Promise<string> {
  // Try project info from extension API { filename, project: { _id, name } }
  try {
    const info = await api.getProjectInfo();
    if (info?.project?._id) return info.project._id;
  } catch {
    // fallback
  }
  // Try built-in API getProjectInfo
  try {
    const info = await api.callBuiltIn("/get_project_info", {});
    if (info?._id) return info._id;
  } catch {
    // fallback
  }
  throw new Error(
    "Could not determine project root model ID. " +
    "Make sure a StarUML project is open and the extension is running."
  );
}

async function ensureDiagram(name: string): Promise<{ _id: string; name: string }> {
  // Check if diagram already exists
  try {
    const diagrams = await api.getAllDiagramsInfo();
    if (Array.isArray(diagrams)) {
      const existing = diagrams.find((d: any) => d.name === name);
      if (existing) return existing;
      // Use the first available diagram if no match
      if (diagrams.length > 0) return diagrams[0];
    } else if (diagrams && diagrams._id) {
      return diagrams;
    }
  } catch {
    // ignore
  }
  // Fall back to using current diagram
  try {
    const current = await api.getCurrentDiagramInfo();
    if (current && current._id) return current;
  } catch {
    // ignore
  }
  throw new Error("No diagram available. Please create a diagram in StarUML first.");
}

async function addAttribute(modelId: string, attrText: string): Promise<void> {
  const attr = parseAttribute(attrText);
  if (!attr) return;
  try {
    await api.callExt("/create_element", {
      type: "UMLAttribute",
      parentId: modelId,
      name: attr.name,
    });
  } catch {
    // Silently fail for child elements
  }
}

async function addOperation(modelId: string, methodText: string): Promise<void> {
  const method = parseMethod(methodText);
  if (!method) return;
  try {
    await api.callExt("/create_element", {
      type: "UMLOperation",
      parentId: modelId,
      name: method.name,
    });
  } catch {
    // silently fail
  }
}

function parseAttribute(text: string): { name: string } | null {
  const cleaned = text.replace(/^[+#~-]\s*/, "");
  const parts = cleaned.split(":");
  return { name: parts[0]?.trim() || text.trim() };
}

function parseMethod(text: string): { name: string } | null {
  const cleaned = text.replace(/^[+#~-]\s*/, "");
  const parenIdx = cleaned.indexOf("(");
  if (parenIdx >= 0) {
    return { name: cleaned.substring(0, parenIdx).trim() };
  }
  return { name: cleaned.trim() };
}

export function registerDiagramTools(server: any) {
  server.tool(
    "generate_diagram",
    "Generate a diagram in StarUML from Mermaid syntax. Supports classDiagram. Elements are automatically positioned to avoid overlap.",
    {
      code: z.string().describe("Mermaid code for the diagram."),
      layout: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to apply auto-layout after generation."),
      layoutDirection: LayoutDirectionSchema,
      nodeSpacing: z
        .number()
        .int()
        .min(1)
        .max(400)
        .optional()
        .default(DEFAULT_NODE_SPACING)
        .describe("Spacing between nodes in pixels."),
      rankSpacing: z
        .number()
        .int()
        .min(1)
        .max(400)
        .optional()
        .default(DEFAULT_RANK_SPACING)
        .describe("Spacing between ranks in pixels."),
    },
    async (args: {
      code: string;
      layout?: boolean;
      layoutDirection?: string;
      nodeSpacing?: number;
      rankSpacing?: number;
    }) => {
      try {
        // Step 1: Parse Mermaid
        const mermaid = parseMermaid(args.code);
        if (mermaid.nodes.length === 0) {
          return response.error(
            JsonRpcErrorCode.InvalidParams,
            "No elements found in Mermaid code."
          );
        }

        // Step 2: Compute dagre layout
        const layout = computeLayout(mermaid, {
          direction: (args.layoutDirection as any) || "TB",
          nodeSep: args.nodeSpacing || DEFAULT_NODE_SPACING,
          rankSep: args.rankSpacing || DEFAULT_RANK_SPACING,
        });

        // Step 3: Create diagram via built-in API (always works)
        await api.callBuiltIn("/generate_diagram", { code: args.code });

        // Step 4: Apply extension post-processing if available
        let postProcessed = false;
        if (await api.isExtAvailable()) {
          try {
            // Find the generated diagram (built-in names it "Class Diagram by Mermaid")
            const diagrams = await api.getAllDiagramsInfo();
            const diag = Array.isArray(diagrams)
              ? diagrams.find((d: any) => d.name === "Class Diagram by Mermaid") || diagrams[diagrams.length - 1]
              : diagrams;
            const diagramId = diag._id || diag.id;

            // Get all views on the diagram
            const viewsData = await api.getDiagramViews(diagramId);
            const views: any[] = viewsData?.views || [];

            // Match node views to mermaid nodes by name and apply positions
            for (const node of mermaid.nodes) {
              const pos = layout.positions.get(node.id);
              if (!pos) continue;
              const view = views.find(
                (v: any) => v.kind === "node" && v.name === node.label
              );
              if (view) {
                await api.updateView({
                  id: view._id,
                  left: Math.round(pos.x),
                  top: Math.round(pos.y),
                });
              }
            }

            // Route ALL edges on the diagram with rectilinear waypoints
            await api.routeDiagramEdges(diagramId);

            // Add attributes and methods via extension (best-effort)
            if (views.length > 0) {
              for (const node of mermaid.nodes) {
                if (node.attributes.length === 0 && node.methods.length === 0) continue;
                const view = views.find(
                  (v: any) => v.kind === "node" && v.name === node.label
                );
                if (!view) continue;
                // Find the model ID by searching for the element
                try {
                  const found = await api.findElements({ type: "UMLClass", query: node.label });
                  const elems: any[] = found?.elements || [];
                  const model = elems.find((e: any) => e.name === node.label);
                  if (model) {
                    for (const attr of node.attributes) await addAttribute(model._id, attr);
                    for (const method of node.methods) await addOperation(model._id, method);
                  }
                } catch { /* best-effort */ }
              }
            }

            postProcessed = true;
          } catch {
            // Post-processing failed, still return success for creation
          }
        }

        if (postProcessed) {
          return response.text(
            `Diagram generated with ${mermaid.nodes.length} elements and ${mermaid.edges.length} connections. Dagre layout + rectilinear edges applied.`
          );
        }

        // Apply auto-layout if requested and no extension
        if (args.layout) {
          try {
            await api.layoutDiagram({
              direction: args.layoutDirection || "TB",
              nodeSpacing: args.nodeSpacing || DEFAULT_NODE_SPACING,
              rankSpacing: args.rankSpacing || DEFAULT_RANK_SPACING,
            });
            return response.text(
              `Diagram generated with ${mermaid.nodes.length} elements. Auto-layout applied.`
            );
          } catch {
            // auto-layout failed, still return success
          }
        }

        return response.text(
          `Diagram generated with ${mermaid.nodes.length} elements.`
        );
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "execute_command",
    "Execute any built-in StarUML command. Requires staruml-mcp-extension.",
    {
      commandId: z.string().describe("Command ID (e.g. 'project:save', 'view:fit-to-window', 'diagram:add-class')"),
    },
    async (args: { commandId: string }) => {
      try {
        const result = await api.executeCommand(args.commandId);
        return response.text(`Command '${args.commandId}' executed.`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  server.tool(
    "list_commands",
    "List all available built-in StarUML commands. Requires staruml-mcp-extension.",
    {},
    async ({}) => {
      try {
        const commands = await api.getAllCommands();
        return response.text(`Available commands: ${JSON.stringify(commands)}`);
      } catch (error) {
        return response.error(
          JsonRpcErrorCode.InternalError,
          `Failed to list commands: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

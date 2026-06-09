#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as response from "./response.js";
import { JsonRpcErrorCode } from "./response.js";
import { api } from "./utils.js";
import packageJson from "../package.json" with { type: "json" };
import fetch from "node-fetch";
const NAME = "staruml-mcp-server";
const VERSION = packageJson.version;
// port number for the StarUML's API server (default: 58321)
let apiPort = 58321;
// command line argument parsing
const args = process.argv.slice(2);
const apiPortArg = args.find((arg) => arg.startsWith("--api-port="));
if (apiPortArg) {
    const port = apiPortArg.split("=")[1];
    try {
        apiPort = parseInt(port, 10);
        if (isNaN(apiPort) || apiPort < 0 || apiPort > 65535) {
            throw new Error(`Invalid port number: ${port}`);
        }
    }
    catch (error) {
        console.error(`Invalid port number: ${port}`);
        process.exit(1);
    }
}
// Default layout options
const DEFAULT_LAYOUT_DIRECTION = "TB";
const DEFAULT_NODE_SPACING = 20;
const DEFAULT_RANK_SPACING = 20;
const DEFAULT_EDGE_SPACING = 20;
/**
 * Applies auto-layout to the current diagram in StarUML.
 * Returns a descriptive message: either success or a graceful-failure note.
 */
async function applyLayout(direction, nodeSpacing, rankSpacing, edgeSpacing) {
    // 1. Try MCP Layout Bridge extension (port 58322)
    try {
        const res = await fetch("http://127.0.0.1:58322/layout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ direction }),
        });
        if (res.ok) {
            return `Auto-layout applied successfully using StarUML command executor (direction: ${direction}).`;
        }
    }
    catch (e) {
        // Ignore and proceed to next option
    }
    // 2. Try native API server endpoint (port 58321)
    try {
        await api(apiPort, "/layout_diagram", {
            direction,
            nodeSpacing,
            rankSpacing,
            edgeSpacing,
        });
        return `Auto-layout applied (direction: ${direction}, nodeSpacing: ${nodeSpacing}, rankSpacing: ${rankSpacing}).`;
    }
    catch (layoutError) {
        // Graceful fallback
        return `Auto-layout could not be applied automatically. Please reload/restart StarUML to activate the mcp-layout-bridge extension, or use menu 'Format > Auto Layout' in StarUML to arrange elements manually.`;
    }
}
// Create an MCP server
const server = new McpServer({
    name: NAME,
    version: VERSION,
});
server.tool("generate_diagram", "Generate a diagram in StarUML from Mermaid syntax. Optionally auto-arranges elements after generation.", {
    code: z
        .string()
        .describe("Mermaid code to generate the diagram. Supported diagrams are classDiagram, sequenceDiagram, flowchart, erDiagram, mindmap, requirementDiagram and stateDiagram. Other diagrams are not supported."),
    layout: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to automatically apply auto-layout after diagram generation to neatly arrange all elements. Default is true."),
    layoutDirection: z
        .enum(["TB", "LR", "BT", "RL", "custom"])
        .optional()
        .default("TB")
        .describe("Layout direction for auto-layout: TB (top-to-bottom), LR (left-to-right), BT (bottom-to-top), RL (right-to-left). Default is TB."),
    nodeSpacing: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(DEFAULT_NODE_SPACING)
        .describe("Spacing between nodes in pixels. Default is 20."),
    rankSpacing: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(DEFAULT_RANK_SPACING)
        .describe("Spacing between ranks (hierarchy levels) in pixels. Default is 20."),
}, async ({ code, layout, layoutDirection, nodeSpacing, rankSpacing }) => {
    try {
        await api(apiPort, "/generate_diagram", { code });
        if (layout) {
            const layoutMessage = await applyLayout(layoutDirection, nodeSpacing, rankSpacing, DEFAULT_EDGE_SPACING);
            return response.text(`Diagram generated successfully.\n${layoutMessage}`);
        }
        return response.text("Diagram generated successfully.");
    }
    catch (error) {
        console.error(error);
        return response.error(JsonRpcErrorCode.InternalError, `Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
});
server.tool("layout_diagram", "Apply auto-layout to the current diagram in StarUML to neatly arrange all elements. Use this after generating or modifying a diagram.", {
    direction: z
        .enum(["TB", "LR", "BT", "RL", "custom"])
        .optional()
        .default("TB")
        .describe("Layout direction: TB (top-to-bottom), LR (left-to-right), BT (bottom-to-top), RL (right-to-left). Default is TB."),
    nodeSpacing: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(DEFAULT_NODE_SPACING)
        .describe("Spacing between nodes in pixels. Default is 20."),
    rankSpacing: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(DEFAULT_RANK_SPACING)
        .describe("Spacing between ranks (hierarchy levels) in pixels. Default is 20."),
    edgeSpacing: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(DEFAULT_EDGE_SPACING)
        .describe("Spacing between edges in pixels. Default is 20."),
}, async ({ direction, nodeSpacing, rankSpacing, edgeSpacing }) => {
    const layoutMessage = await applyLayout(direction, nodeSpacing, rankSpacing, edgeSpacing);
    return response.text(layoutMessage);
});
server.tool("get_all_diagrams_info", "Get information for all diagrams in StarUML.", {}, async ({}) => {
    try {
        const data = await api(apiPort, "/get_all_diagrams_info", {});
        return response.text(`All diagrams: ${JSON.stringify(data)}`);
    }
    catch (error) {
        console.error(error);
        return response.error(JsonRpcErrorCode.InternalError, `Failed to get all diagrams info: ${error instanceof Error ? error.message : String(error)}`);
    }
});
server.tool("get_current_diagram_info", "Get information for the current diagram in StarUML.", {}, async ({}) => {
    try {
        const data = await api(apiPort, "/get_current_diagram_info", {});
        if (data) {
            return response.text(`Current diagram: ${JSON.stringify(data)}`);
        }
        else {
            return response.text("No current diagram found.");
        }
    }
    catch (error) {
        console.error(error);
        return response.error(JsonRpcErrorCode.InternalError, `Failed to get current diagram info: ${error instanceof Error ? error.message : String(error)}`);
    }
});
server.tool("get_diagram_image_by_id", "Get the image of a diagram by its ID in StarUML.", {
    diagramId: z
        .string()
        .describe("ID of the diagram to get the image for. You can get the ID from the 'get_all_diagrams_info' tool."),
}, async ({ diagramId }) => {
    try {
        const image = await api(apiPort, "/get_diagram_image_by_id", {
            diagramId,
        });
        return response.image("image/png", image);
    }
    catch (error) {
        console.error(error);
        return response.error(JsonRpcErrorCode.InternalError, `Failed to get diagram image by id: ${error instanceof Error ? error.message : String(error)}`);
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("StarUML MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Error starting server:", error);
    process.exit(1);
});

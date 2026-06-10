#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import packageJson from "../package.json" with { type: "json" };
import { setPorts, detectExtensions } from "./utils.js";
import { registerInfoTools } from "./tools/info.js";
import { registerElementTools } from "./tools/element.js";
import { registerViewTools } from "./tools/view.js";
import { registerDiagramTools } from "./tools/diagram.js";
import { registerLayoutTools } from "./tools/layout-tool.js";
import { registerProjectTools } from "./tools/project.js";
import { registerAddToDiagramTool } from "./tools/add-to-diagram.js";

const NAME = "staruml-mcp-server";
const VERSION = packageJson.version;

// Parse CLI args
let apiPort = 58321;
let extPort = 58322;

const args = process.argv.slice(2);

const apiPortArg = args.find((a) => a.startsWith("--api-port="));
if (apiPortArg) {
  const port = parseInt(apiPortArg.split("=")[1], 10);
  if (!isNaN(port) && port >= 0 && port <= 65535) apiPort = port;
}

const extPortArg = args.find((a) => a.startsWith("--ext-port="));
if (extPortArg) {
  const port = parseInt(extPortArg.split("=")[1], 10);
  if (!isNaN(port) && port >= 0 && port <= 65535) extPort = port;
}

setPorts(apiPort, extPort);

const server = new McpServer({
  name: NAME,
  version: VERSION,
});

// Register all tool groups
registerInfoTools(server);
registerElementTools(server);
registerViewTools(server);
registerDiagramTools(server);
registerLayoutTools(server);
registerProjectTools(server);
registerAddToDiagramTool(server);

async function main() {
  // Detect available extensions
  const status = await detectExtensions();
  console.error(
    `StarUML MCP Server v${VERSION}`
  );
  console.error(`  Built-in API (port ${apiPort}): ${status.builtIn ? "✓" : "✗"}`);
  console.error(`  Extension    (port ${extPort}): ${status.extension ? `✓ v${status.extensionVersion || "?"}` : "✗ — install staruml-mcp-extension for full features"}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("StarUML MCP Server ready on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

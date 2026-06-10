import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";
export function registerProjectTools(server) {
    server.tool("save_project", "Save the current StarUML project.", {
        filePath: z.string().optional().describe("Optional file path to save to"),
    }, async (args) => {
        try {
            await api.saveProject(args.filePath);
            return response.text("Project saved.");
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to save project: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("open_project", "Open a StarUML project file (.mdj).", {
        filePath: z.string().describe("Path to the .mdj file"),
    }, async (args) => {
        try {
            await api.openProject(args.filePath);
            return response.text(`Opened project: ${args.filePath}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to open project: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("new_project", "Create a new StarUML project.", {}, async ({}) => {
        try {
            await api.newProject();
            return response.text("New project created.");
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to create project: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}

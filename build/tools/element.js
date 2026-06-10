import { z } from "zod";
import * as response from "../response.js";
import { JsonRpcErrorCode } from "../response.js";
import * as api from "../utils.js";
export function registerElementTools(server) {
    server.tool("create_element", "Create a UML model element WITH its visual view on a diagram. Supports x/y positioning. Requires staruml-mcp-extension.", {
        type: z.string().describe("Metamodel type: 'UMLClass', 'UMLInterface', 'UMLPackage', 'UMLActor', 'UMLUseCase', etc."),
        parentId: z.string().describe("Owning model's _id (usually a UMLModel or UMLPackage _id)"),
        diagramId: z.string().describe("Target diagram's _id"),
        name: z.string().optional().describe("Element label"),
        x: z.number().optional().default(100).describe("Left X coordinate (default 100)"),
        y: z.number().optional().default(100).describe("Top Y coordinate (default 100)"),
        width: z.number().optional().default(180).describe("Width of the element view (default 180)"),
        height: z.number().optional().default(80).describe("Height of the element view (default 80)"),
    }, async (args) => {
        try {
            if (!(await api.isExtAvailable())) {
                return response.error(JsonRpcErrorCode.ServerError, "staruml-mcp-extension is required. Install it via StarUML: Tools > Extension Manager > Install From URL > https://github.com/ezrabrilliant/staruml-mcp-extension");
            }
            const result = await api.createElementWithView({
                type: args.type,
                parentId: args.parentId,
                diagramId: args.diagramId,
                name: args.name,
                x: args.x,
                y: args.y,
                x2: args.x + args.width,
                y2: args.y + args.height,
            });
            return response.text(`Created ${args.type}: viewId=${result.view._id}, modelId=${result.model._id}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to create element: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("create_edge", "Connect two existing views on a diagram with a typed relationship edge. Requires staruml-mcp-extension.", {
        type: z.string().describe("Edge type: 'UMLAssociation', 'UMLGeneralization', 'UMLDependency', 'UMLInterfaceRealization', 'UMLAggregation', 'UMLComposition'"),
        parentId: z.string().describe("Owning model's _id"),
        diagramId: z.string().describe("Diagram's _id"),
        sourceViewId: z.string().describe("Source view _id (from create_element result)"),
        targetViewId: z.string().describe("Target view _id (from create_element result)"),
        name: z.string().optional().describe("Optional edge label"),
    }, async (args) => {
        try {
            if (!(await api.isExtAvailable())) {
                return response.error(JsonRpcErrorCode.ServerError, "staruml-mcp-extension is required.");
            }
            const edgeResult = await api.createEdgeWithView({
                type: args.type,
                parentId: args.parentId,
                diagramId: args.diagramId,
                tailViewId: args.sourceViewId,
                headViewId: args.targetViewId,
                name: args.name,
            });
            // Set rectilinear line style for clean right-angle edges
            const edgeViewId = edgeResult?.view?._id || edgeResult?._id;
            if (edgeViewId) {
                api.routeEdge(edgeViewId);
            }
            return response.text(`Created edge: ${args.type} from ${args.sourceViewId} to ${args.targetViewId}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to create edge: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("update_element", "Set a property on an existing element. Requires staruml-mcp-extension.", {
        id: z.string().describe("Element _id"),
        field: z.string().describe("Field name (e.g. 'name', 'isAbstract', 'visibility')"),
        value: z.any().describe("New value"),
    }, async (args) => {
        try {
            await api.updateElement(args);
            return response.text(`Updated ${args.id}: ${args.field} = ${JSON.stringify(args.value)}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to update element: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("delete_element", "Delete an element by its ID. Requires staruml-mcp-extension.", {
        id: z.string().describe("Element _id to delete"),
    }, async (args) => {
        try {
            await api.deleteElement(args.id);
            return response.text(`Deleted element: ${args.id}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to delete element: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("get_element_by_id", "Get details of a specific element by its ID. Requires staruml-mcp-extension.", {
        id: z.string().describe("Element _id"),
    }, async (args) => {
        try {
            const data = await api.getElementById(args.id);
            return response.text(`Element: ${JSON.stringify(data)}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to get element: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("find_elements", "Search for elements by name or type. Requires staruml-mcp-extension.", {
        query: z.string().optional().describe("Search keyword"),
        type: z.string().optional().describe("Filter by type (e.g. 'UMLClass', 'UMLInterface')"),
    }, async (args) => {
        try {
            const data = await api.findElements(args);
            return response.text(`Found elements: ${JSON.stringify(data)}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to find elements: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    server.tool("update_class", "Update a UML class: rename, set abstract, add/remove attributes and methods, move view. Requires staruml-mcp-extension.", {
        modelId: z.string().describe("The class model _id to update"),
        viewId: z.string().optional().describe("The view _id (needed for position changes)"),
        name: z.string().optional().describe("New class name"),
        isAbstract: z.boolean().optional().describe("Set abstract flag"),
        visibility: z.string().optional().describe("Visibility: public, private, protected, package"),
        addAttributes: z.array(z.string()).optional().describe("Attribute names to add"),
        removeAttributes: z.array(z.string()).optional().describe("Attribute names to remove"),
        addMethods: z.array(z.string()).optional().describe("Method names to add"),
        removeMethods: z.array(z.string()).optional().describe("Method names to remove"),
        left: z.number().optional().describe("New left X coordinate"),
        top: z.number().optional().describe("New top Y coordinate"),
    }, async (args) => {
        try {
            const changes = [];
            // Update model properties
            if (args.name !== undefined) {
                await api.updateElement({ id: args.modelId, field: "name", value: args.name });
                changes.push(`name → "${args.name}"`);
            }
            if (args.isAbstract !== undefined) {
                await api.updateElement({ id: args.modelId, field: "isAbstract", value: args.isAbstract });
                changes.push(`isAbstract → ${args.isAbstract}`);
            }
            if (args.visibility !== undefined) {
                await api.updateElement({ id: args.modelId, field: "visibility", value: args.visibility });
                changes.push(`visibility → ${args.visibility}`);
            }
            // Add attributes
            if (args.addAttributes?.length) {
                for (const attrName of args.addAttributes) {
                    try {
                        await api.callExt("/create_element", { type: "UMLAttribute", parentId: args.modelId, name: attrName });
                        changes.push(`+attr "${attrName}"`);
                    }
                    catch {
                        changes.push(`+attr "${attrName}" FAILED`);
                    }
                }
            }
            // Add methods
            if (args.addMethods?.length) {
                for (const methodName of args.addMethods) {
                    try {
                        await api.callExt("/create_element", { type: "UMLOperation", parentId: args.modelId, name: methodName });
                        changes.push(`+method "${methodName}"`);
                    }
                    catch {
                        changes.push(`+method "${methodName}" FAILED`);
                    }
                }
            }
            // Remove attributes: find by name under the class, then delete
            if (args.removeAttributes?.length) {
                const detail = await api.getElementById(args.modelId);
                const owned = (detail?.ownedElements ?? []);
                for (const attrName of args.removeAttributes) {
                    const target = owned.find((o) => o.name === attrName && !o.name?.endsWith("View"));
                    if (target?._id) {
                        try {
                            await api.deleteElement(target._id);
                            changes.push(`-attr "${attrName}"`);
                        }
                        catch {
                            changes.push(`-attr "${attrName}" FAILED`);
                        }
                    }
                    else {
                        changes.push(`-attr "${attrName}" NOT FOUND`);
                    }
                }
            }
            // Remove methods
            if (args.removeMethods?.length) {
                const detail = await api.getElementById(args.modelId);
                const owned = (detail?.ownedElements ?? []);
                for (const methodName of args.removeMethods) {
                    const target = owned.find((o) => o.name === methodName && !o.name?.endsWith("View"));
                    if (target?._id) {
                        try {
                            await api.deleteElement(target._id);
                            changes.push(`-method "${methodName}"`);
                        }
                        catch {
                            changes.push(`-method "${methodName}" FAILED`);
                        }
                    }
                    else {
                        changes.push(`-method "${methodName}" NOT FOUND`);
                    }
                }
            }
            // Move view
            if (args.viewId && (args.left !== undefined || args.top !== undefined)) {
                const moveArgs = { id: args.viewId };
                if (args.left !== undefined)
                    moveArgs.left = args.left;
                if (args.top !== undefined)
                    moveArgs.top = args.top;
                await api.updateView(moveArgs);
                changes.push(`move to (${moveArgs.left ?? "?"}, ${moveArgs.top ?? "?"})`);
            }
            if (changes.length === 0) {
                return response.text("No changes requested. Specify at least one field to update.");
            }
            return response.text(`Updated class ${args.modelId}:\n  ${changes.join("\n  ")}`);
        }
        catch (error) {
            return response.error(JsonRpcErrorCode.InternalError, `Failed to update class: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}

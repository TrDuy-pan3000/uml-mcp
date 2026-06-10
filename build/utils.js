import fetch from "node-fetch";
const API_HOST = "http://localhost";
let _apiPort = 58321;
let _extPort = 58322;
let _extAvailable = null;
export function setPorts(apiPort, extPort) {
    _apiPort = apiPort;
    _extPort = extPort;
    _extAvailable = null; // force re-detect
}
/** Check extension availability (re-checks whenever extension was previously unavailable). */
export async function isExtAvailable() {
    if (_extAvailable === null || _extAvailable === false) {
        await detectExtensions();
    }
    return _extAvailable === true;
}
export function getApiPort() {
    return _apiPort;
}
export function getExtPort() {
    return _extPort;
}
async function api(port, slug, args = {}) {
    const res = await fetch(`${API_HOST}:${port}${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
    });
    const text = await res.text();
    if (!res.ok) {
        // Try to extract error message from response body
        try {
            const errBody = JSON.parse(text);
            throw new Error(errBody.error || `${res.status} ${res.statusText}`);
        }
        catch {
            throw new Error(`${res.status} ${res.statusText}`);
        }
    }
    const json = JSON.parse(text);
    if (!json.success) {
        throw new Error(json.error || "Unknown error");
    }
    return json.data;
}
export async function callBuiltIn(slug, args = {}) {
    return api(_apiPort, slug, args);
}
export async function callExt(slug, args = {}) {
    return api(_extPort, slug, args);
}
/** GET request (used for extension health check). */
async function apiGet(port, slug) {
    const res = await fetch(`${API_HOST}:${port}${slug}`, { method: "GET" });
    if (!res.ok) {
        throw new Error(`API error (GET ${slug}): ${res.status} ${res.statusText}`);
    }
    return res.json();
}
export async function detectExtensions() {
    const result = { builtIn: false, extension: false, extensionVersion: undefined };
    try {
        await api(_apiPort, "/get_all_diagrams_info", {});
        result.builtIn = true;
    }
    catch {
        // built-in API not available
    }
    try {
        const info = await apiGet(_extPort, "/");
        result.extension = true;
        result.extensionVersion = info?.version;
        _extAvailable = true;
    }
    catch {
        _extAvailable = false;
    }
    return result;
}
/** Create a model element with its visual view on a diagram (requires extension). */
export async function createElementWithView(args) {
    const raw = await callExt("/create_element_with_view", args);
    return raw;
}
/** Create a typed edge between two views (requires extension). */
export async function createEdgeWithView(args) {
    return callExt("/create_edge_with_view", args);
}
/** Update a property on an existing element (requires extension). */
export async function updateElement(args) {
    return callExt("/update_element", args);
}
/** Get all diagrams info (built-in API). */
export async function getAllDiagramsInfo() {
    return callBuiltIn("/get_all_diagrams_info", {});
}
/** Get current diagram info (built-in API). */
export async function getCurrentDiagramInfo() {
    return callBuiltIn("/get_current_diagram_info", {});
}
/** Get diagram image (built-in API). */
export async function getDiagramImage(diagramId) {
    return callBuiltIn("/get_diagram_image_by_id", { diagramId });
}
/** Apply auto-layout via built-in API. */
export async function layoutDiagram(args) {
    return callBuiltIn("/layout_diagram", args);
}
/** Find elements by query (requires extension). Maps `query` to `name` for extension handler. */
export async function findElements(args) {
    return callExt("/find_elements", { type: args.type, name: args.query });
}
/** List all views on a diagram (requires extension). */
export async function getDiagramViews(diagramId) {
    return callExt("/get_diagram_views", { diagramId });
}
/** Get complete diagram summary with all views and element details (requires extension). */
export async function getDiagramSummary(diagramId) {
    return callExt("/get_diagram_summary", { diagramId });
}
/** Update a view's position/size/style (requires extension). */
export async function updateView(args) {
    return callExt("/update_view", args);
}
/** Route edge with rectilinear right-angle waypoints (requires extension). */
export async function routeEdge(edgeViewId) {
    try {
        await callExt("/route_edge", { edgeViewId });
    }
    catch {
        // Non-critical — edge still works with default style
    }
}
/** Route ALL edges on a diagram with rectilinear waypoints (requires extension). */
export async function routeDiagramEdges(diagramId) {
    return callExt("/route_diagram_edges", { diagramId });
}
/** Align views (requires extension). */
export async function alignViews(args) {
    return callExt("/align_views", args);
}
/** Get project info (requires extension). */
export async function getProjectInfo() {
    return callExt("/get_project_info", {});
}
/** Save project (requires extension). */
export async function saveProject(filePath) {
    return callExt("/save_project", { filePath });
}
/** Open project (requires extension). */
export async function openProject(filePath) {
    return callExt("/open_project", { filePath });
}
/** New project (requires extension). */
export async function newProject() {
    return callExt("/new_project", {});
}
/** Execute built-in command (requires extension). Extension expects { id, args? }. */
export async function executeCommand(commandId) {
    return callExt("/execute_command", { id: commandId });
}
/** List all built-in commands (requires extension). */
export async function getAllCommands() {
    return callExt("/get_all_commands", {});
}
/** Get element by ID (requires extension). */
export async function getElementById(id) {
    return callExt("/get_element_by_id", { id });
}
/** Delete element (requires extension). */
export async function deleteElement(id) {
    return callExt("/delete_element", { id });
}

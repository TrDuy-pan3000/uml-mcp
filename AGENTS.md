## Learned User Preferences

- Pin `astral-sh/setup-uv` in GitHub Actions to a full release tag (for example `v8.1.0`) or an explicit commit SHA; do not use a bare `@v8` ref, because that action is not published as a floating major tag and Actions fails to resolve it.
- For the root `README.md`, prefer compact markdown tables for reference-style blocks when improving scanability.
- This repo is primarily the **StarUML MCP Server** (TypeScript). Python UML-MCP source has been removed.

## Learned Workspace Facts

- TypeScript project: `npm run build` compiles `src/` to `build/` (NodeNext ESM).
- Tests use **vitest**: `npm test` runs all tests in `tests/`.
- Key dependencies: `@modelcontextprotocol/sdk`, `dagre` (layout engine), `node-fetch`, `zod`.
- StarUML API defaults: built-in on port 58321, extension on port 58322.
- `staruml-mcp-extension` is recommended for full features (position control, CRUD).
- Mermaid classDiagram parser supports: inheritance, association, dependency, realization, aggregation, composition.
- Dagre layout is computed server-side before sending positions to StarUML.
- CI runs on Node 20 and 22 via GitHub Actions.

## View creation limitation & workaround

View-creation APIs (`factory.createViewOf`, `factory.createModelAndView`, `engine.addModelAndView`) do NOT work from the extension's main process (they require the renderer process). The only way to create elements WITH views on a diagram is via the built-in API's `/generate_diagram` endpoint (port 58321), which creates a complete diagram from Mermaid code.

**For adding elements to existing diagrams**, the `add_to_diagram` tool works around this by:
1. Reading the current diagram state via `/get_diagram_summary`
2. Building a Mermaid representation of existing elements
3. Parsing the new Mermaid code
4. Merging (deduplicating by name)
5. Computing dagre layout for the full set
6. Calling `/generate_diagram` to create a new diagram with ALL elements
7. Applying positions + routing via extension
8. Deleting the old diagram

Existing-element editing (rename, move, add/remove attributes/methods, change position, route edges) works directly via extension endpoints (`/update_element`, `/update_view`, `/route_diagram_edges`). Only ADDING new elements requires the rebuild approach.

## Extension endpoint map (port 58322, 25 endpoints)

- `/get_all_commands`, `/execute_command`
- `/get_project_info`, `/save_project`, `/save_project_as`, `/new_project`, `/open_project`
- `/get_element_by_id`, `/find_elements`, `/create_element`, `/update_element`, `/delete_element`
- `/create_element_with_view`, `/create_edge_with_view`, `/create_view`
- `/create_diagram`, `/switch_diagram`, `/close_diagram`
- `/get_diagram_views`, `/get_diagram_summary`, `/update_view`, `/route_edge`, `/route_diagram_edges`, `/align_views`
- `/debug`

Key: `create_element` (model only) and `create_element_with_view` / `create_view` (model+view or view only) may fail to produce a view in the extension process. Use the rebuild approach instead.

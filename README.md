[![smithery badge](https://smithery.ai/badge/@staruml/staruml-mcp-server)](https://smithery.ai/server/@staruml/staruml-mcp-server)

# StarUML MCP Server

[StarUML](https://staruml.io) is a sophisticated modeler for agile and concise modeling. **StarUML MCP Server** enables AI agents (Claude, Cursor, opencode, VS Code Copilot, etc.) to create and edit UML diagrams in StarUML via MCP prompts.

## Features

- **Generate diagrams** from Mermaid syntax with automatic layout (no overlap)
- **Precise positioning** — elements are placed using dagre layout algorithm
- **Element CRUD** — create, read, update, delete elements and views
- **Position control** — move, resize, align elements on the canvas
- **Project management** — save, open, create projects
- **Auto-layout** with configurable direction and spacing

## Prerequisites

- [StarUML](https://staruml.io/) `v7.0.0` or higher with API Server enabled (default port: 58321)
- [Node.js](https://nodejs.org/) `v20` or higher
- **(Recommended)** [staruml-mcp-extension](https://github.com/ezrabrilliant/staruml-mcp-extension) — enables precise positioning and element CRUD tools

### Install Extension (Recommended)

In StarUML: **Tools → Extension Manager → Install From URL** → paste:
```
https://github.com/ezrabrilliant/staruml-mcp-extension
```

## Setup

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "staruml-mcp-server": {
      "command": "npx",
      "args": ["-y", "staruml-mcp-server"]
    }
  }
}
```

### Cursor / opencode / VS Code

Use `--api-port` and `--ext-port` to match your StarUML configuration:

```json
{
  "mcpServers": {
    "staruml-mcp-server": {
      "command": "node",
      "args": ["<path>/build/index.js", "--api-port=58321", "--ext-port=58322"]
    }
  }
}
```

## Available Tools

### Diagram Generation

| Tool | Description |
|---|---|
| `generate_diagram` | Generate a diagram from Mermaid syntax with automatic dagre layout. Supports classDiagram. Optionally auto-arranges elements. |
| `apply_layout` | Apply auto-layout to the current diagram (direction, spacing configurable). |

### Element Tools _(requires extension)_

| Tool | Description |
|---|---|
| `create_element` | Create a UML model element with visual view at specified (x,y) position |
| `create_edge` | Connect two views with a typed relationship edge |
| `update_element` | Set a property on an existing element (name, isAbstract, etc.) |
| `delete_element` | Delete an element by ID |
| `get_element_by_id` | Get details of a specific element |
| `find_elements` | Search elements by name or type |

### View Tools _(requires extension)_

| Tool | Description |
|---|---|
| `get_diagram_views` | List all visual views with positions (left, top, width, height) |
| `move_view` | Move a view to specific (x, y) coordinates |
| `resize_view` | Resize a view (width, height) |
| `align_views` | Align multiple views (left, right, top, bottom, center, middle) |
| `arrange_elements` | Rearrange elements using dagre layout algorithm |

### Info Tools

| Tool | Description |
|---|---|
| `get_all_diagrams_info` | List all diagrams in the current project |
| `get_current_diagram_info` | Get info of the active diagram |
| `get_diagram_image_by_id` | Export a diagram as PNG |
| `get_project_info` | Get current project details |
| `list_commands` | List all available StarUML commands |

### Project Tools _(requires extension)_

| Tool | Description |
|---|---|
| `save_project` | Save the current project |
| `open_project` | Open a .mdj project file |
| `new_project` | Create a new project |
| `execute_command` | Execute any built-in StarUML command |

## CLI Options

| Option | Default | Description |
|---|---|---|
| `--api-port=<port>` | `58321` | StarUML built-in API server port |
| `--ext-port=<port>` | `58322` | staruml-mcp-extension port |

## Example Prompts

- _"Create a class diagram for a bookstore in StarUML"_
- _"Generate a class diagram with Customer, Order, and Product classes, where Customer has orders and Order contains Products"_
- _"Move the Customer class to the top-left corner of the diagram"_
- _"Align all the class boxes to the left"_
- _"Save the current project"_

## Dev

1. Clone this repository
2. `npm install`
3. `npm run build`
4. Configure your MCP client to point to `build/index.js`

```bash
npm run dev     # watch mode
npm test        # run tests
npm run build   # compile TypeScript
```

import { MermaidDiagram, MermaidEdge, MermaidNode, EdgeType } from "./types.js";

const EDGE_PATTERNS: [RegExp, EdgeType][] = [
  [/(\w+)\s*<\|--\s*(\w+)/, "inheritance"],
  [/(\w+)\s*\.\.\|>\s*(\w+)/, "realization"],
  [/(\w+)\s*-->\s*(\w+)/, "association"],
  [/(\w+)\s*\.\.>\s*(\w+)/, "dependency"],
  [/(\w+)\s*o--\s*(\w+)/, "aggregation"],
  [/(\w+)\s*\*--\s*(\w+)/, "composition"],
];

const STEREOTYPE_PATTERN = /<<(\w+)>>/;

export function parseMermaid(code: string): MermaidDiagram {
  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];

  const lines = code.split("\n");
  let currentClass: string | null = null;
  let currentAttrs: string[] = [];
  let currentMethods: string[] = [];
  let currentType: "class" | "interface" | "abstract" | "enum" = "class";

  function flushClass() {
    if (currentClass && !nodes.has(currentClass)) {
      nodes.set(currentClass, {
        id: currentClass,
        label: currentClass,
        type: currentType,
        attributes: currentAttrs,
        methods: currentMethods,
      });
    }
    currentClass = null;
    currentAttrs = [];
    currentMethods = [];
    currentType = "class";
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "classDiagram") continue;

    if (line === "}") {
      flushClass();
      continue;
    }

    // Try edge patterns first (with optional label)
    let matched = false;
    for (const [pattern, edgeType] of EDGE_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        matched = true;
        const source = m[1].trim();
        const target = m[2].trim();
        ensureNode(nodes, source);
        ensureNode(nodes, target);

        // Check for label: ClassA --> ClassB : label
        const labelMatch = line.match(/:[\s]*(.+)/);
        edges.push({
          id: `edge-${edges.length}`,
          sourceId: source,
          targetId: target,
          type: edgeType,
          label: labelMatch ? labelMatch[1].trim() : undefined,
        });
        break;
      }
    }
    if (matched) continue;

    // Class declaration with optional stereotype: class ClassName or class <<stereotype>> ClassName
    const classDecl = line.match(/^class\s+(?:<<(\w+)>>\s+)?(\w+)/);
    if (classDecl) {
      flushClass();
      const className = classDecl[2];
      const stereotype = classDecl[1]; // may be undefined

      currentClass = className;
      if (stereotype) {
        const st = stereotype.toLowerCase();
        if (st === "interface") currentType = "interface";
        else if (st === "enum") currentType = "enum";
        else if (st === "abstract") currentType = "abstract";
      }

      // If the line has no brace, it's a single-line declaration
      if (!line.includes("{")) {
        flushClass();
      }
      continue;
    }

    // Multi-line class body
    if (currentClass) {
      if (line === "{" || line.startsWith("{")) continue;

      if (line.includes("(")) {
        currentMethods.push(line.replace(/[{}]/g, "").trim());
      } else if (line.length > 0) {
        currentAttrs.push(line.replace(/[{}]/g, "").trim());
      }
      continue;
    }
  }

  flushClass();

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

function ensureNode(nodes: Map<string, MermaidNode>, name: string) {
  if (!nodes.has(name)) {
    nodes.set(name, {
      id: name,
      label: name,
      type: "class",
      attributes: [],
      methods: [],
    });
  }
}

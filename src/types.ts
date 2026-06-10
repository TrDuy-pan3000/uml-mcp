import { z } from "zod";

// ─── API Response ────────────────────────────────────────
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// ─── Element / Model ────────────────────────────────────
export interface ElementInfo {
  _id: string;
  name: string;
  _type: string;
  parent?: { _id: string };
  ownedElements?: ElementInfo[];
}

// ─── View (visual representation on a diagram) ───────────
export interface ViewInfo {
  _id: string;
  _type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  model: { _id: string; name: string; _type: string };
}

// ─── Diagram ─────────────────────────────────────────────
export interface DiagramInfo {
  _id: string;
  name: string;
  type: string;
}

// ─── Create-element-with-view result ─────────────────────
export interface CreateViewResult {
  view: { _id: string; left: number; top: number; width: number; height: number };
  model: { _id: string; _type: string; name: string };
}

// ─── Mermaid parse result ────────────────────────────────
export interface MermaidNode {
  id: string;
  label: string;
  type: "class" | "interface" | "abstract" | "enum";
  attributes: string[];
  methods: string[];
}

export interface MermaidEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label?: string;
  sourceLabel?: string;
  targetLabel?: string;
}

export type EdgeType =
  | "inheritance"
  | "association"
  | "dependency"
  | "realization"
  | "aggregation"
  | "composition";

export interface MermaidDiagram {
  nodes: MermaidNode[];
  edges: MermaidEdge[];
}

// ─── Layout ──────────────────────────────────────────────
export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Map<string, LayoutPosition>;
}

// ─── Layout direction ────────────────────────────────────
export const LayoutDirection = {
  TB: "TB" as const,
  LR: "LR" as const,
  BT: "BT" as const,
  RL: "RL" as const,
  CUSTOM: "custom" as const,
} as const;
export type LayoutDirection = (typeof LayoutDirection)[keyof typeof LayoutDirection];

// ─── StarUML edge type mapping ───────────────────────────
export const STARUML_EDGE_TYPES: Record<EdgeType, string> = {
  inheritance: "UMLGeneralization",
  association: "UMLAssociation",
  dependency: "UMLDependency",
  realization: "UMLInterfaceRealization",
  aggregation: "UMLAggregation",
  composition: "UMLComposition",
};

export const STARUML_NODE_TYPES: Record<string, string> = {
  class: "UMLClass",
  interface: "UMLInterface",
  abstract: "UMLClass",
  enum: "UMLEnumeration",
};

// ─── Tool parameter schemas ──────────────────────────────
export const LayoutDirectionSchema = z
  .enum(["TB", "LR", "BT", "RL", "custom"])
  .optional()
  .default("TB") as z.ZodType<LayoutDirection>;

import { z } from "zod";
// ─── Layout direction ────────────────────────────────────
export const LayoutDirection = {
    TB: "TB",
    LR: "LR",
    BT: "BT",
    RL: "RL",
    CUSTOM: "custom",
};
// ─── StarUML edge type mapping ───────────────────────────
export const STARUML_EDGE_TYPES = {
    inheritance: "UMLGeneralization",
    association: "UMLAssociation",
    dependency: "UMLDependency",
    realization: "UMLInterfaceRealization",
    aggregation: "UMLAggregation",
    composition: "UMLComposition",
};
export const STARUML_NODE_TYPES = {
    class: "UMLClass",
    interface: "UMLInterface",
    abstract: "UMLClass",
    enum: "UMLEnumeration",
};
// ─── Tool parameter schemas ──────────────────────────────
export const LayoutDirectionSchema = z
    .enum(["TB", "LR", "BT", "RL", "custom"])
    .optional()
    .default("TB");

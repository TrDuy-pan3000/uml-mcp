import { describe, it, expect } from "vitest";
import { computeLayout } from "../src/layout.js";
import { parseMermaid } from "../src/mermaid-parser.js";

describe("computeLayout", () => {
  it("computes positions for two related nodes (TB)", () => {
    const code = `classDiagram
class Animal
class Dog
Animal <|-- Dog`;
    const mermaid = parseMermaid(code);
    const layout = computeLayout(mermaid, { direction: "TB" });

    expect(layout.positions.size).toBe(2);

    const animalPos = layout.positions.get("Animal");
    const dogPos = layout.positions.get("Dog");

    expect(animalPos).toBeDefined();
    expect(dogPos).toBeDefined();

    // In TB layout, parent (Animal) should be above child (Dog)
    expect(animalPos!.y).toBeLessThan(dogPos!.y);
  });

  it("computes positions for two related nodes (LR)", () => {
    const code = `classDiagram
class Animal
class Dog
Animal <|-- Dog`;
    const mermaid = parseMermaid(code);
    const layout = computeLayout(mermaid, { direction: "LR" });

    const animalPos = layout.positions.get("Animal");
    const dogPos = layout.positions.get("Dog");

    // In LR layout, parent should be to the left of child
    expect(animalPos!.x).toBeLessThan(dogPos!.x);
  });

  it("produces non-overlapping positions for multiple nodes", () => {
    const code = `classDiagram
class A
class B
class C
class D
A --> B
A --> C
B --> D
C --> D`;
    const mermaid = parseMermaid(code);
    const layout = computeLayout(mermaid);

    expect(layout.positions.size).toBe(4);

    // Check no overlaps
    const positions = Array.from(layout.positions.values());
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const noOverlap =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y;
        expect(noOverlap).toBe(true);
      }
    }
  });

  it("handles single node", () => {
    const code = `classDiagram
class Alone`;
    const mermaid = parseMermaid(code);
    const layout = computeLayout(mermaid);

    expect(layout.positions.size).toBe(1);
    const pos = layout.positions.get("Alone");
    expect(pos!.x).toBeGreaterThanOrEqual(0);
    expect(pos!.y).toBeGreaterThanOrEqual(0);
    expect(pos!.width).toBeGreaterThan(0);
    expect(pos!.height).toBeGreaterThan(0);
  });

  it("handles empty diagram", () => {
    const mermaid = { nodes: [], edges: [] };
    const layout = computeLayout(mermaid);
    expect(layout.positions.size).toBe(0);
  });
});

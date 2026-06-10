import { describe, it, expect } from "vitest";
import { parseMermaid } from "../src/mermaid-parser.js";

describe("parseMermaid", () => {
  it("parses a simple class with attributes and methods", () => {
    const code = `classDiagram
class Animal {
+name: string
+run(): void
}`;
    const result = parseMermaid(code);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe("Animal");
    expect(result.nodes[0].attributes).toContain("+name: string");
    expect(result.nodes[0].methods).toContain("+run(): void");
  });

  it("parses inheritance relationship", () => {
    const code = `classDiagram
class Animal
class Dog
Animal <|-- Dog`;
    const result = parseMermaid(code);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].sourceId).toBe("Animal");
    expect(result.edges[0].targetId).toBe("Dog");
    expect(result.edges[0].type).toBe("inheritance");
  });

  it("parses association relationship", () => {
    const code = `classDiagram
class Student
class School
Student --> School`;
    const result = parseMermaid(code);
    expect(result.edges[0].type).toBe("association");
  });

  it("parses dependency relationship", () => {
    const code = `classDiagram
class A
class B
A ..> B`;
    const result = parseMermaid(code);
    expect(result.edges[0].type).toBe("dependency");
  });

  it("parses realization relationship", () => {
    const code = `classDiagram
class Interface
class Impl
Interface ..|> Impl`;
    const result = parseMermaid(code);
    expect(result.edges[0].type).toBe("realization");
  });

  it("parses aggregation relationship", () => {
    const code = `classDiagram
class Team
class Player
Team o-- Player`;
    const result = parseMermaid(code);
    expect(result.edges[0].type).toBe("aggregation");
  });

  it("parses composition relationship", () => {
    const code = `classDiagram
class House
class Room
House *-- Room`;
    const result = parseMermaid(code);
    expect(result.edges[0].type).toBe("composition");
  });

  it("parses multiple classes with relationships", () => {
    const code = `classDiagram
class Animal
class Dog
class Cat
class Zoo
Animal <|-- Dog
Animal <|-- Cat
Zoo --> Animal`;
    const result = parseMermaid(code);
    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(3);
  });

  it("handles empty code", () => {
    const result = parseMermaid("");
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("handles classDiagram keyword only", () => {
    const result = parseMermaid("classDiagram");
    expect(result.nodes).toHaveLength(0);
  });

  it("parses interface stereotype", () => {
    const code = `classDiagram
class <<interface>> ISerializable
class JsonSerializer
ISerializable ..|> JsonSerializer`;
    const result = parseMermaid(code);
    expect(result.nodes).toHaveLength(2);
    const iface = result.nodes.find((n) => n.id === "ISerializable");
    expect(iface?.type).toBe("interface");
  });

  it("parses relationship with label", () => {
    const code = `classDiagram
class Person
class Address
Person --> Address : lives at`;
    const result = parseMermaid(code);
    expect(result.edges[0].label).toBe("lives at");
  });
});

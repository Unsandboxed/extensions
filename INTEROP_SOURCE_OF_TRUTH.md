# Unsandboxed Extension Interop Source Of Truth

This is the default mindset for building extensions that are interconnected but independent.

## Principles

1. Canonical Data Shape Per Concept
- Pick one canonical runtime shape for each shared concept.
- Example: a point is always `[x, y]`.
- Richer extensions can add better UX, but not a new core shape.

2. Consumer Owns Adapters
- If an extension consumes a composite value, it must accept primitive-friendly input forms internally.
- Users should never need another extension just to construct basic inputs.
- Adapters should prefer input coercion/parsing before adding new public helper blocks.

3. One Main Operation Block
- Do not split into with/without compatibility variants.
- Keep one operation block stable and make input coercion internal.

4. Capability Ownership (No Mirror Blocks)
- Each generic capability has a primary owner extension.
- Other extensions consume that capability but should not clone the owner's generic block surface.
- Example ownership:
  - `usbVectors` owns generic point/vector authoring and math blocks.
  - `usbPathfinding` owns pathfinding operations only.
- Pathfinding should accept vector-like values and primitive forms, but should not re-publish a generic vector constructor just because vectors can be absent.

5. Optional Enhancements Are Silent
- If another extension is present, unlock better ergonomics or richer outputs automatically.
- Never require users to configure dependencies or compatibility toggles.

6. Graceful Parsing
- Accept multiple equivalent input styles for the same conceptual value.
- For point-like inputs, parse in this order:
  1) native array `[x, y]`
  2) object `{x, y}`
  3) JSON string forms
  4) plain text fallback like `"x,y"`
- If parse fails, use a safe fallback value.

## Pathfinding Guidance

Pathfinding should be vector-friendly, but not vector-dependent.

- Keep pathfinding core blocks point-based using the canonical point shape.
- Accept primitive-compatible forms directly in pathfinding input coercion (for example `"x,y"` and JSON point strings).
- Avoid adding generic point constructor blocks that duplicate the vectors surface.
- If Vectors extension is loaded, users get better point authoring naturally.
- If Vectors extension is not loaded, users can still start using plain Scratch reporters/text forms with no extra dependency.

## Anti-Patterns

- Requiring extension A to be loaded before extension B is usable.
- Adding duplicate operation blocks for dependency variants (for example, separate "find path (vector)" and "find path (x/y)" blocks).
- Mirroring another extension's generic block catalog inside a domain extension.
- Making users reason about extension dependency graphs.

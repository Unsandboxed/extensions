# Extension Rethink Matrix (Simplicity First)

This is a practical plan to rethink every current Unsandboxed extension for the new requires/provides API, while keeping user-facing complexity low.

## Global Rules

1. One core operation surface per concept.
2. Prefer coercion/parsing over duplicate helper blocks.
3. Use `requires` only for functional dependency (execution/data compatibility).
4. Use `provides` only for cosmetic flyout sharing (no ownership transfer).
5. Provider-owned blocks keep provider opcode semantics.
6. Shared blocks should never require users to understand dependency graphs.
7. If an extension can work alone, it must still work well alone.

## Cross-Extension Standards

- Canonical point/vector value: array-like `[x, y]`.
- Canonical object/array payloads: JSON-compatible structures.
- Input coercion order for composite values:
  1) Native structure
  2) JSON text
  3) Human shorthand text
  4) Safe fallback
- Every extension should define a tiny "alone mode" that is still useful.

## Per-Extension Rethink

### usbArrays (Arrays)
- Keep: array creation/manipulation as canonical list-data utility.
- Simplify: reduce near-duplicate transforms; keep one obvious block per operation family.
- Interop:
  - `provides` candidate to `usbObjects` and `usbRuntime` for selected utility blocks.
  - Avoid providing broad generic catalog into domain extensions.

### usbObjects (Objects)
- Keep: JSON object build/query/update.
- Simplify: unify key-path operations around one path format.
- Interop:
  - `requires` optional array helpers from `usbArrays` if present.
  - `provides` a small object-inspection subset to `usbRuntime` and `usbTemporaryData` flyouts.

### usbVectors (Vectors)
- Keep: vector constructors and math as primary ownership.
- Simplify: one constructor shape and one math block per operation (no aliases).
- Interop:
  - Be the primary provider for point/vector authoring into path/tilemap style extensions.
  - Use `provides` to expose constructor(s) in consumer flyouts.

### usbPathfinding (Pathfinding)
- Keep: path generation/interpolation and obstacle control.
- Simplify: one path solve block, one interpolation block.
- Interop:
  - `requires` vector constructor(s) for ergonomic input.
  - Parse primitive forms when vectors are absent.
  - Optional `provides` from vectors should be cosmetic only.

### usbTilemap (Tilemap)
- Keep: tile world state, editing, camera-aware ops.
- Simplify: separate edit-time blocks from runtime query blocks clearly.
- Interop:
  - `requires` vectors for positions and directions.
  - Optionally `requires` pathfinding outputs for tile-world navigation utilities.

### usbPerlinNoise (Perlin Noise)
- Keep: deterministic noise and fractal layers.
- Simplify: one seed model and one coordinate convention.
- Interop:
  - `provides` basic noise sampler in flyouts for tilemap/pathfinding workflows.

### usbRuntime (Runtime)
- Keep: runtime toggles and project behavior configuration.
- Simplify: avoid exposing low-level toggles unless they are user-actionable.
- Interop:
  - Consume small utility blocks from arrays/objects via `provides` for setup flows.

### usbTemporaryData (Temporary Data)
- Keep: dynamic variable/key-value style storage.
- Simplify: one naming convention and one scope model.
- Interop:
  - `requires` objects/arrays support where useful, but keep plain string mode always.

### usbClonesPlus (Clones Plus)
- Keep: clone filtering, tags, and clone lifecycle controls.
- Simplify: collapse clone query variants into one query block with mode input.
- Interop:
  - `requires` sprite tags for richer filtering.
  - Optional `provides` clone filter helpers to sprite tags flyout.

### usbSpriteTags (Sprite Tags)
- Keep: add/remove/query tag ownership.
- Simplify: one tag format and one target resolution flow.
- Interop:
  - `provides` tag target menu block(s) to clones_plus/control_proxy.

### usbControlProxy (Control Proxy)
- Keep: execute stack/reporter logic in other targets.
- Simplify: one target selector pattern.
- Interop:
  - `requires` sprite tags/clones_plus for advanced target selection.

### usbIteration (Iteration)
- Keep: loop conveniences.
- Simplify: retire loops that duplicate native control too closely.
- Interop:
  - Minimal; should remain mostly standalone utility.

### usbLambda (Lambda)
- Keep: reporter-like lambda execution with arguments.
- Simplify: one invocation model and explicit capture semantics.
- Interop:
  - `requires` arrays/objects optionally for argument packs.

### usbMouse (Mouse)
- Keep: advanced mouse sensing and state.
- Simplify: one coordinate mode and one button model.
- Interop:
  - Optional `provides` low-level cursor vector block to vectors/pathfinding flyouts.

### usbTouch (Touch Control)
- Keep: touchscreen interaction blocks.
- Simplify: unify touch identity and phase semantics.
- Interop:
  - `provides` touch-point vector helper to vectors/pathfinding/tilemap flyouts.

### usbComments (Comment Blocks)
- Keep: script annotation utility.
- Simplify: minimal footprint; avoid becoming metadata framework.
- Interop:
  - None needed.

## Execution Plan

### Phase 1: Surface Cleanup
- Remove obvious duplicate blocks in each extension.
- Add/confirm canonical coercion paths for complex inputs.
- Keep behavior unchanged where possible.

### Phase 2: Interop Contracts
- Add explicit `requires` for true functional dependencies.
- Add conservative `provides` only for high-value ergonomic blocks.
- Validate no opcode ownership confusion.

### Phase 3: UX Consistency
- Normalize menus/defaults/text patterns.
- Verify flyout ordering and category color expectations.
- Ensure standalone usability remains strong.

### Phase 4: Hardening
- Add focused regression tests for requires/provides interactions.
- Project save/load checks for extension ID ownership consistency.

## Acceptance Criteria

- Every extension remains usable without other extensions.
- Interop improves speed/ergonomics but is optional.
- No duplicate operation families across ownership boundaries.
- No user-visible dependency configuration burden.
- Requires/provides behavior is deterministic across load order.

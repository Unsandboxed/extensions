# Require/Provide Usage

## require

Use `require` for blocks that are necessary for minimum functionality.

- If extension A cannot correctly run its core behavior without a block from extension B, A should `require` that block.
- In practice, `require` usually expresses capability-level dependency.

Examples:
- Pathfinding requiring vector construction support.
- Tilemap requiring vector construction support.

## provide

Use `provide` only when a block belongs better in another category, even though it depends on the parent extension's semantics.

- `provide` is not for broad sharing.
- `provide` is for narrow, category-fit handoff.
- Only provide specific blocks that are more discoverable in the target extension's toolbox category.

Example:
- Array/object iteration-style blocks can be provided into Iteration because they fit iteration workflows, while still relying on array/object semantics.

## Rule Of Thumb

If the consumer needs it to function, use `require`.
If the block is a better category fit elsewhere, use `provide`.

## Notes

- These guidelines can evolve as extension workflows evolve.
- Prefer clear ownership and creator usability over rigid formalism.

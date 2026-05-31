# Contributing extensions

For fundamental guidelines, see TurboWarp's gallery:
See: https://github.com/TurboWarp/extensions?tab=contributing-ov-file#contributing-extensions

## Additional guidelines
Unsandboxed's extension environment is designed such that extensions can remain independent without block/feature duplication.
- Extensions can **provide** blocks to other extensions that take advantage of its features.
- An extension can **require** blocks from other extensions that are needed for minimal functionality.
- Extensions can create their own modals and functional GUI tabs, if one is used. 
- APIs and extension classes are fully exposed and accessible so that extensions can remain compatible with eachother.

With this in mind, follow these rules:
- Ensure functions, variables and other necessities for the extension to work are contained within the extension class.
- Extensions must do **one thing** and do it well. If you want to add an extension that is similar to one that exists, consider contributing to **that** extension.

Your extension must be self-explanatory:
- Don't have dozens and dozens of blocks when you could replace them with a menu. Other environments like TurboWarp don't have easy access to creating custom modals; we do.
- Use language that someone who has only used TurboWarp will understand. If you need a glossary to use the extension, people will lose interest.

Extension categories that are not allowed:
- Utility extensions.
- "Category Expansion" extensions.
  - Clones Plus v2 is the only exception because it isn't a category and the name is solely for recognition.

When submitting an extension, we may rewrite it to follow strict formatting and semantic standards.

_Last updated: 31/05/2026_

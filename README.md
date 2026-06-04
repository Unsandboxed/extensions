# Unsandboxed Extensions

This repo contains the extensions used by Unsandboxed.

If you are new here, start with the quick setup below.

## Quick Setup

1. Install packages:

```bash
npm install
```

2. Build the extensions:

```bash
npm run build
```

3. Start the local dev server:

```bash
npm run dev
```

Extensions will be hosted at the URL:
`http://localhost:8001/`

That is enough to begin editing and testing extensions.

## Useful Commands

- `npm run dev` - run local server
- `npm run build` - build library into `dist/main.js`
- `npm test` - run tests

## Where Things Are

- `src/extensions/` - extension source folders
- `src/template/` - starter files for a new extension
- `src/index.js` - loads extension code, manifests, and icons
- `src/extensions.json` - generated extension ID map (auto-generated)
- `dist/main.js` - build output
- `development/server.js` - local development server

## Adding or Editing an Extension

Each extension folder should have:

- `index.js`
- `manifest.json`

Recommended:

- `icon.svg` (main thumbnail)
- `insetIcon.svg` (small icon shown on card)

Your `manifest.json` should include at least:

- `id` (must be unique)
- `name`
- `description`
- `insetIconColor` (hex color, for UI tinting)

## How Extension Modules Are Loaded

This repo supports TurboWarp-style extension files that look like this:

- wrapped in an IIFE: `(function (Scratch) { ... })(Scratch)`
- registering with: `Scratch.extensions.register(new MyExtension())`

During build, webpack rewrites these so they work like normal modules:

- the IIFE wrapper is removed
- `Scratch.extensions.register(new MyExtension())` is rewritten to `module.exports = MyExtension`

Why this matters:

- you can keep writing normal TurboWarp-style extension code
- this repo can still import and bundle each extension as a module

## Important Notes

- Do not manually edit `src/extensions.json`.
	- It is regenerated automatically during build.

- If your extension does not have an `icon.svg`, a fallback thumbnail is used and tinted with `insetIconColor`.

- If your extension is missing from the gallery, check:
	- `manifest.json` exists
	- `manifest.id` is unique
	- build output has no duplicate ID warning

## Troubleshooting

- Broken icon in gallery:
	- check that SVG/PNG is valid
	- rebuild (`npm run build`)
	- hard refresh browser cache

- Extension not loading:
	- confirm `manifest.id` matches what you expect
	- confirm your folder has `index.js`

## Status

Currently not accepting or reviewing new third-party extensions.

## License

See `LICENSE`.

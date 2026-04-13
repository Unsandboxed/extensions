const extensionsMap = require('./extensions.json');
const extensionList = Object.keys(extensionsMap);

const extensions = Object.create(null);
const manifests = Object.create(null);
const images = Object.create(null);

const iconContext = require.context('./extensions', true, /\.(svg|png)$/);
const manifestContext = require.context('./extensions', true, /manifest\.json$/);

// push extensions that are in a particular order to the top
const priority = [
    "Unsandboxed/arrays",
    "Unsandboxed/objects"
];

priority.concat(extensionList).forEach(extension => {
    if (extensions[extension]) {
        return;
    }

    const subPath = extensionsMap[extension] || extension;

    // Logic for extensions
    extensions[extension] = () => require(`./extensions/${subPath}/index.js`);

    // Information about the extension
    manifests[extension] = () => {
        const manifestPath = `./${subPath}/manifest.json`;
        
        if (manifestContext.keys().includes(manifestPath)) {
            return manifestContext(manifestPath);
        }
        
        // Fallback or error if a manifest is missing despite the build check
        throw new Error(`Manifest not found for ${extension} at ${manifestPath}`);
    };

    images[extension] = () => {
        const svgPath = `./${subPath}/icon.svg`;
        const pngPath = `./${subPath}/icon.png`;

        if (iconContext.keys().includes(svgPath)) {
            return iconContext(svgPath);
        } else if (iconContext.keys().includes(pngPath)) {
            return iconContext(pngPath);
        }

        return require('./unknown.svg');
    };
});

module.exports = {
    extensions,
    manifests,
    images
};
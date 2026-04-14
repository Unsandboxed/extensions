const extensionsMap = require('./extensions.json');
const extensionList = Object.keys(extensionsMap);

const extensions = Object.create(null);
const manifests = Object.create(null);
const images = Object.create(null);
const insetImages = Object.create(null);

const normalizeHexColor = color => {
    if (typeof color !== 'string') {
        return '#59c059';
    }

    const trimmed = color.trim();
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : '#59c059';
};

const iconContext = require.context('./extensions', true, /\.(svg|png)$/);
const manifestContext = require.context('./extensions', true, /manifest\.json$/);
const unknownThumbnailBuilderModule = require('!./recolor-thumbnail-loader.js!./unknown.svg?recolorModule');
const buildUnknownThumbnail = color => {
    if (typeof unknownThumbnailBuilderModule === 'function') {
        return unknownThumbnailBuilderModule(color);
    }

    if (unknownThumbnailBuilderModule && typeof unknownThumbnailBuilderModule.default === 'function') {
        return unknownThumbnailBuilderModule.default(color);
    }

    if (typeof unknownThumbnailBuilderModule === 'string') {
        return unknownThumbnailBuilderModule;
    }

    if (unknownThumbnailBuilderModule && typeof unknownThumbnailBuilderModule.default === 'string') {
        return unknownThumbnailBuilderModule.default;
    }

    return require('./unknown.svg');
};

// push extensions that are in a particular order to the top
const priority = [
    "Unsandboxed/arrays",
    "Unsandboxed/objects"
];

const resolvePriorityEntry = entry => {
    if (Object.prototype.hasOwnProperty.call(extensionsMap, entry)) {
        return entry;
    }

    const match = extensionList.find(id => extensionsMap[id] === entry);
    return match || null;
};

const orderedExtensions = priority
    .map(resolvePriorityEntry)
    .filter(Boolean)
    .concat(extensionList);

orderedExtensions.forEach(extensionId => {
    if (extensions[extensionId]) {
        return;
    }

    const subPath = extensionsMap[extensionId] || extensionId;

    // Logic for extensions
    extensions[extensionId] = () => require(`./extensions/${subPath}/index.js`);

    // Information about the extension
    manifests[extensionId] = () => {
        const manifestPath = `./${subPath}/manifest.json`;
        
        if (manifestContext.keys().includes(manifestPath)) {
            return manifestContext(manifestPath);
        }
        
        // Fallback or error if a manifest is missing despite the build check
        throw new Error(`Manifest not found for ${extensionId} at ${manifestPath}`);
    };

    images[extensionId] = () => {
        const svgPath = `./${subPath}/icon.svg`;
        const pngPath = `./${subPath}/icon.png`;

        if (iconContext.keys().includes(svgPath)) {
            return iconContext(svgPath);
        } else if (iconContext.keys().includes(pngPath)) {
            return iconContext(pngPath);
        }

        const manifest = manifests[extensionId]();
        const color = normalizeHexColor(manifest && manifest.insetIconColor);
        return buildUnknownThumbnail(color);
    };

    insetImages[extensionId] = () => {
        const manifest = manifests[extensionId]();
        const configuredInset = manifest && typeof manifest.insetIcon === 'string' ? manifest.insetIcon : null;

        if (configuredInset) {
            const configuredPath = `./${subPath}/${configuredInset}`;
            if (iconContext.keys().includes(configuredPath)) {
                return iconContext(configuredPath);
            }
        }

        const defaultInsetCandidates = [
            `./${subPath}/insetIcon.svg`,
            `./${subPath}/insetIcon.png`,
            `./${subPath}/inset.svg`,
            `./${subPath}/inset.png`,
            `./${subPath}/icon-small.svg`,
            `./${subPath}/icon-small.png`
        ];

        for (const candidate of defaultInsetCandidates) {
            if (iconContext.keys().includes(candidate)) {
                return iconContext(candidate);
            }
        }

        return null;
    };
});

module.exports = {
    extensions,
    manifests,
    images,
    insetImages
};
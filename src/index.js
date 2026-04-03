const extensionList = require('./extensions.json');

const extensions = Object.create(null);
const manifests = Object.create(null);
const images = Object.create(null);

const iconContext = require.context('./extensions', true, /\.(svg|png)$/);

// push extensions that are in a particular order to the top
const priority = [
    "arrays",
    "objects"
];

priority.concat(extensionList).forEach(extension => {
    if (extensions[extension]) {
        return;
    }

    // Logic for extensions
    extensions[extension] = () => require(`./extensions/${extension}/index`);

    // Information about the extension
    // TODO: https://github.com/Unsandboxed/extensions/issues/1
    manifests[extension] = () => require(`./extensions/${extension}/manifest.json`);

    images[extension] = () => {
        const svgPath = `./${extension}/icon.svg`;
        const pngPath = `./${extension}/icon.png`;

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
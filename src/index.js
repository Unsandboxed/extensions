const extensionList = require('./extensions.json');

const extensions = Object.create(null);
const manifests = Object.create(null);
const images = Object.create(null);

const iconContext = require.context('./extensions', true, /\.(svg|png)$/);

extensionList.forEach(extension => {
    // Logic for extensions
    extensions[extension] = () => require(`./extensions/${extension}/index`);

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
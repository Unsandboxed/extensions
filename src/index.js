const extensionList = require('./extensions.json');

const extensions = Object.create(null);

extensionList.forEach(extension => {
    extensions[extension] = () => require(`./extensions/${extension}/index`);    
})

module.exports = {
    extensions
};
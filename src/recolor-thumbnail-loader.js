/* eslint-disable import/no-commonjs */

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_COLOR = '#59c059';
const BASE_COLOR = /#0fbd8c/gi;

module.exports = function loader (source) {
    return `
const HEX_COLOR_RE = ${HEX_COLOR_RE};
const DEFAULT_COLOR = '${DEFAULT_COLOR}';
const BASE_COLOR = ${BASE_COLOR};
const original = ${JSON.stringify(source)};

const build = color => {
    const safeColor = HEX_COLOR_RE.test(color || '') ? color : DEFAULT_COLOR;
    const recolored = original.replace(BASE_COLOR, safeColor);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(recolored);
};

export default build;
`;
};

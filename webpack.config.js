const fs = require('fs');
const path = require('path');

const getManifestId = (folder) => {
    const manifestPath = path.join(folder, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;

    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.id || null;
    } catch (e) {
        console.error(`Malformed manifest: ${manifestPath}`);
        return null;
    }
};

const generateExtensionsList = () => {
    const root = path.resolve(__dirname, 'src/extensions');
    const out = path.resolve(__dirname, 'src/extensions.json');

    const walk = (dir, map = {}) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, map);
                continue;
            }

            if (entry.name !== 'index.js') continue;

            const folder = path.dirname(fullPath);
            const id = getManifestId(folder);

            if (!id) {
                console.warn(`Skipping "${path.basename(folder)}" - missing id in manifest.`);
                continue;
            }

            const rel = path.relative(root, folder).replace(/\\/g, '/');

            if (map[id]) {
                console.warn(`Duplicate ID "${id}" at "${rel}". Skipping.`);
                continue;
            }

            map[id] = rel;
        }
        return map;
    };

    try {
        fs.writeFileSync(out, JSON.stringify(walk(root), null, 2));
        console.log('Generated extensions.json');
    } catch (err) {
        console.error('Failed to generate extensions.json:', err);
    }
};

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src/index.js'),
    output: {
        libraryTarget: 'commonjs2',
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [path.resolve('src')],
                use: [
                    {
                        loader: 'babel-loader',
                        options: { presets: [['@babel/preset-env']] }
                    },
                    {
                        loader: 'string-replace-loader',
                        options: {
                            multiple: [
                                {
                                    // Strip IIFE wrapper for TurboWarp-style extensions
                                    search: /^[\s\S]*?\(function\s*\(Scratch\)\s*\{([\s\S]*)\}\)\(Scratch\);?[\s]*$/g,
                                    replace: '$1'
                                },
                                {
                                    // Replace Scratch.extensions.register with module export for TurboWarp-style extensions
                                    search: /Scratch\.extensions\.register\(new\s+(\w+)\(\)\);?/g,
                                    replace: 'module.exports = $1;'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.(png|svg)$/i,
                type: 'asset/inline'
            }
        ]
    },
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.beforeRun.tap('DirList', generateExtensionsList);
                compiler.hooks.watchRun.tap('DirList', generateExtensionsList);
            }
        }
    ]
};
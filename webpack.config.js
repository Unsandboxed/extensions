const fs = require('fs');
const path = require('path');

// Helper function to handle the logic
const generateExtensionsList = () => {
    const dirPath = path.resolve(__dirname, 'src/extensions');
    const outputPath = path.resolve(__dirname, 'src/extensions.json');

    try {
        // Filter for directories only
        const folders = fs.readdirSync(dirPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        fs.writeFileSync(outputPath, JSON.stringify(folders, null, 2));
        console.log('Successfully generated src/extensions.json');
    } catch (err) {
        console.error('Error generating extensions.json:', err);
    }
};

const base = {
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
                include: [
                    path.resolve('src')
                ],
                test: /\.js$/,
                include: [path.resolve('src')],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [['@babel/preset-env']]
                        }
                    },
                    {
                        loader: 'string-replace-loader',
                        options: {
                            multiple: [
                                // Some legacy extensions use an IIFE to wrap the entire extension, which we need to remove
                                // to work with our module system
                                {
                                    search: /^[\s\S]*?\(function\s*\(Scratch\)\s*\{([\s\S]*)\}\)\(Scratch\);?[\s]*$/g,
                                    replace: '$1'
                                },
                                // Some legacy extensions register themselves by calling Scratch.extensions.register with 
                                // a new instance of the extension class, which we need to change to export the class instead
                                {
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
                // Generate the file before the build starts
                compiler.hooks.beforeRun.tap('DirectoryListPlugin', generateExtensionsList);
                // Generate the file again if folders change during watch mode
                compiler.hooks.watchRun.tap('DirectoryListPlugin', generateExtensionsList);
            }
        }
    ]
};

module.exports = base;
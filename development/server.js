const fs = require('fs');
const express = require('express');
const pathUtil = require('path');
const webpack = require('webpack');

const app = express();
app.set('strict routing', true);
app.set('x-powered-by', false);

const root = pathUtil.join(__dirname, '..', '/src/');
const buildCacheDir = pathUtil.join(__dirname, '..', '.dev-webpack-cache');

if (!fs.existsSync(buildCacheDir)) {
  fs.mkdirSync(buildCacheDir, {recursive: true});
}

const bundleExtensionForDev = entryPath => new Promise((resolve, reject) => {
  const outputFilename = `bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.js`;
  const compiler = webpack({
    mode: 'development',
    devtool: 'cheap-module-source-map',
    target: 'web',
    entry: entryPath,
    output: {
      path: buildCacheDir,
      filename: outputFilename
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: [pathUtil.resolve(__dirname, '..', 'src')],
          use: [
            {
              loader: 'babel-loader',
              options: {presets: [['@babel/preset-env']]}
            }
          ]
        },
        {
          test: /\.(png|svg)$/i,
          type: 'asset/inline'
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.json']
    }
  });

  compiler.run((err, stats) => {
    compiler.close(() => {});

    if (err) {
      reject(err);
      return;
    }

    if (!stats || stats.hasErrors()) {
      const details = stats ? stats.toString({all: false, errors: true}) : 'No webpack stats available';
      reject(new Error(details));
      return;
    }

    const outputPath = pathUtil.join(buildCacheDir, outputFilename);
    fs.readFile(outputPath, 'utf8', (readErr, source) => {
      fs.unlink(outputPath, () => {});
      if (readErr) {
        reject(readErr);
        return;
      }
      resolve(source);
    });
  });
});

app.use((req, res, next) => {
  // If we don't tell the browser not to cache files, it does by default, and people will get confused when
  // script changes aren't being applied if they don't do a reload without cache.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  // Prevent browser from trying to guess file types.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // We don't want this site to be embedded in frames.
  res.setHeader('X-Frame-Options', 'DENY');

  // No need to leak referer headers.
  res.setHeader('Referrer-Policy', 'no-referrer');

  // We want all resources used by the website to be local.
  // This CSP does *not* apply to the extensions, just the website.
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:");

  next();
});

app.get('/extensions/*/index.js', async (req, res, next) => {
  try {
    const relativePath = req.path.replace(/^\/+/, '');
    const entryPath = pathUtil.resolve(root, relativePath);

    if (!entryPath.startsWith(pathUtil.resolve(root))) {
      res.status(400).type('text/plain').send('Invalid extension path');
      return;
    }

    if (!fs.existsSync(entryPath)) {
      next();
      return;
    }

    const bundled = await bundleExtensionForDev(entryPath);
    res.type('application/javascript').send(bundled);
  } catch (error) {
    res.status(500).type('text/plain').send(
      `Failed to bundle extension for dev server:\n${error && error.message ? error.message : String(error)}`
    );
  }
});

app.use(express.static(root));

app.use((req, res) => {
  res.contentType('text/plain');
  res.status(404);
  res.send('404 Not Found');
});

let clients = [];
app.get('/reload-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    clients.push(res);
    req.on('close', () => clients = clients.filter(c => c !== res));
});

// Watch the dist folder for changes
const distPath = pathUtil.join(__dirname, '..', 'dist/main.js');
fs.watch(distPath, () => {
    console.log('File changed, notifying browser...');
    clients.forEach(res => res.write('data: reload\n\n'));
});

// The port the server runs on matters. The editor only treats port 8000 and 8001 as unsandboxed.
const PORT = 8001;
app.listen(8001, () => {
  console.log(`Development server is ready on http://localhost:${PORT}/`);
});
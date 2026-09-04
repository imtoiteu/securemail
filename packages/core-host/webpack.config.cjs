const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const DESKTOP = path.resolve(__dirname, '../../../mailvelope/src');
const DESKTOP_MODULES = path.resolve(__dirname, '../../../mailvelope/node_modules');
const SHIMS = path.resolve(__dirname, 'src/shims');

// Swap the four Chrome-bound desktop modules for mobile shims.
// Matching is on the RESOLVED absolute path, so relative imports inside the
// desktop tree are caught wherever they come from.
const SWAPS = [
  ['lib/lib-mvelo.js', 'lib-mvelo.js'],
  ['lib/l10n.js', 'l10n.js'],
  ['lib/analytics.js', 'analytics.js'],
  ['lib/browser.runtime.js', 'browser.runtime.js']
].map(([desktopRel, shimFile]) => [path.join(DESKTOP, desktopRel), path.join(SHIMS, shimFile)]);

const swapPlugin = new webpack.NormalModuleReplacementPlugin(/.*/, resource => {
  if (!resource.request.startsWith('.')) return;
  const resolved = path.resolve(resource.context, resource.request);
  // Do NOT use path.extname() to decide whether to append '.js':
  // extname('lib/browser.runtime') is '.runtime', so the extension-less import
  // '../lib/browser.runtime' would never match and the gpgme shim would be
  // silently skipped. Test both spellings instead.
  const candidates = [resolved, `${resolved}.js`];
  const hit = SWAPS.find(([target]) => candidates.includes(target));
  if (hit) resource.request = hit[1];
});

module.exports = (env = {}) => {
  const isNode = env.target === 'node';
  return {
    mode: 'production',
    devtool: false,
    target: isNode ? 'node' : 'web',
    entry: path.resolve(__dirname, 'src/boot.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isNode ? 'core.node.cjs' : 'core.bundle.js',
      library: isNode ? {type: 'commonjs2'} : {type: 'window', name: 'SecureMailCore'},
      clean: false
    },
    resolve: {
      extensions: ['.js', '.json'],
      // Resolve third-party deps from the desktop's FROZEN node_modules so the
      // mobile core runs the exact same openpgp 5.11.3 and friends the desktop
      // extension was built and audited against. Read-only; nothing is written.
      modules: [DESKTOP_MODULES, 'node_modules']
    },
    module: {
      rules: [{
        test: /\.js$/,
        include: [path.resolve(__dirname, 'src'), DESKTOP],
        loader: 'babel-loader',
        options: {babelrc: false, configFile: false, presets: []}
      }]
    },
    plugins: [
      swapPlugin,
      ...(isNode ? [] : [new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/template.html'),
        filename: 'core.html',
        inject: 'body',
        minify: false
      })])
    ],
    performance: {hints: false},
    optimization: {minimize: !isNode}
  };
};

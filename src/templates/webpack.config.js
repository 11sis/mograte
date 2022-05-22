const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  context: __dirname,
  mode: 'development',// 'production',
  entry: [],
  devtool: 'source-map',
  optimization: {

  },
  resolve: {
    extensions: ['.ts'],
    symlinks: true,
    cacheWithContext: false,
  },
  output: {
    libraryTarget: 'commonjs',
    path: '',
    filename: '',
  },
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.(tsx?)$/,
        loader: 'ts-loader',
        exclude: [
          [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '.serverless'),
            path.resolve(__dirname, '.webpack'),
          ],
        ],
        options: {
          transpileOnly: true,
          // experimentalWatchApi: true,
        },
      },
    ],
  },
  plugins: [
    // new CopyPlugin({
    //   patterns: [
    //     { from: `src/${staticFilesDir}`, to: `dest/${staticFilesDir}` },
    //   ],
    // })
  ],
};

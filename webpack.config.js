const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/execute.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundler.js'
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js']
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules|\.test\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  stats: 'errors-only',
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: path.resolve(__dirname, 'reports/bundle-stats.json'),
        reportFilename: path.resolve(__dirname, 'reports/bundle-report.html'),
        excludeAssets: [/node_modules/],
      }),
  ]
};

const path = require("path");

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@writing-tools/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  rules: [{
    test: /\.tsx?$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
    exclude: /node_modules/
  }]
};

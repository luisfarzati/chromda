const path = require("path");
const nodeExternals = require("webpack-node-externals");
const slsw = require("serverless-webpack");

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  mode: "production",
  externals: [nodeExternals()],
  optimization: {
    minimize: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [["@babel/env", { targets: { node: "12" } }]],
              plugins: [
                "@babel/plugin-transform-runtime",
                "@babel/plugin-proposal-optional-chaining",
                "@babel/plugin-proposal-throw-expressions"
              ]
            }
          }
        ]
      }
    ]
  },
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js"
  }
};

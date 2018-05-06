import uglify from "rollup-plugin-uglify";

const config = (suffix, plugins) => ({
  input: "src/index.js",
  output: {
    format: "iife",
    name: "Legume",
    file: `build/legume${suffix}.js`
  },
  plugins
});

export default [
  config("", []),
  config(".min", [uglify()]),
  {
    input: "src/cli.js",
    output: {
      format: "cjs",
      file: "build/cli.js",
      banner: "#!/usr/bin/env node"
    }
  }
];

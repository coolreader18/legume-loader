import typescript from "rollup-plugin-typescript2";
import uglify from "rollup-plugin-uglify";

const config = (suffix = "", ...plugins) => ({
  input: "src/index.ts",
  output: {
    format: "iife",
    name: "Legume",
    file: `build/legume${suffix}.js`
  },
  plugins: [...plugins, typescript()]
});

export default [
  config(),
  config(".min", uglify())
  // ,{
  //   input: "src/cli.js",
  //   output: {
  //     format: "cjs",
  //     file: "build/cli.js",
  //     banner: "#!/usr/bin/env node"
  //   }
  // }
];

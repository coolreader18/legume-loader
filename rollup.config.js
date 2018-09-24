import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

const config = (suffix = "", ...plugins) => ({
  input: "src/index.ts",
  output: {
    format: "iife",
    name: "Legume",
    file: `build/legume${suffix}.js`,
    sourcemap: true
  },
  plugins: [...plugins, typescript()]
});

export default [
  config(),
  config(".min", terser({ mangle: true, sourcemap: true }))
  // ,{
  //   input: "src/cli.js",
  //   output: {
  //     format: "cjs",
  //     file: "build/cli.js",
  //     banner: "#!/usr/bin/env node"
  //   }
  // }
];

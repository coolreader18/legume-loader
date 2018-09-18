import foo from "npm:jquery";
console.log(
  "@require as keyword test, should return the jquery function:",
  foo
);
module.exports = "baz";

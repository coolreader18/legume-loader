/* @legume
 * @name other-module
 * @require npm:jquery as foo
 */
console.log(
  "@require as keyword test, should return the jquery function:",
  foo
);
module.exports = "baz";

/**
 * Test suite function
 * @param {string} name - The name of the test
 * @param {boolean} cond - What to test
 */
exports.test = (name, cond) => {
  if (cond) {
    console.log(`%cTest passed: ${name}`, "color: green;");
  } else {
    console.error(
      `%cTest failed: ${name}`,
      "background-color: black; color: red;"
    );
  }
};

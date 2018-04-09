/* @legume
 * @name script
 * @require dir/thing.js
 * @require npm:jquery@3.3 as xX_qUeRy_Xx
 * @require npm:js-cookie
 * @require other-module.js
 * @style github:mrkelly/lato@0.3.0/css/lato.min.css
 * @style style.css
 * @require gist:9d372c8604fb918a19e7d9647c863cb1/Replace-character.js
 * @require bkmrklet.js
 */
console.log(
  'stylesheet test, "hey" in the document should display in the lato font'
);
console.log(
  'gist loading test, should return "foofoofooeeeeebarbarbarooo" or something:',
  require("Replace-character")("hhhhheeeeeellllllllloooo", {
    h: "foo",
    l: "bar"
  })
);
require("thing");
var monster = require("js-cookie");
require("legume-jq");
console.log(
  'jquery plugin/caching and directory-relative test, should return "hey":',
  xX_qUeRy_Xx("body")
    .html("<h1>hey</h1>")
    .legumetest()
);
monster.set("foo", "bar");
console.log('a modules test, should return "bar":', monster.get("foo"));
console.log(
  'module.exports test, should return "baz":',
  require("other-module")
);
console.log('bookmarklet loading test. should print "hey" twice:');
require("worm");
require("worm");

import a from "./dir/thing.js";
import xX_qUeRy_Xx from "npm:jquery";
import otherModule from "other-module.js";
import monster from "npm:js-cookie";
import "github:mrkelly/lato@0.3.0/css/lato.min.css";
import "style.css";
//aaa import replaceCharacter from "gist:9d372c8604fb918a19e7d9647c863cb1/Replace-character.js";
import "bkmrklet.js";

console.log(
  'stylesheet test, "hey" in the document should display in the lato font'
);
// console.log(
//   'gist loading test, should return "foofoofooeeeeebarbarbarooo" or something:',
//   replaceCharacter("hhhhheeeeeellllllllloooo", {
//     h: "foo",
//     l: "bar"
//   })
// );

console.log(
  'jquery plugin/caching and directory-relative test, should return "hey":',
  xX_qUeRy_Xx("body")
    .html("<h1>hey</h1>")
    .legumetest()
);
monster.set("foo", "bar");
console.log('a modules test, should return "bar":', monster.get("foo"));
console.log('module.exports test, should return "baz":', otherModule);

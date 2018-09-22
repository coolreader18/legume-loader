import { test } from "./testing.js";

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

import $ from "npm:jquery";
import "./dir/thing.js";
test(
  "jquery plugin/caching and directory-relative imports",
  $("body")
    .html("<h1>hey</h1>")
    .legumetest() === "<h1>hey</h1>"
);

import monster from "npm:js-cookie";
monster.set("foo", "bar");
test("modules with browser apis", monster.get("foo") === "bar");

import otherModule from "other-module.js";
test("exports", otherModule === "baz");

import("./dir/dynamic.js").then(({ a }) => {
  test("dynamic imports", a === "loaded dynamically");
});

import "npm:jquery-ui-dist/jquery-ui.js";
test("amd modules and exports mutation", "draggable" in $.fn);

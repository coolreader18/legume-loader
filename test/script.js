import { test } from "./testing.js";

import "github:mrkelly/lato@0.3.0/css/lato.min.css";
import "style.css";
import "bkmrklet.js";

import replaceCharacter from "gist:coolreader18/9d372c8604fb918a19e7d9647c863cb1\
/Replace-character.js#132e839c670867ac3f3e72fcdf9f49f7ebda3be0";
test(
  "gist loading",
  replaceCharacter("hhhhheeeeeellllllllloooo", {
    h: "foo",
    l: "bar"
  }) === "foofoofoofoofooeeeeeebarbarbarbarbarbarbarbarbaroooo"
);

import $ from "npm:jquery";
import a from "./dir/thing.js";
test(
  "jquery plugin/caching and directory-relative imports",
  $("body")
    .html("<h1>hey</h1>")
    .legumetest() === "<h1>hey</h1>"
);
test("relative directory re-exports", a === 9);

test(
  "stylesheet import",
  getComputedStyle(document.querySelector("h1")).fontFamily
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

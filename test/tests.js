import { assert } from "npm:chai/chai.js";

import replaceCharacter from "gist:coolreader18/9d372c8604fb918a19e7d9647c863cb1\
/Replace-character.js#132e839c670867ac3f3e72fcdf9f49f7ebda3be0";
describe("gist loading", () => {
  it("should import gists properly", () => {
    assert.equal(
      replaceCharacter("hhhhheeeeeellllllllloooo", {
        h: "foo",
        l: "bar"
      }),
      "foofoofoofoofooeeeeeebarbarbarbarbarbarbarbarbaroooo"
    );
  });
});

import $ from "npm:jquery";
import a from "./dir/thing.js";
describe("jquery plugin/caching and directory-relative imports", () => {
  it("should have the method assigned to it from another script", () => {
    assert.equal(
      $("#css-test")
        .html("<h1>hey</h1>")
        .legumetest(),
      "<h1>hey</h1>"
    );
  });
});

describe("relative directory re-exports", () => {
  it("should have the correct export", () => {
    assert.equal(a, 9);
  });
});

import "github:mrkelly/lato@0.3.0/css/lato.min.css";
import "style.css";
describe("stylesheet import", t => {
  it("should have the correct font as specified in the stylesheet", () => {
    assert.equal(
      getComputedStyle(document.querySelector("h1")).fontFamily,
      "Lato"
    );
  });
});

import monster from "npm:js-cookie";
describe("modules with browser apis", t => {
  it("should work with cookies", () => {
    monster.set("foo", "bar");
    assert.equal(monster.get("foo"), "bar");
  });
});

import otherModule from "other-module.js";
describe("exports", () => {
  it("should have exported the correct thing", () => {
    assert.equal(otherModule, "baz");
  });
});

describe("dynamic imports", () => {
  it("should export the correct thing", async () => {
    const { a } = await import("./dir/dynamic.js");
    assert.equal(a, "loaded dynamically");
  });
});

import "npm:jquery-ui-dist/jquery-ui.js";
describe("amd modules and exports mutation", () => {
  it("should be the same export between cjs and amd", () => {
    assert("draggable" in $.fn);
  });
});

import { openWindowAsync } from "./win.html";
describe("html imports and windows", () => {
  let win;
  before("open the window", async () => {
    win = await openWindowAsync({ height: 100, width: 100 });
    assert(win);
  });
  it("should map stylesheet imports", () => {
    assert.equal(
      win.getComputedStyle(win.document.querySelector("h1")).color,
      "rgb(255, 0, 0)"
    );
  });
  it("should have the correct document", () => {
    assert(win.foundH1);
  });
  after("close the window", () => {
    win.close();
  });
});

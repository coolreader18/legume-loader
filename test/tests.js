import { assert } from "npm:chai/chai.js";

describe("dynamic imports", () => {
  it("should return the correct thing", async () => {
    const { a } = await import("./dir/dynamic.js");
    assert.equal(a, "loaded dynamically");
  });
});

describe("directory-relative imports/exports", () => {
  it("should resolve correctly", async () => {
    const { exp } = await import("./dir/rel-dir-export.js");
    assert.equal(exp, 154);
  });
  it("should resolve relatively in a directory", async () => {
    const { default: a } = await import("./dir/thing.js");
    assert.equal(a, 9);
  });
});

import $ from "npm:jquery";
import "./jq-plugin.js";
describe("export caching", () => {
  it("should keep the export between scripts", () => {
    assert.equal(
      $("#css-test")
        .html("<h1>hey</h1>")
        .legumetest(),
      "<h1>hey</h1>"
    );
  });
});

describe("stylesheet import", () => {
  let elem;
  before("import stylesheets", async () => {
    await import("github:mrkelly/lato@0.3.0/css/lato.min.css");
    const exp = await import("./style.css");
    elem = exp.default;
  });
  it("should have the correct font as specified in the stylesheet", () => {
    assert.equal(
      getComputedStyle(document.querySelector("h1")).fontFamily,
      "Lato"
    );
  });
  it("should return a style element", () => {
    assert(elem instanceof HTMLStyleElement);
  });
});

import monster from "npm:js-cookie";
describe("modules and browser apis", () => {
  it("should work with cookies", () => {
    monster.set("foo", "bar");
    assert.equal(monster.get("foo"), "bar");
  });
});

import "npm:jquery-ui-dist/jquery-ui.js";
describe("amd modules", () => {
  it("should be the same export between cjs and amd", () => {
    assert("draggable" in $.fn);
  });
});

describe("gist loading", () => {
  it("should import gists properly", async () => {
    const replaceCharacter = await Legume(
      "gist:coolreader18/9d372c8604fb918a19e7d9647c863cb1\
/Replace-character.js#132e839c670867ac3f3e72fcdf9f49f7ebda3be0"
    );
    assert.equal(
      replaceCharacter("hhello", { h: "foo", l: "bar" }),
      "foofooebarbaro"
    );
  });
  it("should work with hashless gists", async () => {
    const replaceCharacter = await Legume(
      "gist:coolreader18/9d372c8604fb918a19e7d9647c863cb1/Replace-character.js"
    );
    assert.equal(
      replaceCharacter("hhello", { h: "foo", l: "bar" }),
      "foofooebarbaro"
    );
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

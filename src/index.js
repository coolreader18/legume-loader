var version = "dev";
var scripts = {};
var cache = {};
import parseURL from "./parse-url.js";
function Legume(input, opts) {
  var opts = opts || {};
  var output = {};
  Object.assign(output, parseURL(input, opts.urlref, URL));
  var cached = Object.values(Legume.scripts).find(function(cur) {
    return (
      cur.url &&
      (cur.url.href == output.url.href ||
        cur.originalUrl.href == output.originalUrl.href)
    );
  });
  if (cached) {
    return Promise.resolve(require(cached.name));
  }
  var gist = output.gist;
  var prom = Promise.resolve(
    output.method == "gist" &&
      fetch(
        "https://api.github.com/gists/" +
          gist.id +
          (gist.hash ? "/" + gist.hash : "")
      )
        .then(function(res) {
          return res.json();
        })
        .then(function(res) {
          var gistfile = res.files[gist.file];
          if (!gistfile) throw new Error("File not in gist");
          output.url = new URL(gistfile.raw_url);
          output.url.hostname = "cdn.rawgit.com";
          if (gistfile.truncated)
            return fetch(output.url)
              .then(function(res) {
                return res.text();
              })
              .then(function(code) {
                output.code = code;
              });
          output.code = gistfile.content;
        })
  );
  return prom.then(function() {
    return Legume.scripts[output.name]
      ? require(output.name)
      : "code" in output
        ? Legume.process(output, opts.dontload)
        : fetch(output.url)
            .then(function(r) {
              return r.text();
            })
            .then(function(code) {
              output.code = code;
              return Legume.process(output, opts.dontload);
            });
  });
}
function style(stlurl, ref) {
  stlurl = parseURL(stlurl, ref, URL).url;
  document.head.appendChild(
    Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: stlurl
    })
  );
}
function process(scriptobj, dontload) {
  if (typeof scriptobj == "string") scriptobj = { code: scriptobj };
  scriptobj = parse(scriptobj);
  scriptobj.name = scriptobj.name || scriptobj.metadata.name;
  scriptobj.loads = 0;
  if (Legume.scripts[scriptobj.name])
    if (!dontload) {
      return require(scriptobj.name);
    } else return;
  Legume.scripts[scriptobj.name] = scriptobj;
  var ret = Promise.resolve(),
    requires = scriptobj.requires;
  if (requires.styles)
    requires.styles.forEach(function(cur) {
      Legume.style(cur);
    });
  if (requires.scripts)
    ret = ret.then(function() {
      return Promise.all(
        requires.scripts.reduce(function(arr, scr) {
          arr.push(
            Legume(scr.script, { dontload: true, urlref: scriptobj.url })
          );
          return arr;
        }, [])
      );
    });
  return ret.then(function() {
    if (!dontload) require(scriptobj.name);
  });
}
function require(mod) {
  mod =
    Legume.scripts[mod] ||
    Object.values(Legume.scripts).find(function(cur) {
      return cur.metadata && cur.metadata.name == mod;
    });
  if (!mod) {
    throw new Error("Module not loaded");
  }
  if (Legume.cache[mod.name] && !mod.bookmarklet) return Legume.cache[mod.name];
  mod.loads++;
  var module = {
    exports: {},
    children: mod.children,
    legumeInfo: {
      loads: mod.loads
    }
  };
  module.require = function require(mod) {
    this.children[mod] = Legume.scripts[mod];
    return require(mod);
  }.bind(module);
  var possargs = {
    module: module,
    require: module.require,
    exports: module.exports
  };
  var passargs = ["module", "exports"];
  var requires = mod.requires;
  if (requires.scripts) {
    requires.scripts.forEach(function(cur) {
      if (cur.as && !Object.keys(possargs).includes(cur.as)) {
        possargs[cur.as] = require(parseURL(cur.script, mod.url, URL).name);
        passargs.push(cur.as);
      }
    });
  }
  var code =
    mod.code +
    (mod.url || mod.name
      ? "\n//# sourceURL=" + (mod.url || "inline-legume:" + mod.name)
      : "");
  if (mod.legumescript) {
    Function.apply(null, passargs.concat([code])).apply(
      window,
      passargs.reduce(function(arr, cur) {
        arr.push(possargs[cur]);
        return arr;
      }, [])
    );
    Legume.cache[mod.name] = module.exports;
    return possargs.module.exports;
  } else {
    return eval.call(window, code);
  }
}
function parse(script) {
  var inBlock = false,
    cmt = {
      start: /^(\s*\/\*\s*@legume\s*)/i,
      end: /^\s*\*\//
    },
    md = {
      name: "",
      version: "",
      description: "",
      repository: "",
      author: [],
      email: "",
      url: "",
      license: "",
      bookmarklet: false,
      require: [],
      style: []
    },
    options = {},
    code = [],
    errors = [],
    processCmt = function(comment) {
      var match = comment.trim().match(/@([^\s]+)(?:\s+(.*))?$/);
      if (match) {
        var key = match[1],
          value = match[2];
        if (key !== undefined) {
          if (Array.isArray(md[key])) {
            options[key] = options[key] || [];
            options[key].push(value);
          } else if (typeof md[key] == "boolean") {
            try {
              options[key] = JSON.parse(value);
            } catch (e) {
              options[key] = true;
            }
          } else {
            options[key] = value;
          }
        } else {
          console.warn("ignoring invalid metadata option: `" + key + "}`");
        }
      }
    };
  script.code.match(/[^\r\n]+/g).forEach(function(line, i, lines) {
    if (cmt.end.test(line) && inBlock) {
      inBlock = false;
    } else if (inBlock) {
      processCmt(line);
    } else if (cmt.start.test(line)) {
      inBlock = true;
      script.legumescript = true;
    } else {
      code.push(line);
    }
    if (inBlock && i + 1 == lines.length) {
      errors.push("missing metdata block closing");
    }
  });
  var requires = {
    scripts: options.require,
    styles: options.style
  };
  delete options.script;
  delete options.style;
  if (requires.scripts)
    requires.scripts.forEach(function(cur, i) {
      var arr = cur.split(" ");
      var obj = {};
      for (var j = 1; j < arr.length; j += 2) {
        var temparr = arr.slice(j, j + 2);
        obj[temparr[0]] = temparr[1];
      }
      requires.scripts[i] = { script: arr[0], as: obj.as || null };
    });
  var moveds = ["bookmarklet"].reduce(function(obj, cur) {
    obj[cur] = options[cur];
    delete options[cur];
    return obj;
  }, {});
  return Object.assign(
    {
      metadata: options,
      code: code.join("\n"),
      errors: errors.length ? errors : null,
      requires
    },
    moveds,
    script
  );
}
var loadprom =
  entry && entry.getAttribute("data-legume-entry")
    ? Legume(entry.getAttribute("data-legume-entry"))
    : Promise.resolve();
Array.from(document.querySelectorAll("script[type='text/legume']")).reduce(
  function(prom, cur) {
    function processfn() {
      return Legume.process(cur.textContent);
    }
    if (cur.getAttribute("async") === null) {
      processfn();
    } else prom = prom.then(processfn);
    return prom;
  },
  loadprom
);
exports = Legume;
export { require, cache, scripts, process, style };

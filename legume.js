legumeload = function() {
  delete legumeload;
  var entry = document.querySelector("script[src*=legume]");
  var AsyncFunction;
  try {
    AsyncFunction = Object.getPrototypeOf(eval("async () => {}")).constructor;
  } catch (err) {}
  function processurl(inurl) {
    inurl = new URL(inurl);
    var methods = ["github", "npm"];
    for (var i = 0; i < methods.length; i++) {
      var cur = methods[i];
      if (inurl.protocol == cur + ":") {
        return (
          "https://cdn.jsdelivr.net/" +
          (cur == "github" ? "gh" : cur) +
          inurl.pathname
        );
      }
    }
    return inurl.href;
  }
  function load(inurl, msg) {
    inurl = processurl(inurl);
    var url;
    try {
      url = new URL(inurl);
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        url = new URL(inurl, location.href);
      }
    }
    return fetch(url)
      .then(function(r) {
        if (r.ok) {
          return r;
        } else {
          throw new Error(msg);
        }
      })
      .catch(alert);
  }
  var legume = {
    version: "dev",
    scripts: {},
    dir: {
      scripts: {
        update: function update() {
          var that = this;
          legume.json(scriptdirurl).then(function(json) {
            delete that.unloaded;
            return Object.assign(that, json);
          });
        },
        get: function get(name) {
          var obj = this[name];
          return obj.url.replace(/%VERSION/, obj.latest);
        },
        unloaded: true
      },
      styles: {
        update: function update() {
          var that = this;
          legume.json(styledirurl).then(function(json) {
            delete that.unloaded;
            return Object.assign(that, json);
          });
        },
        get: function get(name) {
          var obj = this[name];
          return obj.url.replace(/%VERSION/, obj.latest);
        },
        unloaded: true
      }
    },
    load: function load(input, opts) {
      if (typeof input == "string") {
        input = input.trim();
      }
      function legumestring(str) {
        var types = ["json", "text", "script"];
        for (var i = 0; i < types.length; i++) {
          var cur = types[i];
          if (str.startsWith(cur + ":")) {
            return legume[cur](str.replace(new RegExp(cur + ":"), "").trim());
          }
        }
        return legume.script(str);
      }
      if (typeof opts == "string") {
        switch (opts) {
          case "script":
            return legume.script(input);
          case "json":
            return legume.json(input);
          case "text":
            return legume.text(input);
          case "txtscript":
            return legume.process(input);
        }
      }
      if (typeof input == "string") {
        return legumestring(input);
      } else if (Array.isArray(input)) {
        var retarr = [];
        input.forEach(function(cur) {
          retarr.push(legumestring(cur));
        });
        return Promise.all(retarr);
      }
    },
    process: function process() {
      var args = Array.from(arguments);
      console.log(args);
      return Promise.resolve().then(function() {
        var parsed = parse.apply(null, args),
          meta = parsed.metadata,
          code = parsed.code,
          waitScript = new Promise(function(resolve) {
            if (!meta.script) {
              resolve();
            } else {
              var scripts = meta.script;
              loop(0);
              function loop(i) {
                return legume.script(scripts[i]).then(function() {
                  if (scripts.length != i + 1) {
                    loop(i + 1);
                  } else {
                    resolve();
                  }
                });
              }
            }
          });
        if (meta.style) {
          meta.style.forEach(legume.style);
        }
        ["var", "async"].forEach(function(cur) {
          parsed[cur] = parsed.metadata[cur];
          delete parsed.metadata[cur];
        });
        parsed.var = parsed.var || [];
        parsed.var = parsed.var.reduce(function(obj, cur) {
          var split = cur.split(" ");
          obj[split[0]] = split[1] || split[0];
          return obj;
        }, {});
        var module = {
            exports: {}
          },
          exports = module.exports,
          vars = {
            module: module,
            exports: exports
          };
        return waitScript.then(function() {
          var ret;
          if (parsed.legumescript && parsed.metadata.name) {
            var namespace = (legume.scripts[meta.name] =
              legume.scripts[meta.name] || parsed);
            namespace.clicks = namespace.clicks + 1 || 0;
            ret = Promise.resolve().then(function() {
              new (Function.prototype.bind.apply(
                (function() {
                  if (parsed.async) {
                    if (AsyncFunction) {
                      return AsyncFunction;
                    } else {
                      throw new Error(
                        "Async Functions not supported in this browser"
                      );
                    }
                  } else {
                    return Function;
                  }
                })(),
                [null].concat(Object.values(parsed.var).concat([code]))
              ))().apply(
                namespace,
                Object.keys(parsed.var).map(function(cur) {
                  return vars[cur];
                })
              );
            });
          } else {
            eval.call(null, code);
            ret = Promise.resolve();
          }
          return ret.then(function() {
            return !Object.getOwnPropertyNames(module.exports).length &&
              !Object.getOwnPropertySymbols(module.exports).length
              ? undefined
              : module.exports;
          });
        });
      });
    },
    script: function script(scrurl) {
      scrurl = processurl(scrurl);
      const done = function(fnlurl) {
        return load(fnlurl, "Couldn't load the script.")
          .then(function(r) {
            return r.text();
          })
          .then(legume.process);
      };
      if (scrurl.startsWith("dir:")) {
        scrurl = scrurl.replace(/dir:/, "").trim();
        return Promise.resolve()
          .then(function() {
            return legume.dir.scripts.unloaded
              ? legume.dir.scripts.update()
              : legume.dir.scripts;
          })
          .then(function(dir) {
            return done(dir.get(scrurl));
          });
      } else {
        return done(scrurl);
      }
    },
    style: function style(stlurl) {
      stlurl = processurl(stlurl);
      const done = function(fnlurl) {
        l.href = fnlurl;
        document.head.append(l);
      };
      l = document.createElement("link");
      l.rel = "stylesheet";
      if (stlurl.startsWith("dir:")) {
        stlurl = stlurl.replace(/dir:/, "").trim();
        return Promise.resolve()
          .then(function() {
            return legume.dir.styles.unloaded
              ? legume.dir.styles.update()
              : legume.dir.styles;
          })
          .then(function(dir) {
            return done(dir.get(stlurl));
          });
      } else {
        return done(stlurl);
      }
    },
    json: function json(jsonurl) {
      return load(jsonurl, "Couldn't load JSON.").then(function(r) {
        return r.json();
      });
    },
    text: function text(txturl) {
      return load(txturl, "Couldn't load text.").then(function(r) {
        return r.text();
      });
    }
  };
  window.Legume = legume;
  if (entry) legume.load(entry);
  function parse(data, pmd) {
    // pmd == provided metadata
    var inBlock = false,
      cmt = {
        cmt: /^(\s*\/\/\s*)/,
        multi: {
          start: /^(\s*\/\*\s*@legume\s*)/i,
          end: /^\s*\*\//
        },
        single: {
          start: /\s*@legume\s*/,
          match: /\s*@[^@]*/g
        }
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
        script: [],
        style: [],
        var: [],
        async: false
      },
      options = {},
      code = [],
      errors = [],
      legumescript = false,
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
    data.match(/[^\r\n]+/g).forEach(function(line, i, lines) {
      if (cmt.cmt.test(line)) {
        var comment = line.replace(cmt.cmt, "").trim();
        if (cmt.single.start.test(comment)) {
          comment.replace(cmt.single.start, "");
          for (
            var m = cmt.single.match.exec(comment);
            m;
            m = cmt.single.match.exec(comment)
          ) {
            processCmt(m[0]);
          }
        }
      } else if (cmt.multi.end.test(line) && inBlock) {
        inBlock = false;
      } else if (inBlock) {
        processCmt(line);
      } else if (cmt.multi.start.test(line)) {
        inBlock = true;
        legumescript = true;
      } else {
        code.push(line);
      }
      if (inBlock && i + 1 == lines.length) {
        errors.push("missing metdata block closing");
      }
    });
    return {
      metadata: Object.assign(options, pmd),
      code: code.join("\n"),
      errors: errors.length ? errors : null,
      legumescript: legumescript
    };
  }
  var entryScript = entry.dataset.legumeEntry;
  if (entryScript) {
    Legume.script(entryScript);
  }
};
(function() {
  var url =
    "https://polyfill.io/v2/polyfill.min.js?features=default-3.6,fetch,Element.prototype.dataset,Object.values&callback=legumeload";
  var script = document.createElement("script");
  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
})();

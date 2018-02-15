legumeload = function() {
  delete legumeload;
  function _throw(e) {
    throw e;
  }
  var entry = document.querySelector("script[src*=legume]");
  var AsyncFunction;
  try {
    AsyncFunction = Object.getPrototypeOf(eval("async () => {}")).constructor;
  } catch (err) {}
  function processurl(inurl) {
    var relative;
    try {
      inurl = new URL(inurl);
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        relative = inurl;
        inurl = new URL(inurl, location.href);
      }
    }
    var methods = ["github", "npm"];
    for (var i = 0; i < methods.length; i++) {
      var cur = methods[i];
      if (inurl.protocol == cur + ":") {
        return {
          fullURL:
            "https://cdn.jsdelivr.net/" +
            (cur == "github" ? "gh" : cur) +
            "/" +
            inurl.pathname,
          relURL: relative
        };
      }
    }
    return { fullURL: inurl.href, relURL: relative };
  }
  function load(inurl, msg, method) {
    var purl = processurl(inurl);
    return fetch(purl.fullURL)
      .then(function(r) {
        return r.ok ? r[method]() : _throw(new Error(msg));
      })
      .then(function(r) {
        return { res: r, url: purl };
      })
      .catch(alert);
  }
  var legume = {
    version: "dev",
    scripts: {},
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
        ({
          script: legume.script,
          json: legume.json,
          text: legume.text,
          txtscript: legume.process
        }[opts](input));
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
      return Promise.resolve().then(function() {
        var parsed = parse.call(
            null,
            args[0].res,
            Object.assign({ url: args[0].url }, args[1])
          ),
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
        ["var", "async", "url"].forEach(function(cur) {
          parsed[cur] = parsed.metadata[cur];
          delete parsed.metadata[cur];
        });
        var url = parsed.url;
        code += url.fullURL ? "\n//# sourceURL=" + url.fullURL : "";
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
              return new (Function.prototype.bind.apply(
                parsed.async
                  ? AsyncFunction
                    ? AsyncFunction
                    : _throw(
                        new Error(
                          "Async Functions not supported in this browser"
                        )
                      )
                  : Function,
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
      return load(scrurl, "Couldn't load the script.", "text").then(
        legume.process
      );
    },
    style: function style(stlurl) {
      var l = document.createElement("link");
      l.href = processurl(stlurl);
      document.head.append(l);
      l.rel = "stylesheet";
    },
    json: function json(jsonurl) {
      return load(jsonurl, "Couldn't load JSON.", "json").then(function(r) {
        return r.res;
      });
    },
    text: function text(txturl) {
      return load(txturl, "Couldn't load text.").then(function(r) {
        return r.res;
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

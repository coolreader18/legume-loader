window.legumeload = function(root) {
  var entry = legumeload.curscr;
  var root = legumeload.root;
  delete window.legumeload;
  function parseURL(inurl, ref) {
    try {
      inurl = new URL(inurl);
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        inurl = new URL(inurl, ref || location);
      } else throw err;
    }
    var ret = { url: inurl, originalUrl: inurl };
    var split = inurl.pathname.split("/");
    var methods = {
      github: function() {
        var nv = split[1];
        return {
          url: new URL("https://cdn.jsdelivr.net/gh/" + inurl.pathname),
          name: nv.split("@")[0],
          version: nv.split("@")[1] || "latest"
        };
      },
      npm: function() {
        var nv = split[0];
        return {
          url: new URL("https://cdn.jsdelivr.net/npm/" + inurl.pathname),
          name: nv.split("@")[0],
          version: nv.split("@")[1] || "latest",
          legumescript: true
        };
      },
      gist: function() {
        return {
          name: split[1].split(".")[0],
          gist: {
            id: split[0],
            file: split[1]
          }
        };
      }
    };
    var protocol = inurl.protocol.split(":")[0];
    ret.method = protocol;
    if (protocol in methods) {
      Object.assign(ret, methods[protocol]());
    } else {
      Object.assign(ret, {
        name: inurl.pathname
          .split("/")
          .slice(-1)[0]
          .split(".")[0]
      });
    }
    return ret;
  }
  var legume = Object.assign(
    function legume(input, opts) {
      var opts = opts || {};
      var output = {};
      Object.assign(output, parseURL(input, opts.urlref));
      var cached = Object.values(legume.scripts).find(function(cur) {
        return (
          cur.url &&
          (cur.url.href == output.url.href ||
            cur.originalUrl.href == output.originalUrl.href)
        );
      });
      if (cached) {
        return Promise.resolve(require(cached.name));
      }
      var prom = Promise.resolve();
      if (output.method == "gist") {
        prom = fetch("https://api.github.com/gists/" + output.gist.id)
          .then(function(res) {
            return res.json();
          })
          .then(function(res) {
            var gistfile = res.files[output.gist.file];
            if (!gistfile) throw new Error("File not in gist");
            output.url = new URL(gistfile.raw_url);
            if (!gistfile.truncated) output.code = gistfile.content;
          });
      }
      return prom.then(function() {
        return legume.scripts[output.name]
          ? require(output.name)
          : "code" in output
            ? legume.process(output, opts.dontload)
            : fetch(output.url)
                .then(function(r) {
                  return r.text();
                })
                .then(function(code) {
                  output.code = code;
                  return legume.process(output, opts.dontload);
                });
      });
    },
    {
      version: "dev",
      scripts: {},
      cache: {},
      require: require,
      global: { require: require },
      style: function style(stlurl, ref) {
        stlurl = parseURL(stlurl, ref).url;
        document.head.appendChild(
          Object.assign(document.createElement("link"), {
            rel: "stylesheet",
            href: stlurl
          })
        );
      },
      process: function(scriptobj, dontload) {
        if (typeof scriptobj == "string") scriptobj = { code: scriptobj };
        scriptobj = parse(scriptobj);
        scriptobj.name = scriptobj.name || scriptobj.metadata.name;
        if (legume.scripts[scriptobj.name])
          if (!dontload) {
            return require(scriptobj.name);
          } else return;
        legume.scripts[scriptobj.name] = scriptobj;
        var ret = Promise.resolve(),
          requires = scriptobj.requires;
        if (requires.styles)
          requires.styles.forEach(function(cur) {
            legume.style(cur);
          });
        if (requires.scripts)
          ret = ret.then(function() {
            return Promise.all(
              requires.scripts.reduce(function(arr, scr) {
                arr.push(
                  legume(scr.script, { dontload: true, urlref: scriptobj.url })
                );
                return arr;
              }, [])
            );
          });
        return ret.then(function() {
          if (!dontload) require(scriptobj.name);
        });
      }
    }
  );
  legume.global.global = legume.global;
  function require(mod) {
    mod = legume.scripts[mod];
    if (mod) {
      if (legume.cache[mod.name]) return legume.cache[mod.name];
      var module = {
        exports: {},
        children: {},
        require: function require(mod) {
          this.children[mod] = legume.scripts[mod];
          return require(mod);
        }
      };
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
            possargs[cur.as] = require(parseURL(cur.script, mod.url).name);
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
        eval
          .call(
            window,
            "with(Legume.global)(" +
              Function.apply(null, passargs.concat([code])).toString() +
              ")"
          )
          .apply(
            legume.global,
            passargs.reduce(function(arr, cur) {
              arr.push(possargs[cur]);
              return arr;
            }, [])
          );
        legume.cache[mod.name] = possargs.module.exports;
        return possargs.module.exports;
      } else {
        return eval.call(window, code);
      }
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
      obj[cur] = md[cur];
      delete md[cur];
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
  root.Legume = legume;
  var loadprom = Promise.resolve();
  if (entry && entry.getAttribute("data-legume-entry"))
    loadprom = legume(entry.getAttribute("data-legume-entry"));
  Array.from(document.querySelectorAll("script[type='text/legume']")).reduce(
    function(prom, cur) {
      return prom.then(legume.process(cur.textContent));
    },
    loadprom
  );
};
(function() {
  var url =
    "https://polyfill.io/v2/polyfill.min.js?features=default-3.6,fetch,Element.prototype.dataset,Object.values,Object.entries&callback=legumeload";
  var script = document.createElement("script");
  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
  legumeload.root = typeof self == "undefined" ? window : self;
  legumeload.curscr =
    document.currentScript ||
    (function() {
      var supportsScriptReadyState =
          "readyState" in document.createElement("script"),
        isOpera = this.opera && this.opera.toString() === "[object Opera]",
        canDefineProp = typeof Object.defineProperty === "function",
        _currentEvaluatingScript = function() {
          var scripts = document.getElementsByTagName("script");
          for (var i = scripts.length; scripts[--i]; ) {
            if (scripts[i].readyState === "interactive") {
              return scripts[i];
            }
          }
          return null;
        };
      if (!supportsScriptReadyState) {
        throw new Error(
          'Cannot polyfill `document.currentScript` as your browser does not support the "readyState" DOM property of script elements. Please see https://github.com/Financial-Times/polyfill-service/issues/952 for more information.'
        );
      }
      if (isOpera) {
        throw new Error(
          'Cannot polyfill `document.currentScript` as your Opera browser does not correctly support the "readyState" DOM property of script elements. Please see https://github.com/Financial-Times/polyfill-service/issues/952 for more information.'
        );
      }
      if (!canDefineProp) {
        throw new Error(
          "Cannot polyfill `document.currentScript` as your browser does not support `Object.defineProperty`. Please see https://github.com/Financial-Times/polyfill-service/issues/952 for more information."
        );
      }
      Object.defineProperty(document, "currentScript", {
        get: function Document$currentScript() {
          return _currentEvaluatingScript();
        },
        configurable: true
      })();
    })();
})();

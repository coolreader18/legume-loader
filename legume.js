window.legumeload = function() {
  delete window.legumeload;
  var entry = document.querySelector("script[src*=legume]");
  function parseURL(inurl) {
    try {
      inurl = new URL(inurl);
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        inurl = new URL(inurl, location.href);
      }
    }
    var ret = {};
    var methods = ["github", "npm"];
    for (var i = 0; i < methods.length; i++) {
      var cur = methods[i];
      if (inurl.protocol == cur + ":") {
        return {
          url: new URL(
            "https://cdn.jsdelivr.net/" +
              (cur == "github" ? "gh" : cur) +
              "/" +
              inurl.pathname
          ),
          name: inurl.pathname
            .split("/")
            [cur == "github" ? 1 : 0].split("@")[0],
          version:
            inurl.pathname.split("/")[cur == "github" ? 1 : 0].split("@")[1] ||
            "latest",
          method: cur,
          legumescript: cur == "npm" ? true : undefined
        };
      }
    }
    return { url: inurl };
  }
  var legume = Object.assign(
    function legume(input, dontload) {
      var output = {};
      Object.assign(output, parseURL(input));
      return legume.scripts[output.name]
        ? require(output.name)
        : fetch(output.url)
            .then(function(r) {
              return r.text();
            })
            .then(function(code) {
              output.code = code;
              parse(output);
              output.name = output.name || output.metadata.name;
              if (legume.scripts[output.name])
                if (!dontload) {
                  return require(output.name);
                } else return;
              legume.scripts[output.name] = output;
              var ret = Promise.resolve(),
                requires = output.requires;
              if (requires.styles)
                requires.styles.forEach(function(cur) {
                  cur = parseURL(cur).url;
                  document.head.appendChild(
                    Object.assign(document.createElement("link"), {
                      rel: "stylesheet",
                      href: cur.href
                    })
                  );
                });
              if (requires.scripts)
                ret = ret.then(function() {
                  return Promise.all(
                    requires.scripts.reduce(function(arr, scr) {
                      arr.push(legume(scr.script, true));
                      return arr;
                    }, [])
                  );
                });
              return ret.then(function() {
                if (!dontload) require(output.name);
              });
            });
    },
    {
      version: "dev",
      scripts: {},
      cache: {},
      require: require,
      global: {}
    }
  );
  window.Legume = legume;
  if (entry && entry.getAttribute("data-legume-entry"))
    Legume(entry.getAttribute("data-legume-entry"));
  function require(mod) {
    mod = legume.scripts[mod];
    if (mod) {
      if (legume.cache[mod.name]) return legume.cache[mod.name];
      var possargs = {
        module: { exports: {} },
        require: require,
        global: legume.global
      };
      possargs.exports = possargs.module.exports;
      var passargs = ["module", "exports", "require", "global"];
      var requires = mod.requires;
      if (requires.scripts) {
        requires.scripts.forEach(function(cur) {
          if (cur.as && !Object.keys(possargs).includes(cur.as)) {
            possargs[cur.as] = require(parseURL(cur.script).name);
            passargs.push(cur.as);
          }
        });
      }
      var code = mod.code + (mod.url ? "\n//# sourceURL=" + mod.url : "");
      if (mod.legumescript) {
        Function.apply(null, passargs.concat([code])).apply(
          legume.global,
          passargs.reduce(function(arr, cur) {
            arr.push(possargs[cur]);
            return arr;
          }, [])
        );
        legume.cache[mod.name] = possargs.module.exports;
        return possargs.module.exports;
      } else {
        return eval(code);
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
        script: [],
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
      scripts: options.script,
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
    return Object.assign(script, {
      metadata: options,
      code: code.join("\n"),
      errors: errors.length ? errors : null,
      requires
    });
  }
};
(function() {
  var url =
    "https://polyfill.io/v2/polyfill.min.js?features=default-3.6,fetch,Element.prototype.dataset,Object.values,Object.entries&callback=legumeload";
  var script = document.createElement("script");
  script.src = url;
  document.getElementsByTagName("head")[0].appendChild(script);
})();

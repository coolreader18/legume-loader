legumeload = function() {
  var entry = document.currentScript.dataset.legumeEntry;
  var AsyncFunction;
  try {
    AsyncFunction = Object.getPrototypeOf(eval("async () => {}")).constructor;
  } catch (err) {}
  function processurl(inurl) {
    inurl = new URL(inurl);
    let methods = ["github", "npm"];
    for (let i = 0; i < methods.length; i++) {
      let cur = methods[i];
      if (inurl.protocol == `${cur}:`) {
        return `https://cdn.jsdelivr.net/${
          cur == "github" ? "gh" : cur
        }/${inurl.replace(new RegExp(`${cur}:`), "").trim()}`;
      }
    }
    return inurl.trim();
  }
  function load(inurl, msg) {
    inurl = processurl(inurl);
    let url;
    try {
      url = new URL(inurl);
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        url = new URL(inurl, location.href);
      }
    }
    return fetch(url)
      .then(r => {
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
        update() {
          legume.json(scriptdirurl).then(json => {
            delete this.unloaded;
            return Object.assign(this, json);
          });
        },
        get(name) {
          var obj = this[name];
          return obj.url.replace(/%VERSION/, obj.latest);
        },
        unloaded: true
      },
      styles: {
        update() {
          legume.json(styledirurl).then(json => {
            delete this.unloaded;
            return Object.assign(this, json);
          });
        },
        get(name) {
          var obj = this[name];
          return obj.url.replace(/%VERSION/, obj.latest);
        },
        unloaded: true
      }
    },
    load(input, opts) {
      if (typeof input == "string") {
        input = input.trim();
      }
      function legumestring(str) {
        let types = ["json", "text", "script"];
        for (let i = 0; i < types.length; i++) {
          let cur = types[i];
          if (str.startsWith(`${cur}:`)) {
            return legume[cur](str.replace(new RegExp(`${cur}:`), "").trim());
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
        let retarr = [];
        input.forEach(cur => retarr.push(legumestring(cur)));
        return Promise.all(retarr);
      }
    },
    process(...args) {
      return Promise.resolve().then(() => {
        var parsed = parse(...args),
          meta = parsed.metadata,
          code = parsed.code,
          waitScript = new Promise(resolve => {
            if (!meta.script) {
              resolve();
            } else {
              let scripts = meta.script;
              loop(0);
              function loop(i) {
                return legume.script(scripts[i]).then(() => {
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
        ["var", "async"].forEach(cur => {
          parsed[cur] = parsed.metadata[cur];
          delete parsed.metadata[cur];
        });
        parsed.var = parsed.var || [];
        parsed.var = parsed.var.reduce((obj, cur) => {
          var split = cur.split(" ");
          obj[split[0]] = split[1] || split[0];
          return obj;
        }, {});
        var module = {
            exports: {}
          },
          exports = module.exports,
          vars = {
            module,
            exports
          };
        return waitScript.then(() => {
          var ret;
          if (parsed.legumescript && parsed.metadata.name) {
            let namespace = (legume.scripts[meta.name] =
              legume.scripts[meta.name] || parsed);
            namespace.clicks = namespace.clicks + 1 || 0;
            ret = Promise.resolve().then(() =>
              new ((() => {
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
              })())(...Object.values(parsed.var), code).apply(
                namespace,
                Object.keys(parsed.var).map(cur => vars[cur])
              )
            );
          } else {
            eval.call(null, code);
            ret = Promise.resolve();
          }
          return ret.then(
            () =>
              !Object.getOwnPropertyNames(module.exports).length &&
              !Object.getOwnPropertySymbols(module.exports).length
                ? undefined
                : module.exports
          );
        });
      });
    },
    script(scrurl) {
      const done = fnlurl =>
        load(fnlurl, "Couldn't load the script.")
          .then(r => r.text())
          .then(legume.process);
      if (scrurl.startsWith("dir:")) {
        scrurl = scrurl.replace(/dir:/, "").trim();
        return Promise.resolve()
          .then(
            () =>
              legume.dir.scripts.unloaded
                ? legume.dir.scripts.update()
                : legume.dir.scripts
          )
          .then(dir => done(dir.get(scrurl)));
      } else {
        return done(scrurl);
      }
    },
    style(stlurl) {
      stlurl = processurl(stlurl);
      const done = fnlurl => {
        l.href = fnlurl;
        document.head.append(l);
      };
      l = document.createElement("link");
      l.rel = "stylesheet";
      if (stlurl.startsWith("dir:")) {
        stlurl = stlurl.replace(/dir:/, "").trim();
        return Promise.resolve()
          .then(
            () =>
              legume.dir.styles.unloaded
                ? legume.dir.styles.update()
                : legume.dir.styles
          )
          .then(dir => done(dir.get(stlurl)));
      } else {
        return done(stlurl);
      }
    },
    json(jsonurl) {
      return load(jsonurl, "Couldn't load JSON.").then(r => r.json());
    },
    text(txturl) {
      return load(txturl, "Couldn't load text.").then(r => r.text());
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
      processCmt = comment => {
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
            console.warn(`ignoring invalid metadata option: \`${key}\``);
          }
        }
      };
    data.match(/[^\r\n]+/g).forEach((line, i, lines) => {
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
};
(function() {
  var url =
    "https://polyfill.io/v2/polyfill.min.js?features=default-3.6,fetch?callback=legumeload";
  var script = document.createElement("script");
  script.src = url;
  document.body.append(script);
})();

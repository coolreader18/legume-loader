(() => {
  var entry = document.currentScript.dataset.legumeEntry;
  function load(inurl, msg) {
    inurl = (() => {
      let methods = ["github", "npm"];
      for (let i = 0; i < methods.length; i++) {
        let cur = methods[i];
        if (inurl.startsWith(`${cur}:`)) {
          return `https://cdn.jsdelivr.net/${
            cur == "github" ? "gh" : cur
          }/${inurl.replace(new RegExp(`${cur}:`), "").trim()}`;
        }
      }
      return inurl;
    })().trim();
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
          case "github":
            return legume.github(input);
          case "script":
            return legume.script(input);
          case "json":
            return legume.json(input);
          case "text":
            return legume.text(input);
          case "txtscript":
            return legume.process(input);
          case "npm":
            return legume.npm(input);
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
    async process(...args) {
      var parsed = parse(...args),
        meta = parsed.metadata,
        code = parsed.code,
        waitScript = (async () => {
          if (!meta.script) {
            return;
          } else {
            let scripts = meta.script;
            for (var i = 0; i < scripts.length; i++) {
              await legume.script(scripts[i]);
            }
            return;
          }
        })();
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
      await waitScript;
      if (parsed.legumescript && parsed.metadata.name) {
        let namespace = (legume.scripts[meta.name] =
          legume.scripts[meta.name] || parsed);
        namespace.clicks = namespace.clicks + 1 || 0;
        await new (parsed.async
          ? Object.getPrototypeOf(async () => {}).constructor
          : Function)(...Object.values(parsed.var), code).apply(
          namespace,
          Object.keys(parsed.var).map(cur => vars[cur])
        );
      } else {
        eval.call(null, code);
      }
      return !Object.getOwnPropertyNames(module.exports).length &&
        !Object.getOwnPropertySymbols(module.exports).length
        ? undefined
        : module.exports;
    },
    script(scrurl) {
      const done = fnlurl =>
        load(fnlurl, "Couldn't load the script.")
          .then(r => r.text())
          .then(legume.process);
      if (scrurl.startsWith("dir:")) {
        scrurl = scrurl.replace(/dir:/, "").trim();
        return (async () =>
          legume.dir.scripts.unloaded
            ? await legume.dir.scripts.update()
            : legume.dir.scripts)().then(dir => done(dir.get(scrurl)));
      } else {
        return done(scrurl);
      }
    },
    style(stlurl) {
      const done = fnlurl => {
        l.href = fnlurl;
        document.head.append(l);
      };
      l = document.createElement("link");
      l.rel = "stylesheet";
      if (stlurl.startsWith("dir:")) {
        stlurl = stlurl.replace(/dir:/, "").trim();
        return (async () =>
          legume.dir.styles.unloaded
            ? await legume.dir.styles.update()
            : legume.dir.styles)().then(dir => done(dir.get(stlurl)));
      } else {
        return done(stlurl);
      }
    },
    github(ghurl) {
      return legume.script(`https://cdn.jsdelivr.net/gh/${ghurl}`);
    },
    json(jsonurl) {
      return load(jsonurl, "Couldn't load JSON.").then(r => r.json());
    },
    text(txturl) {
      return load(txturl, "Couldn't load text.").then(r => r.text());
    },
    npm(pkgstr) {
      return load(
        `https://cdn.jsdelivr.net/npm/${pkgstr}`,
        "Couldn't load npm script."
      )
        .then(r => r.text())
        .then(legume.process);
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
      legumescript
    };
  }
})();

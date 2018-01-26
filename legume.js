(() => {
  function load(inurl, msg) {
    var url;
    try {
      url = new URL(inurl)
    } catch (err) {
      if (err.message == "Failed to construct 'URL': Invalid URL") {
        url = new URL(inurl, location.href);
      }
    }
    return fetch(url).then(r=>{
      if (r.ok) {
        return r;
      } else {
        throw new Error(msg);
      }
    }).catch(alert);
  }
  var legume = {
    version: "v3.0.0",
    scripts: {},
    dir: {
      scripts: {
        update() {
          legume.json(scriptdirurl).then(json => {
            delete this.unloaded;
            return Object.assign(this, json);
          })
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
          })
        },
        get(name) {
          var obj = this[name];
          return obj.url.replace(/%VERSION/, obj.latest)
        },
        unloaded: true
      }
    },
    load(input, opts) {
      const legumestring = str => {
        str = str.trim()
        if (str.startsWith("github:")) {
          return legume.github(str.replace(/github:/, ""));
        } else if (str.startsWith("json:")) {
          return legume.json(str.replace(/json:/, ""));
        } else if (str.startsWith("text:")) {
          return legume.text(str.replace(/text:/, ""));
        } else {
          return legume.script(str);
        }
      }
      if (typeof opts == "string") {
        if (opts == "github") {
          return legume.github(input);
        } else if (opts == "script") {
          return legume.script(input);
        } else if (opts == "json") {
          return legume.json(input);
        } else if (opts == "text") {
          return legume.text(input);
        } else if (opts == "txtscript") {
          return legume.process(input);
        }
      }
      if (typeof input == "string") {
        legumestring(input)
      } else if (typeof Array.isArray(input)) {
        input.forEach(legumestring)
      }
    },
    async process(data, providedmd) {
      var parsed = parse(data, providedmd),
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
        meta.style.forEach(legume.style)
      }
      ["var", "async"].forEach(cur => {
        parsed[cur] = parsed.metadata[cur];
        delete parsed.metadata[cur];
      })
      Object.assign(parsed.metadata, providedmd);
      parsed.var = parsed.var || [];
      parsed.var = parsed.var.reduce((obj, cur) => {
        var split = cur.split(" ")
        obj[split[0]] = split[1] || split[0];
        return obj
      }, {});
      var module = {
        exports: {}
      },
      exports = module.exports,
      vars = {
        module,
        exports
      }
      await waitScript;
      if (parsed.legumescript && parsed.metadata.name) {
        let namespace = legume.scripts[meta.name] = legume.scripts[meta.name] || parsed;
        namespace.clicks = namespace.clicks + 1 || 0;
        await new (parsed.async ? Object.getProtoypeOf(async()=>{}).constructor : Function)(...Object.values(parsed.var), code)
        .apply(namespace, Object.keys(parsed.var).map(cur=>vars[cur]));
      } else {
        eval.call(null, code);
      }
      return (!Object.getOwnPropertyNames(module.exports).length && !Object.getOwnPropertySymbols(module.exports).length ? undefined : module.exports);
    },
    script(scrurl) {
      const done = fnlurl =>
      load(fnlurl, "Couldn't load the script.").then(r=>r.text()).then(legume.process);
      if (scrurl.startsWith("dir:")) {
        scrurl = scrurl.replace(/dir:/, "").trim();
        return (async () =>
        legume.dir.scripts.unloaded ?
        await legume.dir.scripts.update() :
        legume.dir.scripts)
        ().then(dir => done(dir.get(scrurl)));
      } else {
        return done(scrurl)
      }
    },
    style(stlurl) {
      const done = fnlurl => {
        l.href = fnlurl
        document.head.append(l);
      }
      l = document.createElement("link");
      l.rel = "stylesheet";
      if (stlurl.startsWith("dir:")) {
        stlurl = stlurl.replace(/dir:/, "").trim();
        return (async () =>
        legume.dir.styles.unloaded ?
        await legume.dir.styles.update() :
        legume.dir.styles)
        ().then(dir => done(dir.get(stlurl)));
      } else {
        return done(stlurl)
      }
    },
    github(ghurl) {
      var filearr = ghurl.split("/"),
      slug = filearr.slice(0, 2).join("/");
      return fetch(`https://api.github.com/repos/${slug}/releases/latest`).then(response => {
        if (response.ok) {
          return response.json().then(json => `https://cdn.rawgit.com/${slug}/${json.tag_name}/${filearr.slice(2).join("/")}`);
        } else {
          throw new Error("Couldn't connect to GitHub");
        }
      }).then(load).catch(alert);
    },
    json(jsonurl) {
      return load(jsonurl, "Couldn't load JSON.").then(r=>r.json())
    },
    text(txturl) {
      return load(txturl, "Couldn't load text.").then(r=>r.text())
    }
  };
  window.Legume = legume;
  function parse(data, providedmd) {
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
          for (var m = cmt.single.match.exec(comment); m; m = cmt.single.match.exec(comment)) {
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
      metadata: Object.assign(options, providedmd),
      code: code.join("\n"),
      errors: errors.length ? errors : null,
      legumescript
    };
  }
})()

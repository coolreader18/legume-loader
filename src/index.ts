import parseURL from "./parse-url";

const version = "dev";
const scripts = {};
const cache = {};

const Legume = async (input, opts = {}) => {
  let output = parseURL(input, opts.urlref);
  let cached = Object.values(scripts).find(
    cur =>
      cur.url &&
      (cur.url.href == output.url.href ||
        cur.originalURL.href == output.originalURL.href)
  );
  if (cached) {
    return Promise.resolve(legumeRequire(cached.name));
  }
  let { gist } = output;
  if (output.method == "gist") {
    const res: {
      files: {
        [filename: string]: {
          raw_url: string;
          truncated: boolean;
          content: string;
        };
      };
    } = await fetch(
      "https://api.github.com/gists/" +
        gist.id +
        (gist.hash ? "/" + gist.hash : "")
    ).then(res => res.json());

    let gistfile = res.files[gist.file];
    if (!gistfile) throw new Error("File not in gist");
    output.url = new URL(gistfile.raw_url);
    output.url.hostname = "cdn.rawgit.com";
    if (gistfile.truncated) {
      output.code = await fetch(String(output.url)).then(res => res.text());
    } else {
      output.code = gistfile.content;
    }
  }

  if (output.name in scripts) return legumeRequire(output.name);
  if (!("code" in output)) {
    output.code = await fetch(String(output.url)).then(res => res.text());
  }
  return process(output, opts.dontload);
};

const style = (stlurl: string, ref?: string) => {
  const { url } = parseURL(stlurl, ref);
  document.head.appendChild(
    Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: url
    })
  );
};
function process(scriptobj, dontload) {
  if (typeof scriptobj == "string") scriptobj = { code: scriptobj };
  scriptobj = parse(scriptobj);
  scriptobj.name = scriptobj.name || scriptobj.metadata.name;
  scriptobj.loads = 0;
  if (scripts[scriptobj.name])
    if (!dontload) {
      return legumeRequire(scriptobj.name);
    } else return;
  scripts[scriptobj.name] = scriptobj;
  let ret = Promise.resolve(),
    requires = scriptobj.requires;
  if (requires.styles)
    requires.styles.forEach(function(cur) {
      style(cur);
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
    if (!dontload) legumeRequire(scriptobj.name);
  });
}
const legumeRequire = (modId: string) => {
  let mod =
    scripts[modId] ||
    Object.values(scripts).find(
      cur => cur.metadata && cur.metadata.name == mod
    );
  if (!mod) {
    throw new Error("Module not loaded");
  }
  if (cache[mod.name] && !mod.bookmarklet) return cache[mod.name];
  mod.loads++;
  let module = {
    exports: {},
    children: mod.children,
    legumeInfo: {
      loads: mod.loads
    }
  };
  module.require = function require(mod) {
    this.children[mod] = scripts[mod];
    return require(mod);
  }.bind(module);
  let possargs = {
    module: module,
    require: module.require,
    exports: module.exports
  };
  let passargs = ["module", "exports"];
  let requires = mod.requires;
  if (requires.scripts) {
    requires.scripts.forEach(function(cur) {
      if (cur.as && !Object.keys(possargs).includes(cur.as)) {
        possargs[cur.as] = legumeRequire(
          parseURL(cur.script, mod.url, URL).name
        );
        passargs.push(cur.as);
      }
    });
  }
  let code =
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
    cache[mod.name] = module.exports;
    return possargs.module.exports;
  } else {
    return eval.call(window, code);
  }
};
function parse(script) {
  let options;
  let requires = {
    scripts: options.require,
    styles: options.style
  };
  delete options.script;
  delete options.style;
  if (requires.scripts)
    requires.scripts.forEach(function(cur, i) {
      let arr = cur.split(" ");
      let obj = {};
      for (let j = 1; j < arr.length; j += 2) {
        let temparr = arr.slice(j, j + 2);
        obj[temparr[0]] = temparr[1];
      }
      requires.scripts[i] = { script: arr[0], as: obj.as || null };
    });
  let moveds = ["bookmarklet"].reduce(function(obj, cur) {
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

const curScript = document.currentScript;
const entry = curScript && curScript.getAttribute("data-legume-entry");

Array.from(document.querySelectorAll("script[type='text/legume']")).reduce(
  (prom, cur) => {
    const processfn = () => process(cur.textContent);

    if (cur.getAttribute("async") === null) {
      processfn();
    } else prom = prom.then(processfn);

    return prom;
  },
  entry ? Legume(entry) : Promise.resolve()
);

exports = Legume;
export { legumeRequire as require, cache, scripts, process, style };

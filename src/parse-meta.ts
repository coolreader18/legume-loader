const md = (input, opts) => {
  function reg(str) {
    return new RegExp(str);
  }
  var start = /\s*(?:\*\s*)*/.source;
  var input = input.split(/\r?\n/);
  var out = input.reduce(
    function(info, cur) {
      var err = false;
      if (info.yes)
        top: {
          if (Array.isArray(info.in.slice(-1))) {
          } else if (cur.match(reg(start + "}"))) {
            info.in.pop();
          } else {
            err = true;
          }
          if (err) {
            console.error("Invalid metadata line, skipping");
          }
          if (cur.match(/\s*\*\/$/)) {
            info.yes = false;
          }
        }
      else if (cur.match(new RegExp("s*/*s*@" + opts.name))) {
        info.yes = true;
      }

      return info;

      function topin(obj) {
        obj = obj || input.output;
        return info.in.reduce(function(prev, cur) {
          return prev[cur];
        }, obj);
      }
    },
    {
      yes: null,
      output: {},
      in: []
    }
  );
  if (out.in.length) console.warn("Unclosed objects, it's probably fine");
  if (out.yes !== true)
    return mergeDeep(Object.assign({}, opts.keys), out.output);
  else throw new SyntaxError("Comment not closed");
};

function parse(script) {
  var inBlock = false,
    cmt = {
      start: /^(\s*\/\*\s*@legume\s*)/i,
      end: /^\s*\*\//
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

export default md;

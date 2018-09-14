function md(input, opts) {
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
}
md(require("fs").readFileSync("./testcmt"), {
  name: "info",
  keys: {
    hey: "oop",
    d: [7]
  }
});

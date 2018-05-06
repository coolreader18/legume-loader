export default function parseURL(inurl, ref, URL) {
  try {
    inurl = new URL(inurl);
  } catch (err) {
    if (err.message == "Failed to construct 'URL': Invalid URL") {
      inurl = new URL(inurl, ref || location);
    } else throw err;
  }
  var ret = { url: inurl, originalUrl: inurl };
  var split = inurl.pathname.split("/");
  var nv0 = split[0].split("@");
  var methods = {
    github: function() {
      var nv = split[1].split("@");
      return {
        url: new URL("https://cdn.jsdelivr.net/gh/" + inurl.pathname),
        name: nv[0],
        version: nv[1] || "latest"
      };
    },
    npm: function() {
      return {
        url: new URL("https://cdn.jsdelivr.net/npm/" + inurl.pathname),
        name: nv0[0],
        version: nv0[1] || "latest",
        legumescript: true
      };
    },
    gist: function() {
      return {
        name: split[1].split(".")[0],
        gist: {
          id: nv0[0],
          file: split[1],
          hash: nv0[1]
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

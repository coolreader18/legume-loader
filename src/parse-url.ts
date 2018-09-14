export interface LegumeURL {
  url: URL;
  originalURL: URL;
  method: string;
  name: string;
  version: string;
  legumescript?: boolean;
  gist?: {
    id: string;
    file: string;
    hash: string;
  };
}

const parseURL = (inURL: string, ref?: string) => {
  let origURL: URL;
  try {
    origURL = new URL(inURL);
  } catch (err) {
    if (err.message == "Failed to construct 'URL': Invalid URL") {
      origURL = new URL(inURL, ref || String(location));
    } else throw err;
  }
  const ret: LegumeURL = { url: origURL, originalURL: origURL };
  let split = origURL.pathname.split("/");
  let noVer0 = split[0].split("@");
  let methods = {
    github: function() {
      let noVer = split[1].split("@");
      return {
        url: new URL("https://cdn.jsdelivr.net/gh/" + origURL.pathname),
        name: noVer[0],
        version: noVer[1] || "latest"
      };
    },
    npm: function() {
      return {
        url: new URL("https://cdn.jsdelivr.net/npm/" + origURL.pathname),
        name: noVer0[0],
        version: noVer0[1] || "latest",
        legumescript: true
      };
    },
    gist: function() {
      return {
        name: split[1].split(".")[0],
        gist: {
          id: noVer0[0],
          file: split[1],
          hash: noVer0[1]
        }
      };
    }
  };
  let protocol = (ret.method = origURL.protocol.slice(0, -1));

  Object.assign(
    ret,
    protocol in methods
      ? methods[protocol]()
      : {
          name: origURL.pathname
            .split("/")
            .slice(-1)[0]
            .split(".")[0]
        }
  );

  return ret;
};

export default parseURL;

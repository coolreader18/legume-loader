export interface LegumeUrl {
  absUrl?: URL;
  request: URL;
  method: string;
  relative: boolean;
  gist?: {
    id: string;
    file: string;
  };
}

const parseUrl = (inUrl: string, ref?: string | URL): LegumeUrl => {
  let origUrl: URL;
  let relative = false;
  try {
    origUrl = new URL(inUrl);
  } catch (err) {
    origUrl = new URL(inUrl, ref || String(location));
    relative = true;
  }
  const protocol = origUrl.protocol.slice(0, -1);
  let url: Partial<LegumeUrl>;
  switch (protocol) {
    case "github":
      url = {
        absUrl: new URL("https://cdn.jsdelivr.net/gh/" + origUrl.pathname)
      };
      break;
    case "npm":
      url = {
        absUrl: new URL("https://cdn.jsdelivr.net/npm/" + origUrl.pathname)
      };
      break;
    case "gist":
      const split = origUrl.pathname.split("/");
      url = {
        gist: {
          id: split[0],
          file: split[1]
        }
      };
      break;
    default:
      url = {
        absUrl: origUrl
      };
      break;
  }

  return {
    ...url,
    relative,
    request: origUrl,
    method: protocol
  };
};

export default parseUrl;

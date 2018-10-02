export interface LegumeUrl {
  absUrl: URL;
  request: URL;
  method: string;
  relative: boolean;
}

const parseUrl = (inUrl: string, ref?: string | URL | LegumeUrl): LegumeUrl => {
  let origUrl: URL;
  let relative = false;
  try {
    origUrl = new URL(inUrl);
  } catch (err) {
    origUrl = new URL(
      inUrl,
      ref
        ? ref instanceof URL || typeof ref === "string"
          ? ref
          : ref.absUrl
        : location.href
    );
    relative = true;
  }
  const protocol = origUrl.protocol.slice(0, -1);
  let absUrl: URL;
  switch (protocol) {
    case "github":
      absUrl = new URL(`https://cdn.jsdelivr.net/gh/${origUrl.pathname}`);
      break;
    case "npm":
      absUrl = new URL(`https://cdn.jsdelivr.net/npm/${origUrl.pathname}`);
      break;
    case "gist":
      const split = origUrl.pathname.split("/");
      const { hash } = origUrl;
      absUrl = new URL(
        hash
          ? `https://cdn.rawgit.com/${split
              .slice(0, 2)
              .join("/")}/raw/${hash.slice(1)}/${split[2]}`
          : `https://rawgist.now.sh/${split[1]}/${split[2]}`
      );
      break;
    default:
      absUrl = origUrl;
      break;
  }

  return {
    absUrl,
    relative,
    request: origUrl,
    method: protocol
  };
};

export default parseUrl;

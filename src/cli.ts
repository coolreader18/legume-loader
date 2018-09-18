({ URL } = require("url"));
const semver = require("semver");
const findPrefix = require("find-npm-prefix");
const fs = require("fs");
const got = require("got");
const repoURL =
  "https://api.github.com/repos/coolreader18/legume-loader/releases";
const path = require("path");
import parseURL from "./parse-url.js";

require("yargs").command(
  "bookmarklet",
  "create a bookmarklet payload with legume",
  yargs =>
    yargs.options({
      file: {
        alias: ["f"],
        default: "legume-bundle.js"
      },
      url: {
        alias: ["u"],
        demandOption: true
      }
    }),
  async ({ file, url }) => {
    file = path.resolve(process.cwd(), file);
    const versions = (await got(repoURL, { json: true })).body.map(
      cur => cur.tag_name
    );
    const pkg = JSON.parse(
      fs.readFileSync(
        path.join(await findPrefix(process.cwd()), "package.json"),
        "utf8"
      )
    );
    const ver = semver.maxSatisfying(
      versions,
      (pkg.engines && pkg.engines["legume-loader"]) || "*"
    );
    url = parseURL(url, null);
    if (url.gist) {
      const { gist } = url;
      const gistfile = (await got(
        `https://api.github.com/gists/${gist.id}${
          gist.hash ? "/" + gist.hash : ""
        }`,
        { json: true }
      )).body.files[gist.file];
      if (!gistfile) throw new Error("File not in gist");
      url = new URL(gistfile.raw_url);
      url.hostname = "cdn.rawgit.com";
    } else url = url.url;
    fs.writeFileSync(
      file,
      `javascript:(function(t,d,s,n){typeof Legume==n+""?(s=d.createElement("script"),s.src="https://cdn.jsdelivr.net/npm/legume-loader@${ver}/legume.min.js",s.setAttribute("data-legume-entry",t),d.head.appendChild(s)):Legume(t)})(${JSON.stringify(
        url
      )},document);`
    );
  }
).argv;
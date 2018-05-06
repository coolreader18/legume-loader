#!/usr/bin/env node
'use strict';

function parseURL(inurl, ref, URL) {
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

const { URL } = require("url");
const semver = require("semver");
const findPrefix = require("find-npm-prefix");
const fs = require("fs");
const got = require("got");
const repoURL =
  "https://api.github.com/repos/coolreader18/legume-loader/releases";
const path = require("path");

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
    url = parseURL(url, null, URL);
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

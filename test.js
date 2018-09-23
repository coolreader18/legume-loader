const puppeteer = require("puppeteer");
const util = require("util");
const http = require("http");
const serve = require("serve-handler");

(async () => {
  const port = 8345;

  const server = http
    .createServer((request, response) =>
      serve(request, response, { public: __dirname + "/test" })
    )
    .listen(port);

  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(`http://localhost:${port}`);

  let resolve;
  const doneTests = new Promise(res => (resolve = res));

  await page.exposeFunction("onDone", () => {
    resolve();
  });

  page.on("console", async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
    console.log(...args);
  });

  await doneTests;

  await browser.close();
  await util.promisify(server.close).call(server);
})();

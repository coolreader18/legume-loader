const puppeteer = require("puppeteer");
const util = require("util");

(async () => {
  const port = process.env.PORT || (process.env.PORT = 8345);

  const server = require("./server");

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

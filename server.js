const http = require("http");
const serve = require("serve-handler");

module.exports = http
  .createServer((request, response) =>
    serve(request, response, { public: __dirname + "/test" })
  )
  .listen(process.env.PORT || 5000);

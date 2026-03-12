const https = require("https");
const zlib = require("zlib");

function request(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {

      let stream = res;

      if (res.headers["content-encoding"] === "gzip") {
        stream = res.pipe(zlib.createGunzip());
      }

      let data = "";

      stream.on("data", chunk => data += chunk);

      stream.on("end", () => resolve(data));

    });

    req.on("error", reject);
    req.end();
  });
}

async function checkin() {

  const options = {
    hostname: "anyrouter.top",
    path: "/api/user/sign_in",
    method: "POST",
    headers: {
      "cookie": process.env.COOKIE,
      "user-agent": "Mozilla/5.0",
      "accept-encoding": "gzip"
    }
  };

  try {
    const res = await request(options);
    console.log("checkin result:");
    console.log(res);
  } catch (err) {
    console.error("checkin error:", err);
  }
}

checkin();

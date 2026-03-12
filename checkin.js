const https = require("https");

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve(body));
    });

    req.on("error", reject);

    if (data) req.write(data);

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
      "user-agent": "Mozilla/5.0"
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

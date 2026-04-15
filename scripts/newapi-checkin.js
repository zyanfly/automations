const https = require("https");
const { sendPushPlusNotification } = require("./pushplus");

async function checkin() {
  const cookie = process.env.NEWAPI_COOKIE;
  const newApiUser = process.env.NEWAPI_USER;

  const missing = !cookie ? "NEWAPI_COOKIE" : !newApiUser ? "NEWAPI_USER" : null;
  if (missing) {
    const result = { status: 0, ok: false, text: `未配置 ${missing}` };
    console.log("checkin result:");
    console.log(result);
    await sendNotification(result);
    process.exitCode = 1;
    return;
  }

  const result = await sendCheckinRequest(cookie, newApiUser);

  console.log("checkin result:");
  console.log(result);

  await sendNotification(result);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

function sendCheckinRequest(cookie, newApiUser) {
  const url = new URL("https://lc.zenscaleai.com/api/user/checkin");
  const data = "{}";

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      Cookie: cookie,
      "New-Api-User": newApiUser,
      "User-Agent": "Mozilla/5.0"
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseText = "";

      res.on("data", (chunk) => {
        responseText += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          text: responseText
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        status: 0,
        ok: false,
        text: error.message
      });
    });

    req.write(data);
    req.end();
  });
}

async function sendNotification(result) {
  const title = `newAPI 签到结果: ${result.ok ? "成功" : "失败"}`;
  const content = `状态码: ${result.status}\n结果: ${result.text}`;
  return sendPushPlusNotification({ title, content });
}

checkin();

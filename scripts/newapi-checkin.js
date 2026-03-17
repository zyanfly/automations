const https = require("https");

async function checkin() {
  const cookie = process.env.NEWAPI_COOKIE;
  const newApiUser = process.env.NEWAPI_USER;

  if (!cookie) {
    const result = {
      status: 0,
      ok: false,
      text: "未配置 NEWAPI_COOKIE"
    };

    console.log("checkin result:");
    console.log(result);
    await sendNotification(result);
    process.exitCode = 1;
    return;
  }

  if (!newApiUser) {
    const result = {
      status: 0,
      ok: false,
      text: "未配置 NEWAPI_USER"
    };

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
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) {
    console.log("未配置 PUSHPLUS_TOKEN，跳过推送");
    return;
  }

  const title = `newAPI 签到结果: ${result.ok ? "成功" : "失败"}`;
  const content = `状态码: ${result.status}\n结果: ${result.text}`;

  console.log(`准备发送通知，Token长度: ${token.length}`);
  const data = JSON.stringify({
    token,
    title,
    content,
    template: "html"
  });

  const options = {
    hostname: "www.pushplus.plus",
    path: "/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let resultData = "";
      res.on("data", (chunk) => {
        resultData += chunk;
      });
      res.on("end", () => {
        console.log(`通知发送完成，状态码: ${res.statusCode}`);
        console.log("推送响应:", resultData);
        resolve();
      });
    });

    req.on("error", (error) => {
      console.error("通知发送失败:", error);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

checkin();

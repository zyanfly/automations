const puppeteer = require("puppeteer-core");

/**
 * 自动识别环境中的浏览器路径
 * GitHub Actions (ubuntu-latest) 预装了 google-chrome
 */
const getExecutablePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "linux") return "/usr/bin/google-chrome";
  if (process.platform === "darwin") return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return undefined;
};


(async () => {

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getExecutablePath(),
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "user-agent": "Mozilla/5.0"
  });

  // 先访问首页，让站点生成 acw_sc__v2
  await page.goto("https://anyrouter.top", { waitUntil: "networkidle2" });

  // 设置登录 cookie
  const raw = (process.env.ANYROUTER_COOKIE || "").split(";");

  const cookies = raw.map(v=>{
    const p=v.trim().split("=");
    return { name:p[0], value:p.slice(1).join("="), domain:".anyrouter.top" };
  });

  await page.setCookie(...cookies);

  // 在浏览器环境里请求签到接口
  const result = await page.evaluate(async () => {

    const res = await fetch("/api/user/sign_in",{
      method:"POST",
      headers:{
        "content-type":"application/json"
      },
      body:"{}"
    });

    console.log("Response status:", res.status);
    console.log("Response ok:", res.ok);

    const text = await res.text();
    console.log("Response text:", text);

    return {
      status: res.status,
      ok: res.ok,
      text: text
    };
  });

  console.log("checkin result:");
  console.log(result);

  await browser.close();

  // 发送通知
  await sendNotification(result);

})();

/**
 * 发送推送通知 (PushPlus)
 */
async function sendNotification(result) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) {
    console.log("未配置 PUSHPLUS_TOKEN，跳过推送");
    return;
  }

  const https = require("https");
  const title = `AnyRouter 签到结果: ${result.ok ? "成功" : "失败"}`;
  const content = `状态码: ${result.status}\n结果: ${result.text}`;

  const data = JSON.stringify({
    token: token,
    title: title,
    content: content,
    template: "html"
  });

  const options = {
    hostname: "www.pushplus.plus",
    path: "/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length
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

    req.on("error", (e) => {
      console.error("通知发送失败:", e);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

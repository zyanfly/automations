const puppeteer = require("puppeteer");

(async () => {

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "user-agent": "Mozilla/5.0"
  });

  // 先访问首页，让站点生成 acw_sc__v2
  await page.goto("https://anyrouter.top", { waitUntil: "networkidle2" });

  // 设置登录 cookie
  const raw = process.env.COOKIE.split(";");

  const cookies = raw.map(v=>{
    const p=v.trim().split("=");
    return { name:p[0], value:p.slice(1).join("="), domain:"https://anyrouter.top" };
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

    return res.text();
  });

  console.log("checkin result:");
  console.log(result);

  await browser.close();

})();

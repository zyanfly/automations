const https = require("https");

const TARGET_URL = "https://m.touker.com/stock/broadcast/index.htm";

/**
 * 抓取网页内容
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = "";
      res.on("data", (chunk) => {
        html += chunk;
      });
      res.on("end", () => {
        resolve(html);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * 解析 HTML 提取可转债信息
 */
function parseBonds(html) {
  const bonds = [];
  // 匹配 broadcast-item 块
  const itemRegex = /<div class="broadcast-item[^"]*">([\s\S]*?)<\/ul>\s*<\/div>/g;
  let match;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(tomorrow);

  while ((match = itemRegex.exec(html)) !== null) {
    const content = match[1];
    
    // 筛选“债”
    if (!content.includes("<i>债</i>")) continue;

    const tagMatch = content.match(/<div class="tag">([^<]+)<\/div>/);
    const idMatch = content.match(/<div class="item-id">([^<]+)<span>(\d+)<\/span>/);

    if (tagMatch && idMatch) {
      const tag = tagMatch[1].trim();
      const name = idMatch[1].trim();
      const code = idMatch[2].trim();

      // 判断是否需要提醒：今日、明日、或日期匹配
      const shouldNotify = tag === "今日申购" || 
                           tag === "明日申购" || 
                           tag === todayStr || 
                           tag === tomorrowStr;

      if (shouldNotify) {
        bonds.push({ tag, name, code });
      }
    }
  }
  return bonds;
}

/**
 * 推送通知
 */
async function sendNotification(bonds) {
  const token = process.env.PUSHPLUS_TOKEN;
  if (!token) {
    console.log("未配置 PUSHPLUS_TOKEN，跳过推送");
    return;
  }

  if (bonds.length === 0) {
    console.log("今日无需要申购的可转债");
    return;
  }

  const title = `打新预告：发现 ${bonds.length} 只可转债可申购/预约`;
  let content = "<h3>可转债打新提醒</h3><ul>";
  bonds.forEach(bond => {
    content += `<li><b>[${bond.tag}]</b> ${bond.name} (${bond.code})</li>`;
  });
  content += "</ul><p>请及时前往证券 APP 进行预约或申购。</p>";

  console.log("准备发送通知...");
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
        console.log("推送结果:", resultData);
        resolve();
      });
    });
    req.on("error", (err) => {
      console.error("推送失败:", err);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log(`开始抓取: ${TARGET_URL}`);
    const html = await fetchHtml(TARGET_URL);
    const bonds = parseBonds(html);
    
    console.log("抓取到的可转债列表:", bonds);
    
    await sendNotification(bonds);
    console.log("任务结束");
  } catch (error) {
    console.error("执行出错:", error);
    process.exit(1);
  }
}

main();

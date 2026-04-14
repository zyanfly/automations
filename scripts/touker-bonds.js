const https = require("https");
const fs = require("fs");
const path = require("path");
const { sendPushPlusNotification } = require("./pushplus");

const TARGET_URL = "https://m.touker.com/stock/broadcast/index.htm";
const HISTORY_FILE = path.join(__dirname, "bonds-history.json");

/**
 * 加载历史记录
 */
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
      // 如果旧版是数组，转换为新版对象格式
      if (Array.isArray(data)) {
        return data.reduce((acc, code) => ({ ...acc, [code]: "Unknown" }), {});
      }
      return data;
    } catch (e) {
      console.error("[Error] 读取历史记录失败:", e);
    }
  }
  return {};
}

/**
 * 保存历史记录
 */
function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
    console.log("[Debug] 历史记录已更新 (包含债项名称)");
  } catch (e) {
    console.error("[Error] 保存历史记录失败:", e);
  }
}

/**
 * 抓取网页内容
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
      }
    };
    https.get(url, options, (res) => {
      const status = res.statusCode || 0;
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`抓取页面失败，HTTP 状态码: ${status}`));
        return;
      }

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
function parseBonds(html, history) {
  const bonds = [];
  const parts = html.split('<div class="broadcast-item');
  parts.shift(); // 第一部分是 header

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
  console.log(`[Debug] 判定日期 - 今日: ${todayStr}, 明日: ${tomorrowStr}`);

  parts.forEach((part, index) => {
    const tagMatch = part.match(/<div class="tag">([^<]+)<\/div>/);
    const idMatch = part.match(/<div class="item-id">([^<]+)<span>(\d+)<\/span>/);
    const typeMatch = part.match(/<i>([^<]+)<\/i>/);
    
    const tag = tagMatch ? tagMatch[1].trim() : "unknown";
    const name = idMatch ? idMatch[1].trim() : "unknown";
    const code = idMatch ? idMatch[2].trim() : "unknown";
    const type = typeMatch ? typeMatch[1].trim() : "unknown";

    console.log(`[Debug] 项目 #${index + 1}: [${type}] ${name} (${code}), 标签: ${tag}`);

    // 基本筛选
    const isBond = type === "债" || part.includes("<i>债</i>");
    
    if (!isBond) {
      console.log(`[Debug]   -> 跳过: 非可转债`);
      return;
    }

    // 检查历史记录
    if (history[code]) {
      console.log(`[Debug]   -> 跳过: 已在提醒历史中 (${history[code]})`);
      return;
    }

    // 提醒策略：如果是债，无条件提醒并入库；如果是由于其他类型（如股），保留日期判断逻辑
    let shouldNotify = false;
    if (isBond) {
      shouldNotify = true;
      console.log(`[Debug]   -> 可转债类型，开启全局提醒`);
    } else {
      shouldNotify = tag === "今日申购" || tag === todayStr || tag === "明日申购" || tag === tomorrowStr;
    }

    if (shouldNotify) {
      console.log(`[Debug]   -> 匹配成功!`);
      bonds.push({ tag, name, code });
    }
  });

  console.log(`[Debug] 本次新增匹配 ${bonds.length} 个项目`);
  return bonds;
}

/**
 * 推送通知
 */
async function sendNotification(bonds) {
  if (bonds.length === 0) {
    return;
  }

  const title = `新债预约提醒：发现 ${bonds.length} 只新债`;
  let content = "<h3>新债预约提醒</h3><ul>";
  bonds.forEach(bond => {
    content += `<li><b>[${bond.tag}]</b> ${bond.name} (${bond.code})</li>`;
  });
  content += "</ul><p>请及时前往证券 APP 进行预约。</p>";

  return sendPushPlusNotification({ title, content });
}

async function main() {
  try {
    console.log(`开始抓取: ${TARGET_URL}`);
    const html = await fetchHtml(TARGET_URL);
    const history = loadHistory();
    const bonds = parseBonds(html, history);
    
    if (bonds.length > 0) {
      await sendNotification(bonds);
      // 更新并保存历史
      const newHistory = { ...history };
      bonds.forEach(b => newHistory[b.code] = b.name);
      saveHistory(newHistory);
    } else {
      console.log("今日无新增可转债内容");
    }
    
    console.log("任务结束");
  } catch (error) {
    console.error("执行出错:", error);
    process.exit(1);
  }
}

main();

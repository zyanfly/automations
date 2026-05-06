const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const { sendPushPlusNotification } = require("./pushplus");

const TARGET_URL = "https://m.touker.com/stock/broadcast/index.htm";
const HISTORY_FILE = path.join(__dirname, "bonds-history.json");
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [3_000, 10_000, 30_000];
const TRANSIENT_ERROR_CODES = new Set([
	"ECONNRESET",
	"ENETUNREACH",
	"ETIMEDOUT",
	"EAI_AGAIN",
	"ECONNREFUSED",
]);

/**
 * 加载历史记录
 */
function loadHistory() {
	if (fs.existsSync(HISTORY_FILE)) {
		try {
			const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
			// 如果旧版是数组，转换为新版对象格式
			if (Array.isArray(data)) {
				const history = {};
				data.forEach((code) => {
					history[code] = "Unknown";
				});
				return history;
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
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCodes(error) {
	const codes = new Set();
	if (error?.code) {
		codes.add(error.code);
	}
	if (Array.isArray(error?.errors)) {
		error.errors.forEach((innerError) => {
			if (innerError?.code) {
				codes.add(innerError.code);
			}
		});
	}
	return codes;
}

function isTransientNetworkError(error) {
	for (const code of getErrorCodes(error)) {
		if (TRANSIENT_ERROR_CODES.has(code)) {
			return true;
		}
	}
	return false;
}

function fetchHtmlOnce(url) {
	return new Promise((resolve, reject) => {
		const options = {
			family: 4,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
			},
			timeout: REQUEST_TIMEOUT_MS,
		};
		const req = https
			.get(url, options, (res) => {
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
			})
			.on("error", (err) => {
				reject(err);
			});
		req.setTimeout(REQUEST_TIMEOUT_MS, () => {
			req.destroy(
				Object.assign(new Error(`请求超时: ${REQUEST_TIMEOUT_MS}ms`), {
					code: "ETIMEDOUT",
				}),
			);
		});
	});
}

async function fetchHtml(url) {
	const maxAttempts = RETRY_DELAYS_MS.length + 1;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			console.log(`[Debug] 抓取尝试 ${attempt}/${maxAttempts}`);
			return await fetchHtmlOnce(url);
		} catch (error) {
			const codes = [...getErrorCodes(error)].join(", ") || "unknown";
			const canRetry = attempt < maxAttempts && isTransientNetworkError(error);
			console.warn(
				`[Warn] 抓取失败，错误码: ${codes}，${canRetry ? "准备重试" : "不再重试"}`,
			);

			if (!canRetry) {
				throw error;
			}

			await sleep(RETRY_DELAYS_MS[attempt - 1]);
		}
	}

	throw new Error("抓取页面失败");
}

/**
 * 解析 HTML 提取可转债信息
 */
function parseBonds(html, history) {
	const bonds = [];
	const parts = html.split('<div class="broadcast-item');
	parts.shift(); // 第一部分是 header

	parts.forEach((part, index) => {
		const tagMatch = part.match(/<div class="tag">([^<]+)<\/div>/);
		const idMatch = part.match(
			/<div class="item-id">([^<]+)<span>(\d+)<\/span>/,
		);
		const typeMatch = part.match(/<i>([^<]+)<\/i>/);

		const tag = tagMatch ? tagMatch[1].trim() : "unknown";
		const name = idMatch ? idMatch[1].trim() : "unknown";
		const code = idMatch ? idMatch[2].trim() : "unknown";
		const type = typeMatch ? typeMatch[1].trim() : "unknown";

		console.log(
			`[Debug] 项目 #${index + 1}: [${type}] ${name} (${code}), 标签: ${tag}`,
		);

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

		console.log(`[Debug]   -> 可转债类型，开启全局提醒`);
		console.log(`[Debug]   -> 匹配成功!`);
		bonds.push({ tag, name, code });
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
	bonds.forEach((bond) => {
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
			bonds.forEach((b) => {
				newHistory[b.code] = b.name;
			});
			saveHistory(newHistory);
		} else {
			console.log("今日无新增可转债内容");
		}

		console.log("任务结束");
	} catch (error) {
		if (isTransientNetworkError(error)) {
			console.warn(
				"[Warn] 目标站点网络暂时不可达，本次跳过，等待下次定时任务重试。",
			);
			console.warn("[Warn] 最后一次错误:", error);
			return;
		}
		console.error("执行出错:", error);
		process.exit(1);
	}
}

main();

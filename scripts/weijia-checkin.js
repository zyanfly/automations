const { setTimeout: sleep } = require("node:timers/promises");
const { sendPushPlusNotification } = require("./pushplus");

const ORIGIN = "https://qy.51vj.cn";
const VERSION = "3.31.0";

function readConfig(env = process.env) {
	const corpid = (env.WEIJIA_CORPID || "").trim();
	const appid = (env.WEIJIA_APPID || "1002").trim();
	let cookie = (env.WEIJIA_COOKIE || "").trim();
	if (cookie.toLowerCase().startsWith("cookie:")) {
		cookie = cookie.slice(7).trim();
	}
	if (!/^[A-Za-z0-9_-]+$/.test(corpid)) {
		throw new Error("未配置有效的 WEIJIA_CORPID");
	}
	if (!/^\d+$/.test(appid)) {
		throw new Error("WEIJIA_APPID 格式无效");
	}
	if (!cookie || /[\r\n]/.test(cookie)) {
		throw new Error("未配置有效的 WEIJIA_COOKIE");
	}
	return { corpid, appid, cookie };
}

async function requestApi(method, path, config, fetchImpl = fetch) {
	const url = new URL(path, ORIGIN);
	url.searchParams.set("corpid", config.corpid);
	url.searchParams.set("appid", config.appid);
	url.searchParams.set("_", String(Date.now()));
	url.searchParams.set("_v", VERSION);

	const headers = {
		Accept: "application/json;charset=utf-8",
		Cookie: config.cookie,
		Referer: `${ORIGIN}/app/home/culture/sign?corpid=${encodeURIComponent(config.corpid)}&appid=${encodeURIComponent(config.appid)}`,
		"User-Agent": "Mozilla/5.0 (compatible; WeijiaCheckin/1.0)",
	};
	if (method === "POST") {
		headers.Origin = ORIGIN;
	}

	const response = await fetchImpl(url, {
		method,
		headers,
		redirect: "manual",
		signal: AbortSignal.timeout(20_000),
	});
	if (response.status >= 300 && response.status < 400) {
		throw new Error("登录会话已跳转，请更新 WEIJIA_COOKIE");
	}
	if (!response.ok) {
		throw new Error(`签到接口返回 HTTP ${response.status}`);
	}
	try {
		const data = await response.json();
		if (data && typeof data === "object" && !Array.isArray(data)) {
			return data;
		}
	} catch {
		// 登录页有时以 HTTP 200 返回 HTML；不输出可能包含个人信息的响应体。
	}
	throw new Error("签到接口未返回有效 JSON，会话可能已过期");
}

async function getStatus(config, fetchImpl) {
	const data = await requestApi(
		"GET",
		"/club/sign-in/is-sign-in",
		config,
		fetchImpl,
	);
	if (data.code !== 1) {
		throw new Error("签到状态查询被拒绝，会话可能已过期");
	}
	if (data.sign_in === true || data.sign_in === 1) return true;
	if (data.sign_in === false || data.sign_in === 0) return false;
	throw new Error("签到状态缺失，已停止提交");
}

async function runCheckin(config = readConfig(), fetchImpl = fetch) {
	if (await getStatus(config, fetchImpl)) return "今天已签到";

	const data = await requestApi("POST", "/club/sign-in", config, fetchImpl);
	if (data.code !== 1) {
		throw new Error("签到提交被拒绝，不会重复提交");
	}

	// POST 只发一次；只重试只读状态查询。
	for (let attempt = 0; attempt < 3; attempt++) {
		if (await getStatus(config, fetchImpl)) return "签到成功";
		if (attempt < 2) await sleep(2_000);
	}
	throw new Error("接口报告提交成功，但未能确认签到状态");
}

async function main() {
	try {
		const message = await runCheckin();
		console.log(`微加签到：${message}`);
		await sendPushPlusNotification({ title: "微加签到成功", content: message });
	} catch (error) {
		const message = error instanceof Error ? error.message : "未知错误";
		console.error(`微加签到失败：${message}`);
		await sendPushPlusNotification({ title: "微加签到失败", content: message });
		process.exitCode = 1;
	}
}

if (require.main === module) main();

module.exports = { readConfig, requestApi, getStatus, runCheckin };

const { sendPushPlusNotification } = require("./pushplus");

const CHECKIN_URL = "https://ikuuu.org/user/checkin";

async function checkin() {
	const cookie = process.env.IKUUU_COOKIE;
	if (!cookie) {
		return finish({
			status: 0,
			ok: false,
			ret: null,
			message: "未配置 IKUUU_COOKIE",
		});
	}

	try {
		const response = await fetch(CHECKIN_URL, {
			method: "POST",
			headers: {
				Accept: "application/json, text/javascript, */*; q=0.01",
				Cookie: cookie,
				Origin: "https://ikuuu.org",
				Referer: "https://ikuuu.org/user",
				"User-Agent": "Mozilla/5.0",
				"X-Requested-With": "XMLHttpRequest",
			},
			redirect: "manual",
		});
		const responseText = await response.text();
		const result = parseResult(response, responseText);
		return finish(result);
	} catch (error) {
		return finish({
			status: 0,
			ok: false,
			ret: null,
			message: error instanceof Error ? error.message : String(error),
		});
	}
}

function parseResult(response, responseText) {
	if (response.status >= 300 && response.status < 400) {
		return {
			status: response.status,
			ok: false,
			ret: null,
			message: "请求被重定向，Cookie 可能已失效",
		};
	}

	let data;
	try {
		data = JSON.parse(responseText);
	} catch {
		return {
			status: response.status,
			ok: false,
			ret: null,
			message: response.ok
				? "接口未返回 JSON，Cookie 可能已失效"
				: responseText || response.statusText,
		};
	}

	const message =
		typeof data.msg === "string"
			? data.msg
			: typeof data.message === "string"
				? data.message
				: responseText;
	const alreadyCheckedIn = /已经签到|已签到|重复签到/.test(message);
	const apiSucceeded =
		data.ret === 1 || data.success === true || data.code === 0;

	return {
		status: response.status,
		ok: response.ok && (apiSucceeded || alreadyCheckedIn),
		ret: data.ret ?? null,
		message,
	};
}

async function finish(result) {
	console.log("checkin result:");
	console.log(JSON.stringify(result, null, 2));

	const title = `IKUUU 签到${result.ok ? "成功" : "失败"}`;
	const content = [
		`签到结果: ${result.message}`,
		`接口 ret: ${result.ret ?? "无"}`,
		`HTTP 状态码: ${result.status}`,
	].join("\n");
	await sendPushPlusNotification({ title, content });

	if (!result.ok) {
		process.exitCode = 1;
	}

	return result;
}

checkin();

const puppeteer = require("puppeteer-core");
const { sendPushPlusNotification } = require("./pushplus");

/**
 * 自动识别环境中的浏览器路径
 * GitHub Actions (ubuntu-latest) 预装了 google-chrome
 */
const getExecutablePath = () => {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
	if (process.platform === "linux") return "/usr/bin/google-chrome";
	if (process.platform === "darwin")
		return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
	return undefined;
};

function parseCookieString(rawCookie) {
	return rawCookie
		.split(";")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.map((segment) => {
			const [name, ...valueParts] = segment.split("=");
			return {
				name: name.trim(),
				value: valueParts.join("=").trim(),
				domain: ".anyrouter.top",
			};
		})
		.filter((cookie) => cookie.name && cookie.value);
}

async function runCheckin() {
	const rawCookie = process.env.ANYROUTER_COOKIE;
	if (!rawCookie) {
		const result = {
			status: 0,
			ok: false,
			text: "未配置 ANYROUTER_COOKIE",
		};
		console.log("checkin result:");
		console.log(result);
		await sendNotification(result);
		process.exitCode = 1;
		return;
	}

	let browser;

	try {
		const cookies = parseCookieString(rawCookie);
		if (cookies.length === 0) {
			throw new Error("ANYROUTER_COOKIE 格式无效，未解析出可用 cookie");
		}

		browser = await puppeteer.launch({
			headless: true,
			executablePath: getExecutablePath(),
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		const page = await browser.newPage();

		await page.setExtraHTTPHeaders({
			"user-agent": "Mozilla/5.0",
		});

		// 先访问首页，让站点生成 acw_sc__v2
		await page.goto("https://anyrouter.top", { waitUntil: "networkidle2" });
		await page.setCookie(...cookies);

		// 在浏览器环境里请求签到接口
		const result = await page.evaluate(async () => {
			const res = await fetch("/api/user/sign_in", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: "{}",
			});

			const text = await res.text();

			return {
				status: res.status,
				ok: res.ok,
				text,
			};
		});

		console.log("checkin result:");
		console.log(result);
		await sendNotification(result);

		if (!result.ok) {
			process.exitCode = 1;
		}
	} catch (error) {
		const result = {
			status: 0,
			ok: false,
			text: error instanceof Error ? error.message : String(error),
		};
		console.log("checkin result:");
		console.log(result);
		await sendNotification(result);
		process.exitCode = 1;
	} finally {
		if (browser) {
			await browser.close().catch((error) => {
				console.error("关闭浏览器失败:", error);
			});
		}
	}
}

async function sendNotification(result) {
	const title = `AnyRouter 签到${result.ok ? "成功" : "失败"}`;
	const content = `状态码: ${result.status}\n结果: ${result.text}`;

	return sendPushPlusNotification({ title, content });
}

runCheckin();

async function sendPushPlusNotification({
	title,
	content,
	token = process.env.PUSHPLUS_TOKEN,
}) {
	if (!token) {
		console.log("未配置 PUSHPLUS_TOKEN，跳过推送");
		return false;
	}

	console.log(`准备发送通知，Token长度: ${token.length}`);
	try {
		const res = await fetch("https://www.pushplus.plus/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, title, content, template: "html" }),
		});
		const resultData = await res.text();
		console.log(`通知发送完成，状态码: ${res.status}`);
		console.log("推送响应:", resultData);
		return res.ok;
	} catch (error) {
		console.error("通知发送失败:", error);
		return false;
	}
}

module.exports = {
	sendPushPlusNotification,
};

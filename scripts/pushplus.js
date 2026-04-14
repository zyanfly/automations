const https = require('https')

function sendPushPlusNotification({ title, content, token = process.env.PUSHPLUS_TOKEN }) {
  if (!token) {
    console.log('未配置 PUSHPLUS_TOKEN，跳过推送')
    return Promise.resolve(false)
  }

  console.log(`准备发送通知，Token长度: ${token.length}`)
  const data = JSON.stringify({
    token,
    title,
    content,
    template: 'html',
  })

  const options = {
    hostname: 'www.pushplus.plus',
    path: '/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  }

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let resultData = ''
      res.on('data', (chunk) => {
        resultData += chunk
      })
      res.on('end', () => {
        console.log(`通知发送完成，状态码: ${res.statusCode}`)
        console.log('推送响应:', resultData)
        resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300)
      })
    })

    req.on('error', (error) => {
      console.error('通知发送失败:', error)
      resolve(false)
    })

    req.write(data)
    req.end()
  })
}

module.exports = {
  sendPushPlusNotification,
}

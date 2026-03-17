# automations

用于托管两个自动签到任务，并通过 PushPlus 推送执行结果。

## 功能

- `anyrouter-checkin`
  - 脚本: `scripts/checkin.js`
  - 工作流: `.github/workflows/anyrouter-checkin.yml`
  - 站点: `https://anyrouter.top`
  - 说明: 使用 `puppeteer-core` 在浏览器环境内发起签到请求

- `newapi-checkin`
  - 脚本: `scripts/newapi-checkin.js`
  - 工作流: `.github/workflows/newapi-checkin.yml`
  - 接口: `https://lc.zenscaleai.com/api/user/checkin`
  - 说明: 直接发送 HTTPS 请求，依赖 `Cookie` 和 `New-Api-User` 请求头

## 定时触发

两个工作流当前都使用相同的 cron：

```yaml
schedule:
  - cron: '18 0 * * *'
```

- UTC 时间: 每天 `00:18`
- 北京时间: 每天 `08:18`

如果需要改成别的非整点时间，直接修改对应 workflow 文件里的 `cron` 即可。

## GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

| Secret 名称        | 用途                              |
| ------------------ | --------------------------------- |
| `ANYROUTER_COOKIE` | AnyRouter 登录态 cookie           |
| `NEWAPI_COOKIE`    | newAPI 登录态 cookie              |
| `NEWAPI_USER`      | newAPI 请求头 `New-Api-User` 的值 |
| `PUSHPLUS_TOKEN`   | PushPlus 推送 token               |

说明：

- `anyrouter-checkin` 需要 `ANYROUTER_COOKIE` 和 `PUSHPLUS_TOKEN`
- `newapi-checkin` 需要 `NEWAPI_COOKIE`、`NEWAPI_USER` 和 `PUSHPLUS_TOKEN`
- 如果未配置 `PUSHPLUS_TOKEN`，脚本会跳过推送

## 手动执行

两个 workflow 都保留了 `workflow_dispatch`，可以在 GitHub Actions 页面手动运行：

- `anyrouter-checkin`
- `newapi-checkin`

## 本地运行

安装依赖：

```bash
npm install
```

执行 AnyRouter 签到：

```bash
ANYROUTER_COOKIE='your_cookie' PUSHPLUS_TOKEN='your_token' node scripts/checkin.js
```

执行 newAPI 签到：

```bash
NEWAPI_COOKIE='your_cookie' NEWAPI_USER='your_user' PUSHPLUS_TOKEN='your_token' node scripts/newapi-checkin.js
```

## 目录

```text
.
├── .github/workflows/
│   ├── anyrouter-checkin.yml
│   └── newapi-checkin.yml
├── scripts/
│   ├── checkin.js
│   └── newapi-checkin.js
└── package.json
```

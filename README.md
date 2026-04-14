# automations

用于托管自动签到和提醒脚本，并通过 PushPlus 推送执行结果。

## 当前任务

### 1. `anyrouter-checkin`

- 脚本：`scripts/checkin.js`
- 工作流：`.github/workflows/anyrouter-checkin.yml`
- 站点：`https://anyrouter.top`
- 触发方式：GitHub Actions 定时 + 手动触发
- 当前 cron：`17 22 * * *`
- 运行时间：
  - UTC：每天 `22:17`
  - 北京时间：每天 `06:17`

### 2. `newapi-checkin`

- 脚本：`scripts/newapi-checkin.js`
- 工作流：`.github/workflows/newapi-checkin.yml`
- 接口：`https://lc.zenscaleai.com/api/user/checkin`
- 触发方式：当前仅保留手动触发
- 说明：通过 `Cookie` 和 `New-Api-User` 请求头执行签到

### 3. `touker-bonds`

- 脚本：`scripts/touker-bonds.js`
- 工作流：`.github/workflows/touker-bonds.yml`
- 页面：`https://m.touker.com/stock/broadcast/index.htm`
- 触发方式：GitHub Actions 定时 + 手动触发
- 当前 cron：`33 22 * * *`
- 运行时间：
  - UTC：每天 `22:33`
  - 北京时间：每天 `06:33`
- 说明：抓取页面中的可转债广播信息，发现新债时推送提醒，并自动更新 `scripts/bonds-history.json`

如果需要调整执行时间，直接修改对应 workflow 文件中的 `cron`。

## GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

| Secret 名称        | 用途                              |
| ------------------ | --------------------------------- |
| `ANYROUTER_COOKIE` | AnyRouter 登录态 cookie           |
| `NEWAPI_COOKIE`    | newAPI 登录态 cookie              |
| `NEWAPI_USER`      | newAPI 请求头 `New-Api-User` 的值 |
| `PUSHPLUS_TOKEN`   | PushPlus 推送 token               |

说明：

- `anyrouter-checkin` 需要 `ANYROUTER_COOKIE`
- `newapi-checkin` 需要 `NEWAPI_COOKIE` 和 `NEWAPI_USER`
- `PUSHPLUS_TOKEN` 为可选项；未配置时脚本会跳过推送

## 手动执行

三个 workflow 都保留了 `workflow_dispatch`，可在 GitHub Actions 页面手动运行。

## 本地运行

先安装依赖：

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

执行 Touker 新债提醒：

```bash
PUSHPLUS_TOKEN='your_token' node scripts/touker-bonds.js
```

## 目录

```text
.
├── .github/workflows/
│   ├── anyrouter-checkin.yml
│   ├── newapi-checkin.yml
│   └── touker-bonds.yml
├── scripts/
│   ├── bonds-history.json
│   ├── checkin.js
│   ├── newapi-checkin.js
│   ├── pushplus.js
│   └── touker-bonds.js
└── package.json
```

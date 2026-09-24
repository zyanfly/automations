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

### 4. `ikuuu-checkin`

- 脚本：`scripts/ikuuu-checkin.js`
- 工作流：`.github/workflows/ikuuu-checkin.yml`
- 接口：`https://ikuuu.org/user/checkin`
- 触发方式：仅支持 GitHub Actions 手动触发（自动签到已关闭）
- 说明：通过 `Cookie` 执行签到；“今日已签到”也会按成功处理

### 5. `weijia-checkin`

- 脚本：`scripts/weijia-checkin.js`
- 工作流：`.github/workflows/weijia-checkin.yml`
- 站点：`https://qy.51vj.cn/app/home/culture`
- 触发方式：GitHub Actions 定时 + 手动触发
- 运行时间：北京时间每天 `09:17`
- 说明：先查询当天状态，未签到才提交一次；会话过期时失败并提醒

如果需要调整执行时间，直接修改对应 workflow 文件中的 `cron`。

## GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

| Secret 名称        | 用途                              |
| ------------------ | --------------------------------- |
| `ANYROUTER_COOKIE` | AnyRouter 登录态 cookie           |
| `NEWAPI_COOKIE`    | newAPI 登录态 cookie              |
| `NEWAPI_USER`      | newAPI 请求头 `New-Api-User` 的值 |
| `IKUUU_COOKIE`     | IKUUU 登录态 cookie               |
| `WEIJIA_CORPID`    | 微加企业 ID（链接中的 `corpid`）  |
| `WEIJIA_COOKIE`    | 微加登录态 Cookie 请求头的值      |
| `PUSHPLUS_TOKEN`   | PushPlus 推送 token               |

说明：

- `anyrouter-checkin` 需要 `ANYROUTER_COOKIE`
- `newapi-checkin` 需要 `NEWAPI_COOKIE` 和 `NEWAPI_USER`
- `ikuuu-checkin` 需要 `IKUUU_COOKIE`
- `weijia-checkin` 需要 `WEIJIA_CORPID` 和 `WEIJIA_COOKIE`
- `PUSHPLUS_TOKEN` 为可选项；未配置时脚本会跳过推送

微加 Cookie 可在自己的已登录浏览器中，从签到页 `GET /club/sign-in/is-sign-in` 请求的请求头中取得。它属于账号凭证，只存入仓库 Secret，不要写入代码或日志。Cookie 有效期尚未验证，过期后需更新 Secret；首次未签到日还应检查实际 POST 结果。

## 手动执行

所有 workflow 都保留了 `workflow_dispatch`，可在 GitHub Actions 页面手动运行。

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

执行 IKUUU 签到：

```bash
IKUUU_COOKIE='your_cookie' PUSHPLUS_TOKEN='your_token' node scripts/ikuuu-checkin.js
```

执行微加签到：

```bash
WEIJIA_CORPID='your_corpid' WEIJIA_COOKIE='your_cookie' PUSHPLUS_TOKEN='your_token' node scripts/weijia-checkin.js
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
│   ├── ikuuu-checkin.yml
│   ├── newapi-checkin.yml
│   ├── weijia-checkin.yml
│   └── touker-bonds.yml
├── scripts/
│   ├── bonds-history.json
│   ├── checkin.js
│   ├── ikuuu-checkin.js
│   ├── newapi-checkin.js
│   ├── pushplus.js
│   ├── weijia-checkin.js
│   └── touker-bonds.js
└── package.json
```

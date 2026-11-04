# 海隅 SEA DESK · 跨境消息协作台

合规优先的多渠道消息协作工作台，用于统一处理求助咨询、线索上报与服务工单。界面全量可见、操作全程留痕。

## 用途

这个仓库是**求助侧工具**：给被困在东南亚诈骗园区的人，以及他们的家属用。它不是园区管控工具。

它做三件事：

1. **求助**：受困者在确认安全的前提下，通过一个伪装成汇率换算的页面提交位置、状况和请求（`/help`），不联网静默、可一键退回
2. **转达**：接应团队在受控后台（`/console`，令牌鉴权）审核后，把求助转达给当事人指定的家属；短信内容写明情况、核对信息和"核实前不要转账"，**由家属自己决定信不信、要不要行动**
3. **接应**：家属侧有三步处置、报警与领事保护渠道、按编号查进度（`/family`），以及可打印、可断网打开的离线卡（`public/seahelp-card.html`）

明确不做：多账号聚合群发、云手机批量控制、隐藏窗口或进程、反取证，以及任何帮助园区监控或控制人的能力。

面向受困者的功能都按"被发现就会危及当事人"来设计：不发起第三方请求、不留本机副本、可一键退回、受理编号带随机后缀不可枚举；服务端记录 90 天自动清理。

## 一键部署

前置：Docker Desktop（本地）或 Docker Engine + Compose 插件（服务器）。两端命令相同。

```bash
git clone https://github.com/liusbubf/cloudphone-mvp.git
cd cloudphone-mvp
./scripts/deploy.sh --demo
```

脚本依次完成：复制 `.env.example` 为 `.env` → 生成随机接应端令牌 → 构建镜像 → 启动容器 → 轮询 `/api/health` 直到通过 → 打印地址与令牌。

| 场景 | 命令 |
| --- | --- |
| 带演示数据启动 | `./scripts/deploy.sh --demo`（首次启动写入 4 条虚构记录） |
| 正式启动 | `./scripts/deploy.sh`（不加 `--demo`，`DEMO_MODE=0`） |
| 改端口 | 编辑 `.env` 的 `PORT`，重新执行脚本 |
| 查看日志 | `docker compose logs -f sea-desk` |
| 更新版本 | `git pull && ./scripts/deploy.sh` |
| 停止 / 连数据一起删 | `docker compose down` / `docker compose down -v` |

数据存在 Docker 命名卷 `relay_data`（容器内 `/app/.data`），`down` 不会丢，`down -v` 才会清空。

不用 Docker 也可以直接在服务器跑：

```bash
npm ci
npm run build
RELAY_CONSOLE_TOKEN=<你的令牌> npm start
```

生产环境请在前面加 Nginx 或 Caddy 终止 HTTPS，只对外暴露 443，`3100` 不要直接暴露公网。

## 模块

- `app/page.tsx` 总览：KPI、渠道入站分布、高风险队列、最近审计、求助渠道
- `app/inbox` 统一收件箱：会话列表、线程、模板套用、发送与归档
- `app/leads` 线索与上报：线索登记、分级派发、证据元数据留存、转介
- `app/tickets` 服务工单：状态流转、指派、内部备注与回复
- `app/help` 求助端：伪装为汇率工具，连点标题三次或 `Ctrl+Shift+H` 进入，含紧急渠道、联系家人、求助提交
- `app/family` 家属端：三步处置、12308 / 96110 一键拨号、核对清单、失联报案登记、可打印
- `public/seahelp-card.html` 离线求助卡：单文件、无外部资源、断网可开，可存入手机或打印
- `app/audit` 审计与合规：完整日志、CSV 导出、留存与限速策略
- `app/console` 机构后台：令牌鉴权、求助列表、状态流转、家属转达
- `app/api/relay` 中继接口：公开提交、编号查询，以及鉴权的列表/流转/转达接口
- `app/api/health` 健康检查：容器健康探针与部署脚本等待就绪使用
- `scripts/deploy.sh` 一键部署；`scripts/seed-demo.mjs` 演示数据；`scripts/sms-self-test.mjs` 短信自检
- `app/channels` 渠道账号：连接状态、接入前检查清单、团队成员

## 与 Ferdium 集成

`recipes/seahelp/` 是一个标准 Ferdium 配方（`package.json` + `index.js` + `icon.svg`）。

1. 把 `recipes/seahelp` 复制到 Ferdium 的开发配方目录（macOS `~/Library/Application Support/Ferdium/recipes/dev/`，Windows `%APPDATA%/Ferdium/recipes/dev/`）
2. 重启 Ferdium，在「添加服务」中选择 **Sea Help**
3. 配方默认加载 `http://localhost:3100/help`，可按实际部署地址改 `config.serviceURL`

配方只是 webview 封装，不能注册系统级全局热键，也不提供隐藏窗口/进程能力。

## 运行

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## 数据说明

当前全部为本地 mock 数据与 mock 适配器，未接入任何外部平台。状态保存在浏览器 `localStorage`，可在「审计与合规」页重置。

接入真实平台前需满足：账号为本人或本机构所有、具备官方 API 凭据、用途符合平台条款与当地法律。

## 中继服务

求助端提交会 `POST /api/relay`，服务端写入 `.data/relay.json`（已加入 `.gitignore`），返回带随机后缀的受理编号；家属在 `/family` 按编号可查询处理状态。编号形如 `LD-2026-421-7QX9`，后四位随机，顺序号不可枚举。

| 环境变量 | 说明 |
| --- | --- |
| `RELAY_CONSOLE_TOKEN` | 接应端令牌。未设置时 `/api/relay/admin` 一律返回 503；设置后在 `/console` 填入同一令牌即可列出求助并流转状态 |
| `RELAY_WEBHOOK_URL` | 可选。新求助以 JSON POST 到该地址，用于对接机构工单系统；失败不影响受理 |
| `ALIYUN_SMS_ACCESS_KEY_ID` / `ALIYUN_SMS_ACCESS_KEY_SECRET` / `ALIYUN_SMS_SIGN_NAME` / `ALIYUN_SMS_TEMPLATE_CODE` | 四项齐全时优先走阿里云短信。模板必须先在控制台报备通过，变量名与 `ALIYUN_SMS_TEMPLATE_PARAMS` 一致 |
| `ALIYUN_SMS_TEMPLATE_PARAMS` | 模板变量名到字段的映射，默认 `{"ref":"ref","name":"name","verify":"verify","place":"place","state":"state"}`；每个变量超过 40 字会被截断 |
| `ALIYUN_SMS_REGION` | 默认 `cn-hangzhou` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | 三项齐全时走 Twilio 直发。`TWILIO_FROM` 为已购买号码或字母发送方 ID |
| `TWILIO_API_BASE` | 可选，默认 `https://api.twilio.com`，仅用于自建网关或本地联调 |
| `SMS_WEBHOOK_URL` | 通用网关（直发通道未配置时生效），接收 `{ to, channel, message, ref, segments }` 的 JSON POST。短信为两条（每条 ≤70 字）放在 `segments`，`message` 为拼接全文；`channel` 为 `sms` / `whatsapp` / `email` |
| `RELAY_RETENTION_DAYS` | 默认 90。超期记录在下次写入时清除 |

优先级:`ALIYUN_*` 四项齐全 > `TWILIO_*` 三项齐全 > `SMS_WEBHOOK_URL` > 都不配（进入 `.data/relay-outbox.json` 待发队列，由值班人人工发送）。

阿里云走的是**报备模板**模式，不能发自由文案:模板里用变量(如 `${name}`、`${ref}`),JSON 参数由上面的映射填充。建议报备成这样一条:

> 【海隅】编号 ${ref},${name} 求助,核对信息 ${verify},位置 ${place}。请回拨核实,核实前不要转账。

模板审核通过后把变量名填进 `ALIYUN_SMS_TEMPLATE_PARAMS` 即可,不用改代码。

## 上线自检

```bash
cp .env.example .env.local     # 填入令牌与本机号码
npm run build && npm start
npm run sms:test -- +8613xxxxxxxxx
```

自检只发一条固定文案,不经过求助记录、不写入 outbox,用来确认号码可达、短信不长乱码。返回 `OK: sent` 表示通道正常;`FAIL: Twilio 401` 多为密钥错误,`FAIL: gateway 4xx` 为网关参数或号码格式问题。

家属转达是**人工动作**：接线员在 `/console` 点「发送家属通知」，服务端按固定模板生成消息（编号、核对信息、情况说明、核实前不要转账、12308），每个编号只能发送一次，结果写入 outbox 并回填 `notifiedAt`。是否相信、是否采取行动，由家属自己判断。

状态流转固定为 `已受理 → 跟进中 → 已转介 → 已结案`，不可回退、不可跳跃；每次变更追加到 `.data/relay-audit.json`（保留最近 500 条）。

接应端已加令牌鉴权与状态流转，但仍无账号体系、操作者身份校验与 IP 白名单；`.data` 只应部署在受控服务器上，不要放进公开仓库或公开静态托管。

## 设计边界

本系统不提供、也不会加入以下能力：老板键/全局隐藏、进程或窗口伪装、托盘隐藏、反取证、账号池代管、云端多开设备控制。

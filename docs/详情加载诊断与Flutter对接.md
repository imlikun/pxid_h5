# 详情慢加载诊断与 Flutter 对接

更新：2026-10-10。覆盖动态详情、商品详情和发现页内嵌动态详情。

## 本次修复与尚待确认的原因

- 商品详情已有列表快照时立即展示，并在完成首帧后通知 App。此前商品页没有动态详情已有的 `ToFlutter_H5PageReady` 通知。
- 来源链接已包含 `region` 时，商品详情请求与语言初始化并行，避免等待第二次原生语言桥调用。
- 前端详情请求的连接与响应体读取均限时 9 秒。商品失败后重试一次，间隔 300ms；离页取消、不重试。服务端 Shopify 上游读取限时 7 秒。动态接口失败保留可用快照，无快照显示真实错误与重试。
- 官方标识与作者同排；推荐卡片话题移到作者与互动行之后。图片数量布局、图片预览、购买选项和折叠屏分栏规则保留。

这些是代码可确认的等待风险。尚不能断定用户遇到的每次慢加载都是它们导致；新的耗时记录用于复现时区分原生交接、页面启动、接口与图片加载。2026-09-19 的原生重复重载记录只能作历史线索，不能证明当前原因。

## 记录和上报

每次详情打开最多保留 30 条本地会话记录。正常打开不上报。达到 2.5 秒的内容显示、首张图片显示、启动或接口等待，或者发生请求失败，会向 `POST /diagnostics/detail` 上报一次；页面或媒体仍等待超过 10 秒也上报一次。一次打开至多一次上报，不重试；先报等待的情况下，后续完成信息仍更新在本地记录里。

记录只包含页面类别、随机记录号、布尔状态、耗时、HTTP 状态与服务端请求号。不上传账号、token、动态正文、商品内容、页面 URL 或 query。服务端采用字段白名单、大小限制和每 IP 每分钟 12 次限流。

浏览器开发者工具可读取当前 WebView 的记录：

```js
window.__PXID_DETAIL_DIAGNOSTICS__.read()
// 如需清除本地记录：
window.__PXID_DETAIL_DIAGNOSTICS__.clear()
```

服务端在 `pxid-feed` 日志中用 `[detail-client]` 标记慢加载，用 `[detail-api]` 标记对应详情接口。客户端 `request.id` 与服务端记录的 `id` 对应；接口同时提供 `Server-Timing` 和 `X-Request-ID` 响应头，允许浏览器读取。

## 如何判断耗时

| 字段 | 含义 |
|---|---|
| `kind` / `embedded` | 动态或商品，是否为折叠屏内嵌阅读器 |
| `stages.bootstrap` | 冷启动导航到详情组件开始的时间，包括 HTML、入口和页面模块；同一 WebView 后续路由不重复记录 |
| `stages.handoff` | 点击入口到详情组件开始的时间，仅在两个同源 WebView 共享存储时可用 |
| `stages.locale` / `auth` | 请求前等待语言或公开读鉴权的时间；已有地区的商品不等待语言桥 |
| `stages.data` | 组件等待完整详情的总时间，可能包含预取缓存、重试 |
| `stages.content` | 组件开始到可读内容完成首帧的时间，有快照通常显著早于接口完成 |
| `stages.media` | 组件开始到第一张正文图片或视频元数据可用的时间，不代表所有图片已完成 |
| `request.duration` / `headers` | 最近一次详情请求到响应体读完、响应头到达的耗时 |
| `request.server.app` / `shopify` | 同一请求在 H5 后端、Shopify 上游的耗时，来自服务端响应头 |
| `source` / `notified` | 内容来自快照、接口或空状态；是否成功调用原生 PageReady channel |

`bootstrap` 和 `handoff` 有重叠；`data`、`content` 和 `media` 也可能并行。不要把这些字段相加。图片失败不会被记为图片显示成功。上述记录不是 LCP、INP 或原生加载层的直接测量。

- `content` 快而用户仍看到长时间转圈：先检查 `notified`，再检查 Flutter 是否注入 channel、收到通知后是否关闭遮罩，以及是否重复加载 URL。
- `bootstrap` 或 `handoff` 大：检查 WebView 创建、主文档和页面模块加载、原生重复重载。
- `data` 或 `headers` 大而 `server.app` 小：检查设备网络、DNS/TLS、WebView 调度或客户端重试。
- `server.shopify` 大：定位 Shopify 上游，不归因于页面排版。
- `content` 快而 `media` 大：检查图片资源请求、大小和解码。

## Flutter 联调

1. 新动态与商品详情 WebView 注入已有 `ToFlutter_H5PageReady`。payload 保持 `{ route, ms }`，路由校验只看 path，打开商品时完整保留来源 query。
2. 记录原生点击、WebView 创建、loadUrl、PageReady 接收和遮罩移除的时间。不得把 H5 的 `performance.now()` 与原生绝对时钟直接相减。
3. 注入原生桥后，分别验证有快照、无快照、弱网、接口失败、快速返回再打开。PageReady 应每次页面进入只发一次，内容能显示时无需等待图片和评论。
4. 若 H5 记录 `notified:true` 而仍转圈，用原生接收与遮罩移除日志定位；若 `false`，先确认 channel 是否及时注入。H5 不主动操纵原生 loading。

本地自动化全部拦截外部请求：详情检测单元测试、实际组件桥模拟测试和发现页回归，不会发表动态或修改线上业务数据。真机偶发慢加载、真实遮罩移除和 App 内网络状态仍需结合复现日志验证。

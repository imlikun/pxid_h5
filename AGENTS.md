# AGENTS.md · PXID ToC H5（`pxid_h5`）

> **给 AI 编码代理（Codex / Claude / 任何接手的人）**。动手改代码前先读这份；它包含命令、地图、契约与**事故红线**。
> 与任何旧文档冲突时：**以本文件 + 代码为准**（旧文档只作背景）。
> 最后更新：2026-09-11 · 对应 commit `dea3af5`（同日 `cd4e5ab` / `84dfa82` / `c177f59` 等）

---

## 0. 这是什么项目

**PXID（江苏品向智造，电助力车/电摩 OEM）ToC App 的 H5 内容层。**

```
Flutter App（原生壳：底部 5 tab、登录、支付、扫码…）
   └─ WebView 加载 https://appin.site/nav/pxid-h5/
        ├─ 发现 /discover   （社区动态：推荐·动态·广场）
        ├─ 精选 /featured   （Shopify 商城：商品列表·详情·购物车）
        └─ 服务 /service    （道路救援·指南·体检·工单·FAQ·门店…）
```

- 只有这 3 个 tab 是 H5；「购车」「我的」由 Flutter 原生提供。
- H5 与原生通信全靠 `window.PXIDBridge`（原生注入）+ `window.PXIDApp.postMessage`（H5 上报），
  统一封装在 `src/bridge/index.js`。**浏览器里没有桥，会自动走 mock，可独立预览。**
- 配套一个**自建后端**（`server/`，Node + better-sqlite3），线上 pm2 名 `pxid-feed`，
  域名 `https://pxid-api.appin.site`，承载发现/精选/成长/通知/商城下单代理。

---

## 1. 30 秒上手（命令）

```bash
# 依赖（首次；node_modules 已存在就跳过）
npm install

# 本地开发（默认 5173；验证用 4173 便于脚本固定端口）
node node_modules/vite/bin/vite.js --port 4173 --host 127.0.0.1 --strictPort

# 构建（产物 dist/，不入库）
node node_modules/vite/bin/vite.js build
```

🔴 **Windows 沙箱里 `npm run build` 会假死**（实测卡 13 分钟零输出；`npm` 包装层 + `| tail` 管道是元凶，
换「后台跑 + 管道」同样假死 6m38s）。**必须**直跑 vite 且把输出重定向到文件：

```powershell
Set-Location 'D:\品向\pxid_h5'; Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
& 'C:\Users\Kun.li\.workbuddy\binaries\node\versions\22.22.2-3\node.exe' 'node_modules\vite\bin\vite.js' build *> build-out.txt
"EXIT=$LASTEXITCODE"   # 必须为 0
```
日志是 UTF-16LE，Git Bash 里读：`tr -d '\000' < build-out.txt | tail -20`。

### 提交 + 部署（**四远端六条 push，一条不能少**）

```bash
git push origin master        # origin = ECS 裸仓（部署源，ssh://root@101.133.136.140/srv/sync/pxid_h5.git）
git push origin master:main
git push github master        # github = git@github.com:imlikun/pxid_h5.git
git push github master:main
git -c credential.helper= push gitlab master:master   # gitlab = 公司自建 http://47.100.82.63:8099/likun/pxid_h5.git
git -c credential.helper= push gitlab master:main
```

- 🔴 **`-c credential.helper=` 不是可选项**：本机 `credential.helper = manager` 在非交互环境会卡死，
  表现为 **exit 128 且 stdout/stderr 全空**（极难排查）。gitlab 的 token 已内嵌 remote URL，不需要 helper。
- 🔴 三个远端**都各有一个 `main` 分支**。只推 `master` → 另外 3 个 ref 悄悄落后。
- 收尾核验（**必须 6 个 ref 全部 OK**，不能只看 push 回显）：

```bash
LOCAL=$(git rev-parse HEAD)
for r in origin github gitlab; do
  git -c credential.helper= ls-remote $r 2>/dev/null | grep -E "refs/heads/(master|main)$" | while read sha ref; do
    [ "$sha" = "$LOCAL" ] && echo "OK  $r $ref" || echo "LAG $r $ref"
  done
done
```

### 部署上线

```bash
ssh root@101.133.136.140 "bash /root/deploy-pxid-h5.sh"
```
脚本（**不在仓库里，改它必须 ssh 上去改**）做的事：`git pull origin master` → 校验 vite bin →
构建到 `dist.tmp` → 原子 `mv` 替换 `dist`（零空窗）→ 回补上一代 chunk（防旧会话白屏）→
同步 `server.js / moderation.js / ecosystem.config.js` 到 `/root/pxid-feed-server` → `pm2 reload pxid-feed`。

- 🔴 **禁止 scp/tar 直接覆盖 ECS**（2026-08-26 之前的做法，会与 git 状态打架）。
- 🔴 线上目录 `/www/wwwroot/appin.site/nav/pxid-h5/` 是**git 工作副本**，nginx `alias` 指向其中的 `dist/`。
  即 nginx root = `<repo>/dist/`，所以静态资源 URL 是 `https://appin.site/nav/pxid-h5/<dist 内相对路径>`（**不带 `/public`**）。
- 部署后必核：线上 chunk 与本地一致
  `curl -s "https://appin.site/nav/pxid-h5/index.html?nc=$RANDOM" | grep -o 'assets/index-[^"]*\.js'`
  对比 `grep -o 'assets/index-[^"]*\.js' dist/index.html`。

---

## 2. 代码地图

| 路径 | 职责 | 关键点 |
|---|---|---|
| `src/main.js` | 入口 | `initBridge()` + `prewarmAuthToken()`（不预热首屏被 1 个 RTT 挡住） |
| `src/App.vue` | 壳 | `<keep-alive>` + 全局 `<transition>`；首屏 WebView 推入动画（`wvPushIn`） |
| `src/router/index.js` | hash 路由全表 | 40 条，见 §3.1 |
| `src/bridge/index.js` | **原生桥唯一出口** | 两套契约、全屏通道、白名单、根 WebView 判定（§3.2/3.3） |
| `src/views/` | 38 个页面 | 命名 = 路由（`DiscoverView` → `/discover`） |
| `src/components/` | 通用件 | `TopBar / FeedCard / MomentCard / ProductCard / ModelPicker / CommentNode / IconSvg` |
| `src/api/` | 数据层 | `feed.js`（发现）/ `shop.js`（精选，Shopify 代理）/ `growth.js`（积分勋章）/ `notifications.js`（互动消息） |
| `src/store/` | 全局状态（无 Pinia，模块级 reactive） | `cart`（购物车）/ `feedCache` / `noticeStore` / `notificationStore` / `publish` / `ui` |
| `src/utils/` | 工具 | `auth`（登录 Gate）/ `avatar`（头像兜底）/ `device` / `feedSnapshot`（列表→详情快照）/ `hotUpdate`（下拉刷新=换包）/ `videoPoster` / `time` |
| `src/composables/` | 组合式 | `usePageTransition`（转场方向）/ `useSwipeBack`（侧滑返回） |
| `src/data/carModels.js` | **车型唯一数据源** | 12 个在售代号 + `normalizeCarModel()` |
| `src/data/mock.js` | mock 数据 | 接口失败/无接口时的兜底 |
| `src/i18n/index.js` | 三语 | `zh`→CN / `pt`→BR / `en`→US，语言同时决定内容地区 |
| `src/styles/tokens.css` | 设计 token | `--brand:#2563EB`、`--price:#e53935`… |
| `src/storage/index.js` | 媒体存储抽象 | `VITE_STORAGE_DRIVER=local\|oss` |
| `server/` | 自建后端 | `server.js`（~200KB 单文件，28 张表）+ `moderation.js` + `seed-real-posts.js` |
| `docs/` · `INTEGRATION.md` · `FLUTTER_PENDING.md` | 契约/交付文档 | 见 §5 |

---

## 3. 运行时架构要点

### 3.1 路由（hash 模式，`base: './'`）

- 根 tab：`/discover`（默认）、`/featured`、`/service`
- 服务子页：`/service/{rescue,guide,guide/video,guide/manual,check,feedback,policy,stores,workorders,workorders/:id,faq,faq/filter,faq/:id}`
- 商城：`/product/:id`、`/cart`、`/cart/checkout`、`/order/list`、`/order/:id`、`/order/success`
- 内容：`/feed/:id`、`/activity/:id`（同一组件 `FeedDetailView`）、`/activity-center`、`/notices`、`/notice/:id`、`/message`、`/interactions`、`/interaction/:id`
- 其它：`/user/:id`（含 `/user/me`）、`/profile/edit`、`/vehicle/:id`、`/purchase/customize`、`/search`、`/points`、`/points/guide`、`/points/mall`、`/publish`、`/download`
- `meta.hideTabBar` 标记二级页；底部 tab 已**彻底移除**（浏览器预览用 `DemoTabBar`，`?embed=1` 隐藏）。

### 3.2 桥契约（两套，缺一不可）

| 名称 | 方向 | 用途 |
|---|---|---|
| `window.PXIDBridge` | Flutter → H5（Flutter 注入） | H5 调原生：`getToken / getAuthToken / getUserInfo / getDeviceId / getLocale / getRegion / getLocation / getOSSCredentials / pickImages / pickVideo / getFollowList / getFansList / navigateTo / requestPurchase / callPhone / openMap / openShopify / openCheckout / openNative / exit / popPage / setPullRefresh / onOpenDetail` |
| `window.PXIDApp.postMessage` | H5 → Flutter（H5 调用） | 二级 WebView 回传：`closeWebView` 等 |

- `bridge` 对象对每个方法都做了 **mock 兜底**（`isNative === false` 时返回假数据），所以浏览器能跑通。
- `openNative(path)` 的 `id` 是**约定字符串**（如 `vehicle/F2`、`buy/customize?...`），全表见 `INTEGRATION.md §1.3`。
  ⚠️ 传 H5 内部复合 id（如 `vehicle/scooter-F2`）Flutter 不认识 → 点击无反应（**踩过**）。

### 3.3 全屏二级页通道（重要）

根 WebView 里打开二级页**不能裸 `router.push`**，否则页面开在根 WebView 内、底部露出 Flutter 原生 tab。正确姿势：

```js
// 1) 统一入口
if (bridge.openFullscreenRoute('/feed/123')) return   // 根 WebView + 白名单 → 发 ToFlutter_H5OpenFullscreen
router.push('/feed/123')                              // 否则（预览/旧 App/已在二级页内）自动回退
```

- 白名单真源：`src/bridge/index.js` 的 `FULLSCREEN_WHITELIST`（15+ 条正则，当前含 `/feed/:id`、`/notice/:id`、
  `/product/:id`、`/cart`、`/order/list`、`/vehicle/:id`、`/purchase/customize` 等）。
  **新增全屏落地页必须两处同步**：H5 白名单 + **通知 Flutter 侧加白名单**；漏 H5 = 回退 push 露底栏，漏 Flutter = 点击无反应。
- 判定根 WebView：`isRootWebView()`；判定「本 Web 内是否第一层」：`isWebViewFirstPage()`（用「当前 hash 路径 === 本 WebView 启动路径」比对，**不要用 history position**，Vue Router 初始导航 position=1 不可信）。
- **全屏页返回按钮必须走护栏**：`bridge.isWebViewFirstPage()` → `PXIDApp.postMessage('closeWebView')`，否则 `router.back()`。
  裸 `router.back()` 在全屏第一层点了没反应。参考 `FeedDetailView.goBack()` / `VehicleDetailView.goBack()`。

### 3.4 数据层：接口优先 + mock 兜底

- `src/api/feed.js` 顶部常量 `FEED_API = 'https://pxid-api.appin.site'`：有值走真实接口，请求失败/无值回落 `data/mock.js`。
- 登录态：所有需登录交互统一走 `src/utils/auth.js` 的 Gate；token 由 `bridge.getAuthToken()` 拿（真机优先 `getUserInfo().token`，回退 `getToken()`）；`main.js` 已做 `prewarmAuthToken()`。
- 商品/地区：`src/api/shop.js` 的 `region` 由**界面语言**映射（`zh→CN / pt→BR / en→US`），不再由 Flutter 单独注入。
- 购物车 `src/store/cart.js` 本地持久化；结算走**后端** `POST /mall-api/checkout-v2`（后端建 Shopify 车 + 预填邮箱/地址/region）→ 拿 url → `bridge.openShopify(url)`。

### 3.5 两个容易改错的机制

1. **keep-alive + 全局 transition**：`App.vue` 用 `<transition>` 包 `<keep-alive>`。红线：
   ① 不给 `.app-root` 加 transform；② 只允许转场的一方 `position: fixed`；
   ③ `<Transition>` 必须**单根**（多根 fragment 静默失效）；
   ④ keep-alive 下 CSS animation 会重播 → **播完即摘类**；⑤ 滚动恢复在 `scrollBehavior` 内直接做（enter 钩子更早）。
2. **下拉刷新 = 热更新**（`src/utils/hotUpdate.js`）：下拉时比对线上 `index.html` 引用的 JS 包 hash
   与当前页面加载的是否一致 —— 不一致 → `location.reload()` 整页重载（拿新包），一致 → 只重拉数据。
   因此 **nginx 入口必须是 `no-cache`**（已配），改完部署后用户下拉即见新版本。

---

## 4. 后端 `server/`

- 栈：Node ≥18 + Express 4 + **better-sqlite3** + multer + sanitize-html + filter-sensitive-word。
- 启动：`cd server && npm install && node server.js`（端口 `PORT`，线上 8700）；线上由 pm2 管理（`pxid-feed`，配置 `server/ecosystem.config.js`）。
- 本地/线上同一个库文件：线上 `/root/pxid-feed-server/feed.db`。改库/灌种子：`DB_PATH=/root/pxid-feed-server/feed.db node xxx.js`（**脚本要手动 scp 上去**，部署脚本只同步 `server.js/moderation.js/ecosystem.config.js`）。
- 路由分组（完整表见 `server.js` 里的 `app.get/post`）：
  - 社区：`/feed`（GET 列表/POST 发帖/`/:id` 详情/`/:id/{like,comment,favorite,report}`、`/feed/me`、`/feed/liked`、`/feed/users`、`/footprints`、`/favorites`、`/follow*`
  - 内容运营：`/banners`、`/plaza-grid`、`/activities*`、`/featured-config`、`/app-download/links`、`/notifications*`
  - 商城（**实际存在的 8 个**）：`GET /mall-api/{config,products,products/:handle,orders}`、`POST /mall-api/{checkout,checkout-v2,orders/claim,webhook/orders}`
  - 成长：`/growth/{profile,points-products,points-exchanges,points-exchange,signin,medals}`
  - 身份/媒体：`/auth/token`、`/users/me`、`/users/:deviceId`、`/media/{upload,sts}`、`/ban-sync/from-toc`
  - 运营后台（需 `ADMIN_TOKEN`）：`/admin/*`（feed、banners、plaza-grid、activities、banned-words、moderation-logs、reports、upload…）
  - 智能助手：`POST /assistant/chat`（DashScope 百炼，未配 key 时降级演示回复）
- 数据表 28 张（`CREATE TABLE IF NOT EXISTS`）：`feeds / comments / feed_likes / favorites / follows / footprints / user_profiles / profile_aliases / banners / plaza_grid / activities / activity_* / notifications / reports / banned / banned_words / moderation_logs / growth_* / featured_config / app_download_config / d_mall_order_map`
- `server.js` 共 **101 个路由**（`grep -cE "^app\.(get|post|put|delete|patch)\(" server/server.js` 自查）。
- 🔴 **密钥全部集中在 `server/ecosystem.config.js`（`ADMIN_TOKEN`、`SHOPIFY_WEBHOOK_SECRET`、`USER_TOKEN_SECRET`、`DASHSCOPE_API_KEY`）**。
  这是**安全债**：文件已入库。代理**绝对不要**把密钥值复制到任何新文件、文档、日志、提交信息里；
  需要新增密钥时改 `.env.example` 占位 + 线上 pm2 env 注入，不要硬编码进 `server.js`。
- 后端 fail-closed 策略（2026-08-20 起）：`ADMIN_TOKEN` 未配 → admin 接口 500；`SHOPIFY_WEBHOOK_SECRET` 未配 → webhook 503。

---

## 5. 文档索引（**先查这里，别重复造**）

| 文档 | 什么时候读 |
|---|---|
| `AGENTS.md`（本文） | 任何时候，动手前 |
| `INTEGRATION.md` | **Flutter ↔ H5 桥契约唯一总纲**（术语表 / 主桥方法清单 / `openNative` 标识全表 / 验收清单 / 五步结构：现状→卡点→要 Flutter 做什么→怎么做→最终效果） |
| `docs/PXID_H5_项目进度总览.md` | 想快速知道「做到哪了」 |
| `docs/PXID_ToC_后端接口规范.md` | 改后端接口 / 对接数据 |
| `docs/PXID_ToC_完整产品功能文档.md` | 产品功能面全景 |
| `docs/PXID_Shopify_对接契约_Codex版.md` · `docs/PXID_Shopify_结账桥接_Flutter版.md` | 商城 / Shopify / checkout-v2 |
| `docs/车型标准清单.md` · `docs/语言与地区规则_Flutter对接.md` · `docs/PXID_多国定位_i18n_对接规范.md` | 车型代号 / 多语言多地区 |
| `docs/Flutter_桥方法对接.md` · `docs/发布_Flutter对接.md` · `docs/用户主页_Flutter对接.md` · `docs/Flutter_我的页四格统计对接-2026-08-29.md` | 各专题 Flutter 对接 |
| `docs/PXID_迁移_服务接管_热更新_对接.md` | 迁移 / 服务接管 / 热更新 |
| `docs/ToC_App_视觉开发规范.md` | 视觉规范 |
| `FLUTTER_PENDING.md` · `HANDOFF.md` | Flutter 待办 / 交接快照（历史） |

---

## 6. 红线（违反 = 线上事故）

1. **不改 `dist/`**（构建产物，不入库）；本地构建通过再推。
2. **不 scp/覆盖 ECS**；只走 `git push origin` + `/root/deploy-pxid-h5.sh`。
3. **不 force push**；推前判分叉（`git log HEAD..origin/master --oneline` 必须为空），有分叉先问人。
4. **四远端六 ref 全推**，收尾用 `ls-remote` 核验（push 回显 "up-to-date" 不可信）。
5. **新增全屏落地页**：H5 白名单 + Flutter 白名单两处同步，且补 `goBack()` 护栏。
6. **`openNative` 只能传契约标识**（`vehicle/F2`），不能传 H5 内部 id。
7. **头像 URL 必须完整 `https://`**（`feeds.avatar`/`comments.avatar`；相对路径会静默降级成 SVG 占位，极难排查）。
8. **车型值必须过 `normalizeCarModel()`**（`p2`/`scooter-P2` 都要认），展示统一用代号 `P1…G1`。
9. **跨页通用件必须抽组件**（TopBar / 卡片 / 筛选条），不许每页各写一份。
10. **默认值类改动必须带空数据兜底**（例：发现页「我的车」默认筛选 —— 库里没该车型内容时静默回「全部」，否则用户进页面看到空白页）。
11. **密钥不进代码/文档/日志**（见 §4）。
12. 改 `server/server.js` 后**记得它会随部署脚本自动同步**；新增独立脚本必须手动 scp + 记录。

---

## 7. 验证配方（**别凭感觉，别只看截图**）

1. 本地构建 → 部署 → **chunk hash 比对**（§1）。
2. 浏览器/沙箱验证用 **Playwright + 假桥**：`ctx.addInitScript` 注入
   `window.PXIDBridge = { isNative: true, getUserInfo/getToken/getLocale/getRegion/getDeviceId/getOSSCredentials/getLocation ... }`，
   然后**真点 DOM**，断言「发了什么 channel / hash 变没变 / 卡片数量」。
   - ⚠️ `addInitScript(fn, arg)` 的 `arg` 会被序列化，**函数会丢** → 假桥必须在函数体内构造。
   - ⚠️ 假桥**方法缺一个就可能让 onMounted 提前抛错**，后面逻辑整段不执行（假 FAIL）。
   - ⚠️ 各 context 的 `localStorage` 实测会串 → 每个 context 开头先 `localStorage.clear()`。
   - ⚠️ **禁固定 `waitForTimeout`**：要拉接口的页面渲染耗时波动大（2.9~8s），一律 `waitForFunction` 轮询目标 DOM。
   - 现成脚本（`D:/WorkBuddy/2026-09-03-13-55-54/`）：`verify-firstpage.mjs`（返回/关闭）、`verify-vehicle.mjs`（全屏落地页）、
     `verify-default-car.mjs`（绑定车型 6 断言）、`probe-chips-content.mjs`（逐 chip 内容量 + 截图）、`verify-pcard.mjs`（本地接口 mock）。
3. 🔴 **本地 dev（`127.0.0.1`）不在后端 CORS 白名单** → `/feed`、`/mall-api/*`、`/auth/token` 会被拦，
   页面可能空白。**数据类验证一律上线后跑**，或本地用 `page.route` mock。
4. 沙箱里给脚本建 `node_modules` junction 后，**删除必须 `fs.unlinkSync`**（`rm -rf` 会穿透删掉全局 workspace）。

---

## 8. 历史事故（别再犯）

| 事故 | 根因 / 教训 |
|---|---|
| 全站 404 约 8 秒 | 旧部署脚本 `rm -rf dist` → build 之间线上无文件。已改 `dist.tmp` + 原子 mv（2026-09-01）。 |
| 部署后老会话点懒加载页**白屏** | 删掉上一代 chunk，而旧 WebView 还持有旧 index.html 的模块清单 → 404。已改：回补上一代 assets + router.onError 捕获 chunk 404 → `location.reload()`。 |
| `location.replace(同源 hash-only)` 不刷新 | 只触发 hashchange，兜底必须用 `reload()`。 |
| 桥接改了 API 名/结构 | 每次改 `bridge` 必须同步 `INTEGRATION.md`，并通知 Flutter（否则静默失效，无报错）。 |
| 「我的车」chip 不显示 | Flutter 传 `p2` / `scooter-P2`，旧代码 `includes()` 严格比对 → 静默吞掉。已加 `normalizeCarModel()`。 |
| 视频/图片上传后打不开 | OSS 凭证/URL 拼错；头像相对路径被降级为占位图（§6.7）。 |
| 视图消失 / 帖子不显示 | 搜索态会整块隐藏列表，切 tab 必须 `showSearchResults=false`。 |
| 顶栏 44px 兜底事故 | Flutter 已注入 `env(safe-area-inset-top)`≈44px，H5 又叠一层 → 88px。**不要重复兜底安全区**。 |
| pre-commit hook 拦死提交 | hook 内 `grep` 拿不到 PATH → 全部判失败。识别：`bash .git/hooks/pre-commit` 满屏 `grep: command not found`；**不要因此回退代码**。 |

---

## 9. 已知问题 / 未完成（改前先看这条）

- **内容 carModel 标签缺失**：线上首屏 15 条里仅 `P5` 有 2 条打了车型标签，P1~G1 全空 →
  「默认筛我的车」目前多数会落到兜底的「全部」。要真正见效需内容侧补标签，或 H5 切服务端过滤
  （后端 `/feed` **已支持 `carModel` 参数**，前端暂未用，仍在纯前端过滤）。
- **车型页冷加载 2.9~8s**（`VehicleDetailView` 先拉商品全列表再拉单品详情），加载态仅一行文字；提速方向 = sessionStorage 快照（同 `feedSnapshot.js`）。
- **缩略图未压**：首屏图 760KB → 目标 ~40KB。
- **评论 DELETE 接口后端未实现**（测试数据只能进 SQLite 删）。
- **订单详情 / 退货申请的后端接口不存在**：前端 `OrderDetailView` 调 `/mall-api/order/:id`、`OrderListView` 调
  `/mall-api/order/return-request`，后端只有 `/mall-api/orders`（列表）—— 目前靠前端本地降级兜着，
  要真做订单详情得先补后端。
- **`/purchase/customize`（`CustomizeView`）零入口**（路由与白名单保留）——「立即定制」现指向 `/vehicle/ant5`。
- **商品图仍有占位图**（`public/plaza_*.jpg` 未入 git，别引用）；部分封面为设计稿原图。
- **`pxid-feed` pm2 重启计数偏高**（312 次）——如需稳定性排查，看 `pm2 logs pxid-feed --err`。
- **ECS 上还跑着别的服务**（`chongjida-api` / `pxid-admin` / `pxid-cms` / `pxid-large-screen` / `store-dms`）——**别乱动、别 reload**。
- 安全债：`server/ecosystem.config.js` 明文密钥入库（§4）。

---

## 10. 与坤哥（项目 owner）协作的方式

- **回复要短**：第一行结论 → 最多 3 条要点 → 结束。不要多级标题、不要 2 张以上表格、不要大段说明。
  （他明确说过「读下来有点乱」「这些都是过程中的，最终产品 ok 就行」。）
- **问题处理必须走五步**，并在回复里用颜色标注：🔴 读代码（先读清楚，禁凭印象猜）→ 🟠 找问题（定位唯一根因）
  → 🟡 提方案（2-3 个 + 影响面，拍板后再动）→ 🟢 解决（改完部署 + 实测）→ 🔵 收尾（状态干净 + 记录）。
- **别把负担推回给他**：不要让他「自己另存一份 / 自己去翻 / 自己记住」；要给可直接用的东西。
- **一次改齐**：同一类入口/同类问题一次改完，避免两处不一致。
- 交付物要给**精确文件路径**、要**上线可验证**（给地址/截图）；占位媒体明确标 `【这里是一张图片】`。
- 手机是 vivo X300 Pro（宽屏）：chip/横滚条**单行不换行**，字号留余量。
- 视觉：macOS 风格 + Apple 极简（克制 / 通透 / 留白 / 单一品牌色），HTML 用系统字体、不依赖外网。

---

## 11. 快速自检（改完问自己）

- [ ] 本地 `vite build` EXIT=0 ？
- [ ] 影响桥契约吗？→ 改 `INTEGRATION.md` + 列给 Flutter 的待办
- [ ] 新增路由在 `FULLSCREEN_WHITELIST` 里吗（且通知了 Flutter）？
- [ ] 全屏页返回走护栏了吗？
- [ ] 默认值/筛选有空数据兜底吗？
- [ ] 六 ref 推全并且 `ls-remote` 核验过？
- [ ] 部署后线上 chunk = 本地 dist，功能实测过（不是「应该没问题」）？
- [ ] 工作区干净、临时文件（junction / 截图 / 日志）清理了？

# PXID H5 项目进度总览

> 用途：换会话/换人时快速对齐「做到哪了」。
> 🔴 **操作手册请读仓库根的 [`AGENTS.md`](../AGENTS.md)**（命令 / 代码地图 / 契约 / 红线 / 事故）。
> 最后更新：2026-09-11（对应 commit `dea3af5`）。

---

## 1. 项目定位

- **是什么**：PXID（江苏品向智造）ToC App 的 **H5 内容层**，嵌入 Flutter App 的 WebView 运行。
- **承载的 tab**：发现（`/discover`）/ 精选（`/featured`）/ 服务（`/service`）；「购车」「我的」由 Flutter 原生提供。
- **技术栈**：Vue3 + Vite，hash 路由（`base: './'`），无 UI 库（组件全手写），无 SSR。
- **仓库**：`pxid_h5`（本地 `D:/品向/pxid_h5`，Windows 为准；macOS 侧只读不改）。

---

## 2. 环境与部署（必读）

| 项 | 值 |
|---|---|
| 线上地址 | `https://appin.site/nav/pxid-h5/`（nginx alias → 仓库内 `dist/`） |
| 后端 API | `https://pxid-api.appin.site`（自建，pm2 `pxid-feed`） |
| 构建 | `node node_modules/vite/bin/vite.js build` → `dist/`（**Windows 禁用 `npm run build`，会假死**） |
| 部署 | `git push` 后 `ssh root@101.133.136.140 "bash /root/deploy-pxid-h5.sh"` |
| 推送 | **四远端六 ref**：origin / github / gitlab × master / main（详见 `AGENTS.md` §1） |

- 部署脚本做的事：`git pull` → 构建到 `dist.tmp` → 原子替换 `dist`（**零空窗**）→ 回补上一代 chunk（防旧会话白屏）
  → 同步 `server.js / moderation.js / ecosystem.config.js` 到 `/root/pxid-feed-server` → `pm2 reload pxid-feed`。
- 🔴 **禁止 scp/tar 覆盖 ECS**；线上目录是 git 工作副本，只能通过 git + 脚本更新。
- 部署后核验：线上 `index.html` 引用的 chunk hash 必须等于本地 `dist/index.html` 里那个。

---

## 3. 后端架构边界（极易混淆）

| 角色 | 谁 | 说明 |
|---|---|---|
| 社区/商城/成长后端 | **我们自建** | `server/server.js`（Node + better-sqlite3，SQLite `feed.db`，28 张表，101 个路由），线上 `pxid-api.appin.site`，pm2 名 `pxid-feed` |
| 正式 ToC 中台 | 公司 ToC 网关（另一团队） | 账号体系 / 封禁同步（HMAC，见 `.env.example`），H5 侧只做对接 |
| Shopify | 独立店铺（另一同事用 Codex 写） | 多国每国一店；H5 **不自建支付**：后端 `checkout-v2` 建车 → `bridge.openShopify(url)` 打开结账 |

---

## 4. 已完成能力（截至 2026-09-11）

**发现 / 社区**
- 三 tab（推荐 / 动态 / 广场）、车型筛选、Banner 轮播、快捷入口、消息中心（四类）、官方公告（含召回强确认）、活动中心
- 发布动态（图片压缩上传 ≤9 张、关联车型）、内容详情（点赞 / 收藏 / 评论 / 举报）、互动消息、个人主页（四宫格）
- **详情页微信式右进左出转场**（340ms，`cubic-bezier(.32,.72,0,1)`）+ 列表→详情快照直出（`feedSnapshot`，跨 WebView 双写 sessionStorage/localStorage）
- 「我的车」chip：取 `getUserInfo().carModel`（`normalizeCarModel` 归一化）+ **有绑定车型默认筛选** + 空内容兜底回「全部」
- 官方公告详情第一层返回走全屏护栏（`closeWebView`）
- 下拉刷新 = 热更新（比对线上 bundle hash，不一致整页 reload）

**精选 / 商城**
- 商品列表（`GET /mall-api/products`，Shopify 代理）+ 运营配置（`/featured-config`）+ 商品详情
- 加购 → 本地购物车 `/cart` → 确认订单 `/cart/checkout` → 后端 `checkout-v2` → `openShopify` 打开结账
- 订单列表 `/order/list`（`/mall-api/orders` + `orders/claim` 认领）

**服务**
- 道路救援 / 使用指南（视频 + 资料）/ 车辆体检 / 意见反馈 / 三包政策 / 附近门店 / 我的工单 + 工单详情 / 常见问题（搜索 + 筛选 + 详情）

**平台能力**
- 桥接：两套契约（`PXIDBridge` 原生注入 / `PXIDApp` H5 回传）+ mock 兜底，浏览器可独立预览
- **全屏二级页通道**：`openFullscreenRoute` + `FULLSCREEN_WHITELIST`（15+ 条）+ 根 WebView 判定；根页内二级页交 Flutter 新开全屏 WebView（无原生底栏、右滑返回）
- 三语三地区（`zh→CN / pt→BR / en→US`，语言决定内容地区）
- 侧滑返回手势（`useSwipeBack`）、页面转场方向管理（`usePageTransition`）
- 发版白屏防线：部署保留上一代 chunk + `router.onError` 捕获 chunk 404 → `location.reload()`
- 智能助手 PXiD（`POST /assistant/chat`，DashScope）

---

## 5. 关键文件清单（完整地图见 `AGENTS.md` §2）

| 文件 | 作用 |
|---|---|
| `src/bridge/index.js` | 原生桥唯一出口：方法封装 / 全屏通道 / 白名单 / 根 WebView 判定 |
| `src/router/index.js` | 约 40 条路由全表 |
| `src/views/DiscoverView.vue` | 发现页（三 tab + 筛选 + 我的车默认筛选 + 下拉刷新） |
| `src/views/FeedDetailView.vue` | 内容/活动详情（快照直出 + 评论 + 返回护栏） |
| `src/views/VehicleDetailView.vue` | 车型详情（「立即定制」落地页） |
| `src/views/FeaturedView.vue` / `ProductDetailView.vue` / `CartView.vue` | 商城链路 |
| `src/api/feed.js` / `shop.js` | 数据层（接口优先 + mock 兜底） |
| `src/data/carModels.js` | 车型唯一数据源 + `normalizeCarModel()` |
| `src/utils/feedSnapshot.js` / `hotUpdate.js` | 快照直出 / 热更新检测 |
| `src/store/cart.js` | 购物车（localStorage 持久化） |
| `server/server.js` | 后端全部接口（101 路由 / 28 表） |

---

## 6. 硬性要求（接手必看）

- **五步流程**：🔴 读代码 → 🟠 找唯一根因 → 🟡 提方案（拍板后动）→ 🟢 解决 + 实测 → 🔵 收尾（干净 + 记录）。
- **回复要短**：结论 + ≤3 条要点，不要多级标题/大段说明。
- **组件化铁律**：TopBar / TabBar / 卡片 / 筛选条等跨页件必须复用，不许每页各写一份。
- **一次改齐**：同类入口/同类问题一次改完，避免两处不一致。
- **别把负担推回给用户**：不要让他「自己另存 / 自己翻 / 自己记」。
- 手机 vivo X300 Pro（宽屏）：chip 横滚**单行不换行**。
- 视觉：macOS 风格 + Apple 极简（克制 / 通透 / 留白 / 单一品牌色）。

---

## 7. 遗留 / 待办

- **内容 carModel 标签缺失**（线上首屏仅 P5 有 2 条）→ 「默认筛我的车」多数会落到兜底「全部」；彻底解决要靠内容侧补标签或切服务端过滤（后端 `/feed` 已支持 `carModel` 参数）。
- 车型页冷加载 2.9~8s（先拉全列表再拉单品详情），加载态仅一行文字。
- 缩略图未压（首屏图 760KB → 目标 ~40KB）。
- 评论 DELETE 接口未实现；订单详情 / 退货申请接口后端缺失（前端本地降级）。
- `/purchase/customize`（`CustomizeView`）零入口（「立即定制」现指向 `/vehicle/ant5`）。
- 部分图片仍是占位（`public/plaza_*.jpg` 未入 git，勿引用）。
- 安全债：`server/ecosystem.config.js` 明文密钥入库。
- `pm2 pxid-feed` 重启计数偏高（312 次），需要时排查 `pm2 logs pxid-feed --err`。

---

## 8. 接手三步

1. 读 `AGENTS.md` → 确认需求 → 改代码（手术式，先读再动）。
2. 本地 `vite build`（EXIT=0）→ 提交 → **六条 push** → `ssh … deploy-pxid-h5.sh`。
3. 核验：六 ref 一致 + 线上 chunk hash 与本地一致 + 线上实测（App 内下拉刷新即可拿到新版本）。

> 后端在线自检：`curl https://pxid-api.appin.site/health`。


## 2026-09-12 本地修改：精选商品首图和颜色

- 商品卡片、精选 Banner 统一传递首图快照，支持全屏新 WebView 和存储不共享场景。
- 商品详情只请求当前商品，首图保持来源颜色，切色联动真实变体并按需加载图片。取消自动铺开其它颜色图册，描述图片延迟加载。
- 相关文件：`src/utils/productNavigation.js`、`src/utils/productPresentation.js`、`ProductCard.vue`、`FeaturedView.vue`、`ProductDetailView.vue`；query 约定见 `INTEGRATION.md`。
- 验证：构建、11 项浏览器回归、4 项关联测试通过；尚未部署，需真机核验原生完整保留 query。


## 2026-09-12 补充优化：商品详情首屏与推入节奏

- 列表接口增量返回 `imageDetails`（原 `images` 字符串数组保持兼容），首屏快照包含颜色关联、文案、参数和描述。详情回包刷新实时变体数据，保留本次首屏展示文案，避免二次撑开布局。
- 图廊导航叠放于固定图片区，取消下方动态缩略图条；颜色标识保持稳定，不在回包时由色块换成图片。
- 商品详情相关推入/退出改为 500ms、缓和起步曲线；只影响商品详情，减弱动画保留 120ms 淡入。
- 慢接口验证：信息/颜色/规格区在详情回包前后位置一致，首帧颜色选中；图片和异步竞态回归通过。


## 2026-09-12 精选底部按钮留白

App 原生精选根页增加底栏高度与安全区滚动留白，浏览器保留16px基础间距。线上浏览器原布局可滚到底，但模拟原生底栏覆盖会遮住门店按钮；修复后80px底栏覆盖模拟下，首次进入及详情返回均可完整显示并点击。构建与四项浏览器场景通过；仍需App实际底栏核验。

# PXID H5 × Flutter 原生对接总纲（Flutter 必读 · 唯一入口）

> **最后更新**：2026-08-28 11:10 ｜ **基准代码**：`a7b0310`（Flutter 对接总纲，基于代码事实逐条核对版）
> **读者**：Flutter 原生开发同学 ｜ **目的**：**一份文档说清所有 H5 ↔ Flutter 桥接契约与对接步骤**，不再分散到多个文档找来找去  
> **配套（同仓库，按需深读）**：后端 API 见 `docs/PXID_ToC_后端接口规范.md`；视觉规范见 `docs/ToC_App_视觉开发规范.md`；Shopify 结账 Flutter 实现见 `docs/PXID_Shopify_结账桥接_Flutter版.md`  
> **本文件按 🔴现状 / 🟠问题或卡点 / 🟡需要什么帮助 / 🟢怎么做 / 🔵最终效果 五步组织**

---

## 术语表（先统一名称，避免鸡同鸭讲）

| 名称 | 含义 | 备注 |
| --- | --- | --- |
| **精选** | H5 模块 `/featured` | 前端商品展示页，入口在底部 tab |
| **商城** | 精选模块里的购物能力 | 业务概念，不等于独立 App |
| **Shopify** | 后端电商平台 | 商品、库存、结账真相源 |
| **积分好物** | 积分页下方的商品推荐 | 点击跳 Shopify 商品页（现金购买） |
| **积分商城** | `/points/mall` | 纯积分兑换，走自家后端 `/growth/*`，**与 Shopify 无关** |
| **PXIDBridge** | H5 自有主桥 | H5 项目命名，Flutter 注入 `window.PXIDBridge` |
| **PXIDApp** | 积分子桥 | 原生侧命名，仅用于积分页 `closeWebView` |

> 若后续产品定义变化，本文档会更新并标注变更日期与 commit。

---

## 🔴 现状（H5 侧已经做好什么、契约是什么）

### 1.1 两套桥契约（H5 已经定义、等你注入）

**主桥 `window.PXIDBridge`（H5 自有命名）**
- **注入时机**：WebView 加载 H5 **前**注入，实现对象**必须带 `isNative: true`**。
- **判定入口**：`src/bridge/index.js` 里 `isEmbed() = window.PXIDBridge?.isNative === true`。若为 false / undefined，H5 启用 `mockBridge` 兜底（浏览器独立预览用）。
- **调用方式**：业务代码统一 `import { bridge } from '../bridge'`，再 `bridge.xxx(...)`，不直接碰 `window.PXIDBridge`。

**积分子桥 `window.PXIDApp`（积分对接文档规定）**
- **来源说明**：该子桥来自原生/Flutter 侧给 H5 的《积分 H5 返回对接说明》。H5 已按此说明实现关闭逻辑，但**该说明原文目前未落到本仓库**。如 Flutter 同学无原文，可直接按下面规范实现。
- **规范摘要**：原生「我的」页用 WebView 打开 `#/points` 并**隐藏原生返回键**，由 H5 顶部返回键负责关闭 WebView。
- H5 侧逻辑（`src/views/PointsView.vue`）：
  ```js
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    app.postMessage('closeWebView')   // 关闭 WebView，回原生「我的」页
  } else {
    router.back()                       // 浏览器预览兜底
  }
  ```
- **只有积分主页 `#/points` 顶部返回键用 `PXIDApp`**；子页 `/points/guide`、`/points/mall` 保持默认 `router.back()`，不关 WebView。
- **两套桥命名来源不同**：`PXIDBridge` 是 H5 项目自己的桥；`PXIDApp` 是积分对接文档另行规定的。H5 两处都依赖，所以 Flutter **必须两套都注入**。

> **TODO**：请 Flutter 侧把《积分 H5 返回对接说明》原文复制到本仓库 `docs/积分H5返回对接说明.md`，或确认以上摘要即为全部要求。

### 1.2 主桥方法清单（基于 H5 真实调用点整理）

> `getAuthToken` 是 H5 内部封装（优先 `getUserInfo.token` → 回退 `getToken`），Flutter **不需要**单独实现。

**当前 H5 业务代码真实会调用的方法（Flutter 必须提供）**

| 方法 | 签名 | 优先级 | H5 调用场景 | Flutter 职责 |
| --- | --- | --- | --- | --- |
| `getToken` | `() => Promise<string>` | P0 | 登录 Gate、发帖、点赞、评论、订单 | 返回登录态 token；**未登录返回空串** |
| `getUserInfo` | `() => Promise<{email?, nickname?, token?, avatar?, carModel?}>` | P0 | 评论/点赞/发帖带身份、我的车、订单 | 登录后必须返回 `email`/`nickname`/`avatar`/`carModel`；未登录返回 `null` 或空对象。**`avatar` 必须是 https 完整 URL**——禁止 `http://` 明文（H5 跑在 HTTPS 环境，http 头像会被浏览器混合内容策略拦截导致不显示；H5 侧已做 http→https 自动升级兜底，但原生侧应直接给 https） |
| `getLocale` | `() => Promise<{locale, country, currency}>` | P0（多国） | 启动初始化 i18n 与货币 | 返回如 `{locale:'zh-CN', country:'CN', currency:'CNY'}` |
| `openNative` | `(path: string) => void` | P0 | 见 🔴.4 全部标识 | 解析 `module/action?param=value` 字符串，路由到对应原生页 |
| `pickImages` | `({maxCount}) => Promise<[{uri, url, ...}]>` | P0（发布） | 发动态选图 | 唤起原生多选；返回线上 URL 或本地 uri 数组 |
| `openShopify` | `(url: string) => void` | P0（商城） | 商品/去购买/公告外链/积分好物 | **WebView 内打开 URL 或外部浏览器打开**，保留返回 |
| `requestPurchase` | `(payload) => Promise<boolean>` | P1 | 车辆购买/活动/工单支付 | 拉起原生购买/支付；resolve 支付结果 |
| `navigateTo` | `(tab: string) => void` | P1 | 切底部 5 tab | `discover`/`featured`/`purchase`/`service`/`profile` |
| `getRegion` | `() => Promise<string>` | P1 | 活动中心、发布、发现、商城 region | 返回 `CN` / `BR` / `US` |
| `getDeviceId` | `() => Promise<string>` | P1 | 发帖封禁维度 | 返回设备唯一 ID |
| `popPage` | `() => void` | P1 | 根页面侧滑空栈返回 | pop 当前承载 H5 的原生页 |
| `callPhone` | `(phone: string) => void` | P2 | 门店/工单拨号 | 走原生拨号 |
| `openMap` | `({lat, lng, name}) => void` | P2 | 门店/救援/工单导航 | 拉起系统/高德/百度地图 |
| `getLocation` | `() => Promise<{lat, lng}\|null>` | P2 | 发布/发现定位 | 返回当前坐标；用户拒绝返回 null |
| `pickVideo` | `({maxDuration}) => Promise` | P2 | 发动态选视频 | 唤起原生单选视频 |
| `exit` | `() => void` | P2 | 双按退出 | 退出 App（亦兜底 `openNative('app/exit')`） |

**已预留但当前 H5 业务代码未调用的方法（终态规划 / 暂不要求）**

| 方法 | 说明 |
| --- | --- |
| `openCheckout` | H5 目前**直接调用 `openShopify(url)`** 跳 Shopify 结账页，`openCheckout` 暂未启用。若产品后续要改为「Flutter cartCreate → WebView 结账」再接入。 |
| `getOSSCredentials` | 当前 H5 业务代码**未调用**（图片直传暂未启用）。Flutter 可先不实现，H5 走降级；若后续启用图片直传再接入。 |

### 1.3 `openNative` 标识全表（共 23 个约定标识，另 `message/user` 为二期预留未计入）

> 说明：下表 23 个为**约定全集**，每行备注已标注当前状态——服务类 6 个（`vehicle/check`、`vehicle/bind`、`manual/download`、`service/contact`、`service/cancelOrder`、`rescue/submit`）因 `router` 路由级屏蔽 `/service/*` 当前无法触发；`settings/language`、`address/list` 当前 H5 未主动调用（原生侧 / 后续接入）；`purchase/customize` 是 H5 兜底路由，非 openNative 主动触发；其余为 H5 当前实际触发的标识。

| path | 触发场景 | 参数 | 备注 |
| --- | --- | --- | --- |
| `login` | 缺登录跳原生登录 | — | 全局登录 Gate |
| `discover/publish` | 发现页「＋」发布 | 可带 `?content=` 预填文案 | 原生拉起发布器；H5 兜底 `/publish` |
| `purchase/customize` | H5 兜底路由 `/purchase/customize`（非 openNative 主动触发）；实际购车定制**提交**走 `buy/customize` | — | 购车（H5 兜底路由） |
| `vehicle/<id>` | 车型卡 / 动态车型标签 / @车型 | id = 真实型号字符串，如 `P2`、`MOTA Z3` | 购车车型页 |
| `vehicle/check?model=<m>` | 车辆体检 | model | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `vehicle/bind` | 切换/绑定车辆 | — | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `feed/interact?type=like&id=<id>` | 点赞 | type=like, id | **已废弃**（点赞改 H5 后端自管，见 §1.6）；Flutter 无需处理，H5 不再调用 |
| `feed/follow?id=<id>` | 关注作者 | id | 互动 |
| `share/feed?id=<id>` | 分享 | id | 原生分享面板；H5 兜底 Web Share / 复制链接 |
| `address/list` | 结算选地址 | — | 下单（当前 H5 未主动调用，由原生 / 后续接入） |
| `manual/download?model=<m>` | 说明书下载 | model | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `service/contact?orderId=<id>` | 工单联系客服 | orderId | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `service/cancelOrder?orderId=<id>` | 取消工单 | orderId | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `rescue/submit?<params>` | 道路救援提交 | 多参 | 服务（H5 服务模块已屏蔽，实际触发不了） |
| `buy/customize?<params>` | 购车定制提交 | 多参 | 购车 |
| `search?q=<kw>` | 搜索 | q | H5 兜底 `/search` |
| `points/rules` | 积分规则 | — | 积分（H5 等价页 `/points/guide`） |
| `points/guide` | 玩转积分 banner | — | 积分（H5 等价页 `/points/guide`） |
| `points/mall` | 积分商城「更多」 | — | 积分（H5 等价页 `/points/mall`） |
| `points/exchange?id=<id>` | 积分商品兑换 | id | 积分（H5 等价页 `/points/mall`） |
| `settings/language` | 语言/地区切换 | — | 多国（当前 H5 未主动调用，由原生设置页触发 / 后续接入） |
| `user/<deviceId>` | **进入用户主页** | deviceId（需 encodeURIComponent） | H5 内全部 `router.push('/user/<deviceId>')` 不调 openNative；**原生侧入口**需 `openNative('user/<deviceId>')` 透传让 WebView 导航（见「个人主页对接专章」） |
| `app/exit` | 退出兜底 | — | `bridge.exit()` 未实现时兜底 `openNative('app/exit')` |
| `message/user?deviceId=<id>` | 私信（他人主页「发消息」） | deviceId | **二期预留**：Flutter 未实现时 H5 提示「即将上线」，不报错 |

> 字符串约定：`module/action?param=value`，`/` 分隔模块与动作，`?` 后接参数，多参用 `&`，值需 `encodeURIComponent`。❌ 不允许对象形式。

### 1.4 底部 tab 已彻底移除（H5 现状）

- `src/App.vue` 不再渲染底部 tab bar，原生底部 5 tab 始终接管。
- `navigateTo(tab)` 用于 tab 间切换，tab 取值：`discover` / `featured` / `purchase` / `service` / `profile`。
- 原 `?standalone=1` 控制 tab 显隐的逻辑已无作用。`isEmbed()` 现在只决定「走原生实现还是 H5 mock 兜底」。

### 1.5 H5 已具备、已修好的能力（背景交代清楚）

- **切后台点击失效 bug 已修**（2026-08-28，`89f0685`）：`App.vue` 根容器 `.app-root` 常驻 `will-change: transform` 已移除，改 `useSwipeBack` 手势激活时临时加、复位时清除；并加 `visibilitychange` 回前台强制复位 transform + 重建合成层。Flutter 侧**无需改动**，只要正常把 H5 放 WebView 即可。
- **积分返回已对接**：H5 已按《积分 H5 返回对接说明》实现 `PXIDApp.postMessage('closeWebView')`，等 Flutter 注入 `PXIDApp`。
- **商城结账现状（重要）**：H5 当前通过 `bridge.openShopify(url)` 直接打开 Shopify 结账页完成支付，`url` 由后端 `/mall-api/checkout-v2` 生成；`openCheckout` 方法虽在桥里预留，但**业务代码尚未调用**。因此 Flutter 现阶段只需实现 `openShopify`，购买流程即可跑通。
- **我的车 `carModel`**：H5 第一方案读 `getUserInfo().carModel`，Flutter 未返回时回退 `localStorage`（仅兜底）。
- **token 不自签**：H5 已废弃自签 deviceId，登录态完全靠 Flutter 经 `getToken` / `getUserInfo` 注入。

### 1.6 个人主页（H5 已上线六 Tab，路由 `/user/:id` / `/user/me`）

- **页面**：`src/views/UserProfileView.vue` —— 资料卡（头像/昵称/「我」角标/车型标签/关注数/粉丝数 + 自己「编辑资料」/他人「关注+发消息+⋯菜单」）+ 分段 Tab。
- **路由**：`/user/:id` 他人主页；`/user/me` 自己的主页（App「我的」tab 入口）。
- **六 Tab（核心交互升级，2026-08-28 上线）**：
  - **自己 `/user/me`**：动态 · 赞过 · 收藏 · 关注 · 粉丝 · 足迹
  - **他人 `/user/:id`**：动态 · 赞过 · 收藏 · 关注 · 粉丝（**收藏/足迹对他人隐藏**，私密数据不外泄；足迹仅自己可见）
- **用户标识统一用 `device_id`（非昵称）**：后端 `/users/:deviceId` 返回资料，`fetchUserFeeds(deviceId)` 返回动态流。
- **入口分两类**：
  - H5 内点击（作者头像/昵称、`@用户`、互动消息 actor）→ 直接 `router.push('/user/<deviceId>')`，**不依赖原生**；
  - 原生侧入口（Flutter 推送/消息里的 @）→ `openNative('user/<deviceId>')`，原生收到后**让 WebView 导航到 `/user/<deviceId>`**（原生把 deviceId 透传给 H5 路由，不自己渲染）。
- **`@用户` 已修复**（2026-08-28 `c91aa17`）：发布时 `mentions` 带 `deviceId`，后端返回原样对象数组，解析 `@昵称` 反查 `deviceId` 后 H5 内跳转；旧注释「用户主页归原生承载 / H5 暂无用户页」已删除。
- **点赞改 H5 自管（重要契约变更）**：`MomentCard` 点赞不再委托 `openNative('feed/interact')`，改为直接调后端 `POST /feed/:id/like`（`requireAuth`），落 `feed_likes` 关系表、计数器由表实时汇总。**旧契约 `openNative('feed/interact?type=like')` 已废弃**，Flutter 无需再处理点赞（避免双源不一致）。
- **收藏/赞过/足迹数据归属（拍板：H5 自管）**：均存 H5 后端（`favorites`/`feed_likes`/`footprints` 表），不依赖 Flutter。

### 1.7 个人主页后端接口契约（H5 自管，2026-08-28）

| 接口 | 方法 | 说明 | 鉴权 | 状态 |
|---|---|---|---|---|
| `/users/:deviceId` | GET | 公开资料 + isSelf/isFollowing | 可选(Bearer) | 已有 |
| `/feed?deviceId=` | GET | TA 的动态流 | 公开 | 已有 |
| `/feed/liked` | GET | 我赞过的动态（返回项 `isLiked` 恒 `true`） | requireAuth | **新增** |
| `/favorites` | GET | 我收藏的动态 | requireAuth | **新增** |
| `/footprints` | GET | 我浏览过的动态（最近优先、去重） | requireAuth | **新增** |
| `POST /feed/:id/favorite` | POST | 收藏/取消 toggle → `{favorited}` | requireAuth | **新增** |
| `POST /footprints` | POST | 记录浏览足迹 `{feedId}`（详情页打开即记录） | requireAuth | **新增** |
| `/follow/list?device=` | GET | 关注列表（**改返回对象数组** `{deviceId,nickname,avatar,carModel}`） | 公开 | **改** |
| `/follow/followers?device=` | GET | 粉丝列表（同结构） | 公开 | **新增** |
| `POST /feed/:id/like` | POST | 点赞 toggle，落 `feed_likes`，实时汇总计数器 → `{isLiked,likes}` | requireAuth | **改（自管）** |

> 私密性：赞过/收藏/足迹均按 `device_id`（token 解析）隔离，他人不可查。二期能力（私信/编辑资料/举报/拉黑）本期未做：他人主页「发消息」走 `openNative('message/user?deviceId=')` 占位，无原生时 H5 提示「即将上线」。

---

## 🟠 问题或者卡点（Flutter 对接还差什么、有哪些坑）

### 2.1 两套桥缺一不可（最易踩）
- **只注 PXIDApp** → H5 `isEmbed()` 为 false，业务全走 mock，发布/购车/分享等无法唤起原生。
- **只注 PXIDBridge** → 积分页 `#/points` 返回键关不掉 WebView，回不去「我的」。
- 必须**同时注入**两套。

### 2.2 登录态判定易出 bug（历史踩过坑）
- H5 `requireLogin` 三重兜底：`getAuthToken()`（优先 `getUserInfo.token`）→ `getToken()` → `getUserInfo()`，任一非空即放行。
- 历史 Bug：登录后 `getToken` 有值但 `getUserInfo` 为空 → H5 仍判未登录 → 反复弹登录窗。
- 所以登录成功后，**`getToken` 和 `getUserInfo` 必须同时能拿到新值**，且 `getUserInfo` 必须含 `email`/`nickname`/`avatar`/`carModel` 真实值。

### 2.3 积分 WebView 返回必须注入 PXIDApp
- 原生「我的」页 WebView 打开 `#/points`、隐藏原生返回键，H5 顶部返回键依赖 `window.PXIDApp.postMessage('closeWebView')`，缺它就回不去。

### 2.4 车型 / @用户 / 我的动态 边界
- **我的车**：H5 第一方案 `getUserInfo().carModel`，Flutter 必须返回真实在售车型代号（F1/F2/P1/P2/P3/P4/P5/P6/P7/P8/G1/P9）。
- **@用户 / 个人主页**：用户主页是 **H5 页面**（`UserProfileView`），**不是原生页**。H5 内点击作者头像/昵称/`@用户`/互动消息 → `router.push('/user/<deviceId>')`；原生侧入口走 `openNative('user/<deviceId>')` 透传 WebView（见 🔴.6 / 🟢.11）。
- **我的动态**：即 `/user/me` 个人主页（六 Tab 含「动态」），已落地，无需原生页；Flutter「我的」tab 让 WebView 打开 `#/user/me` 即可。

### 2.5 服务类标识：H5 内已无法触发
- `router/index.js` 已对所有 `/service/*` 路由做拦截并重定向到 `/discover`；`src/App.vue` 也不再渲染服务 tab。
- 因此 `service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit` 等标识在 H5 内**实际触发不了**。
- 若原生 App 仍有服务入口（通知/推送/我的订单进入），由原生自己承载，不需要 H5 桥接。

### 2.6 token 签名（后端契约）
- H5 不再自签 deviceId（防自签他人身份）。
- `getToken` 必须由后端 `/auth/token` 生成 HMAC 签名 token（服务端生成 deviceId）。
- Flutter 需让 `getToken` 返回**服务端签名的真实登录 token**；生产环境返回真实 token，mock 环境返回假 token（仅浏览器预览用）。

### 2.7 商城术语与流程易混淆
- 当前真实流程：H5 直接 `openShopify(url)` 打开 Shopify 结账页支付。
- 文档/代码里曾出现 `openCheckout`（Flutter cartCreate → WebView 结账），但**业务代码未调用**。
- 积分好物 ≠ 积分商城：前者跳 Shopify 现金购买，后者走自家后端纯积分兑换。

### 2.8 验收清单尚未通过（当前状态）
- 以下项需 Flutter 自测通过后，联调才算完成（完整清单见 🔵 最终效果）：
  - 双桥注入、发现页「＋」拉起原生发布、`pickImages` 可选图；
  - 车型卡/立即定制 → 原生购车页；未登录点赞/评论/关注 → 跳原生登录 → 返回后已登录（无刷新）；
  - `getUserInfo` 返回真实 `email`/`nickname`/`avatar`/`carModel`；
  - 商品「去购买」→ `openShopify` 打开 Shopify 结账可返回；
  - @用户 → 用户主页；积分页顶部返回键关 WebView；多语言/货币初始化；视觉一致。

---

## 🟡 需要什么帮助（要 Flutter 同学提供 / 确认 / 做掉）

1. **注入两套桥**：`window.PXIDBridge`（`isNative:true`）+ `window.PXIDApp`（`postMessage('closeWebView')`）。
2. **实现 16 个当前 H5 真实调用的主桥方法**（已剔除未调用的 `getOSSCredentials`，见 🔴.2）：P0 先交（`getToken`/`getUserInfo`/`getLocale`/`openNative`/`pickImages`/`openShopify`），其余 P1/P2 按排期。
3. **解析 23 个 `openNative` 标识**：按 🔴.3 全表路由到对应原生页。
4. **登录闭环**：登录成功后 `getToken` + `getUserInfo` 同时返回新值，且 `getUserInfo` 含 `email`/`nickname`/`avatar`/`carModel`/`token`。
5. **我的车**：`getUserInfo` 返回 `carModel`（在售 12 车型之一）；字段兼容 `myCar`/`vehicle`/`bindVehicle`/`boundCar`。
6. **积分 WebView**：「我的」页 WebView 打开 `#/points`、隐藏原生返回键、注入 `PXIDApp` 并响应 `closeWebView`。
7. **商城结账**：当前阶段实现 `openShopify(url)` 即可——在 WebView 内打开 Shopify 结账 URL（由后端生成），保留返回按钮让用户能回 H5。
8. **确认两件事（由产品负责人/坤哥定夺，H5 配合实现）**：
   - **「我的动态」入口**：**已落地**——`/user/me` 即「我的动态流」（H5 个人主页）。Flutter「我的」tab 进自己的主页：让 WebView 打开 `#/user/me`（或 `openNative('user/me')` 透传），无需新增路由。
   - **服务类标识是否保留原生入口**：`service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit` 在 H5 内已无法触发，若原生 App 仍有入口，由原生自己决定承载方式，H5 无需改动。

---

## 🟢 怎么做（具体对接步骤 / 实现方案）

### 4.1 注入时机与示例

- WebView 加载 H5 **前**注入 `window.PXIDBridge`（带 `isNative:true`）。
- WebView 打开 `#/points` 时同样注入 `window.PXIDApp`。
- 所有方法保证异步安全；`getToken`/`getUserInfo`/`requestPurchase` 返回 Promise。

```js
// 主桥（伪代码示意，具体用 Flutter 的 JS 注入通道）
window.PXIDBridge = {
  isNative: true,
  getToken: () => Promise.resolve('<服务端签名 token>'),
  getUserInfo: () => Promise.resolve({ email, nickname, avatar, carModel, token }),
  getLocale: () => Promise.resolve({ locale:'zh-CN', country:'CN', currency:'CNY' }),
  openNative: (path) => { /* 解析 module/action?param=value 路由 */ },
  pickImages: ({maxCount}) => Promise.resolve([/* {uri,url} */]),
  openShopify: (url) => { /* WebView 内打开 url */ },
  navigateTo: (tab) => { /* 切底部 5 tab */ },
  // ...其余方法
}

// 积分子桥（仅积分页返回用）
window.PXIDApp = {
  postMessage: (msg) => { if (msg === 'closeWebView') { /* 关闭 WebView，回「我的」 */ } }
}
```

### 4.2 方法实现要点（按优先级）

- **P0（阻塞联调）**：`getToken` / `getUserInfo` / `getLocale` / `openNative` / `pickImages` / `openShopify`。
- **P1（核心功能）**：`navigateTo` / `requestPurchase` / `getRegion` / `getDeviceId` / `popPage`。（注：`getOSSCredentials` 当前 H5 未调用，已列入 🔴.2 预留表）
- **P2（次要）**：`callPhone` / `openMap` / `getLocation` / `pickVideo` / `exit`。
- **预留（暂不接入）**：`openCheckout`。

### 4.3 登录闭环（P0 重点）

1. H5 缺 token / 用户资料 → 调 `openNative('login')` → 原生拉起登录页。
2. 登录成功后 **`getToken` 必须能立即拿到新 token**（H5 不刷新页面，靠 token 变化判断登录态）。
3. 同时 **`getUserInfo()` 必须返回用户资料**（`email`/`nickname`/`avatar`/`carModel`/`token`，任一非空即视为已登录）。
4. H5 三重兜底：`bridge.getAuthToken()`（优先 `getUserInfo.token`）→ `getToken()` → `getUserInfo()`，任一命中即放行，避免「已登录仍反复弹登录窗」。

### 4.4 积分 WebView + `PXIDApp` 返回对接

- 原生「我的」页 WebView 打开 `#/points`，**隐藏原生返回键**（H5 自带返回键）。
- H5 顶部返回键逻辑见 🔴.1（`PXIDApp.postMessage('closeWebView')` 优先，否则 `router.back()`）。
- **子页** `/points/guide`、`/points/mall` 走 `router.back()`，不关 WebView。
- Flutter 必须注入 `window.PXIDApp` 并实现 `postMessage('closeWebView')`。
- **如 Flutter 侧有《积分 H5 返回对接说明》原文，请同步到仓库 `docs/积分H5返回对接说明.md`**。

### 4.5 我的车 `carModel`（`getUserInfo.carModel` 第一方案）

- **第一方案**：`getUserInfo().carModel` 返回真实绑定车型代号（须在售 12 车型：`F1/F2/P1/P2/P3/P4/P5/P6/P7/P8/G1/P9`）。
- **回退方案**：Flutter 未返回时，H5 用 `localStorage` 记忆（仅兜底，不当第一方案）。
- **用途**：发现页「我的车」专属筛选 chip、发布页车型预选、UserProfileView 展示。
- Flutter 必须在 `getUserInfo` 返回 `carModel`；字段兼容 `myCar`/`vehicle`/`bindVehicle`/`boundCar`，H5 已归一处理。

### 4.6 token 签名（后端契约）

- H5 不再自签 deviceId。
- `getToken` 由后端 `/auth/token` 生成 HMAC 签名 token（服务端生成 deviceId）。
- Flutter 需让 `getToken` 返回**服务端签名的真实登录 token**；生产环境返回真实 token，mock 环境返回假 token（`mock-token-standalone`），仅浏览器预览用，勿用于生产判断。

### 4.7 publish / popPage / exit

**publish（`discover/publish`）**
- 发现页「＋」触发 `openNative('discover/publish')`，原生拉起发布器；H5 兜底路由 `/publish`。
- 发布图文经 `pickImages`/`pickVideo` 取资源，调后端 `/feed` 落库。

**popPage**
- 根页面侧滑空栈时 H5 调 `bridge.popPage()` 弹回 Flutter 原生上一级；未实现则降级「再按一次退出程序」（首次提示 toast）。

**exit**
- 双按退出走 `bridge.exit()`；未实现则兜底 `openNative('app/exit')`。

### 4.8 商城（精选）与 Shopify 现状

- **当前真实流程**：
  1. 用户在精选 `/featured` 或商品详情 `/product/:id` 点「去购买」/「去结算」。
  2. H5 调后端 `/mall-api/checkout-v2` 生成 Shopify 结账 URL（已预填 email/地址）。
  3. H5 调 `bridge.openShopify(url)`，由 Flutter 在 WebView 内打开该 URL。
  4. 用户在 Shopify 结账页完成支付后返回。
- **`openCheckout` 状态**：桥里已预留，但 H5 业务代码**尚未调用**。若后续要切换到「Flutter cartCreate → WebView 结账」模式，需要产品明确 + H5 同步改代码。
- **积分好物**：积分页 `/points` 下方的商品推荐点击后调 `bridge.openShopify(p.shopUrl)`，跳 Shopify 商品页（现金购买）。
- **积分商城**：`/points/mall` 是纯积分兑换，走自家后端 `/growth/*`，**与 Shopify 无关**。
- Storefront token 是公开级，**直接放 Flutter 原生层即可，无需服务端代理**（仅当未来接入 `openCheckout` 时才需要）。

### 4.9 侧滑返回（手势返回）

1. 底部 tab 已彻底移除，由原生 tab 始终接管（见 🔴.4）。
2. 侧滑返回由原生处理：Flutter 监听侧滑，优先调用 WebView `goBack()`（H5 为 hash 路由）；H5 历史栈空时，由原生决定是否关闭 WebView 或返回上一级原生页。
3. H5 页内返回按钮：所有二级页顶部保留返回箭头，点击调 `history.back()`；原生应保证状态栏/刘海区域不遮挡该按钮。
4. 切后台点击失效 bug 已修（见 🔴.5），Flutter 正常嵌 WebView 即可，无需额外处理。

### 4.11 个人主页（H5 已上线六 Tab，Flutter 需配合透传）

1. H5 已完整实现 `UserProfileView`（`/user/:id` 他人、`/user/me` 自己），含资料卡 + **六 Tab**：动态 / 赞过 / 收藏 / 关注 / 粉丝 / 足迹（他人隐藏收藏·足迹）。
2. **H5 内入口已全部打通**：作者头像/昵称（`FeedCard`/`MomentCard`/`InteractionView`/`FeedDetailView`）、`@用户` 富文本 → `router.push('/user/<deviceId>')`。
3. **原生侧入口**：Flutter 若需从原生页面（推送/消息/@提及）进入 H5 用户主页，调 `openNative('user/<deviceId>')`，收到后**让承载 H5 的 WebView 导航到 `#/user/<deviceId>`**（不要自己渲染用户页）。`deviceId` 用真机 `getUserInfo`/后端返回的 deviceId，勿用昵称。
4. **「我的」tab**：进入自己的主页，让 WebView 打开 `#/user/me`（或 `openNative('user/me')`）；`/user/me` 内部用本机 `getDeviceId()` 识别自己。
5. **标识统一 `device_id`**：所有 `user/<xxx>` 参数必须是 device_id（后端按 device_id 存/查），昵称会改、会重名，不可用于路由。
6. **收藏/赞过/足迹/点赞全部 H5 自管**（详见 §1.7 契约表）：Flutter 无需处理点赞（`openNative('feed/interact?type=like')` 已废弃）；关注列表接口 `/follow/list` 已改返回对象数组，粉丝列表 `/follow/followers` 新增。
7. **二期（未做，本期占位）**：私信、编辑资料、举报、拉黑。他人主页「发消息」暂走 `openNative('message/user?deviceId=')`，无原生时 H5 提示「即将上线」，不阻塞浏览。

### 4.10 视觉规范

- H5 颜色/字号/圆角/间距统一走 `tokens.css` 令牌，依据《ToC App 视觉开发规范》。
- **原生侧（Flutter 写的页面）也请对齐同一份规范**，保证两端视觉一致。
- 价格红 `--price` 为国内电商习惯（涨红）；若规范要统一错误红 `#D93025` 请告知即可改。
- 头像/封面当前为 Unsplash 占位，接入真实用户数据后由接口替换。

---

---

## 个人主页 Flutter 对接专章（可直接转发 Flutter 同学）

> 本专章聚焦「个人主页」模块的 H5↔Flutter 对接，用 🔴🟠🟡🟢🔵 五步叙述，与上方总纲其余章节一致。其余模块见各对应小节。

### 🔴 现状（H5 已上线，Flutter 只需配合透传）

- **路由**：`/user/:id`（他人主页）、`/user/me`（自己的主页，App「我的」tab 入口）。
- **六 Tab（2026-08-28 上线）**：
  - 自己 `/user/me`：动态 · 赞过 · 收藏 · 关注 · 粉丝 · 足迹
  - 他人 `/user/:id`：动态 · 赞过 · 收藏 · 关注 · 粉丝（**收藏/足迹对他人隐藏**，足迹仅自己可见）
- **数据全部 H5 自管**（不依赖 Flutter）：点赞/收藏/赞过/足迹/关注对象数组均存 H5 后端（`feed_likes`/`favorites`/`footprints`/`follows` 表）。
- **H5 内所有「进用户主页」都是 `router.push('/user/<deviceId>')`，不调 openNative**——作者头像/昵称、`@用户`、互动消息 actor、关注/粉丝列表点人，全部 H5 内闭环。
- **标识统一 `device_id`**：路由参数必须是 device_id（后端按 device_id 存/查），昵称会变、会重名，绝不可用于路由。

### 🟠 问题或卡点（易踩的坑）

1. **deviceId 是唯一标识**：原生侧任何 `user/<xxx>` 透传都必须用真机 `getUserInfo`/后端返回的 deviceId，不能用昵称。
2. **点赞已改 H5 自管**：旧契约 `openNative('feed/interact?type=like')` **已废弃**，Flutter 不要再处理点赞（避免双源不一致）。但**关注仍走 `openNative('feed/follow?id=')`**，Flutter 需保留现有原生关注逻辑。
3. **私信是二期占位**：他人主页「发消息」→ `openNative('message/user?deviceId=')`；Flutter 未实现时 H5 会 toast「即将上线」并**不报错**，不阻塞浏览。
4. **混合内容**：`getUserInfo.avatar` 必须返回 **https** 完整 URL，禁止 `http://` 明文（HTTPS 页加载 http 头像会被浏览器拦截）。

### 🟡 需要什么帮助（要 Flutter 做 / 确认）

1. **原生侧进入用户主页**：从原生页面（推送/消息/@提及）进入 H5 用户主页时，调 `openNative('user/<deviceId>')`，收到后**让承载 H5 的 WebView 导航到 `#/user/<deviceId>`**（透传 deviceId，不要自己渲染用户页）。
2. **「我的」tab**：让 WebView 打开 `#/user/me`（或 `openNative('user/me')`）；`/user/me` 内部用本机 `getDeviceId()` 识别自己。
3. **`getUserInfo` 返回真实资料**：`deviceId`/`email`/`nickname`/`avatar`(https)/`carModel`，供 H5 识别自己与填充资料卡。
4. **保留 `feed/follow?id=` 关注处理**（现状不变）。
5. **（二期）** 实现 `message/user?deviceId=` 私信入口，或确认继续用 H5 占位提示。

### 🟢 怎么做（实现要点 / 示例）

**透传用户主页（最关键）**
```js
// Flutter 解析 openNative 路径
if (path.startsWith('user/')) {
  const deviceId = decodeURIComponent(path.slice('user/'.length)) // 如 'user/d_xxx' → 'd_xxx'
  // 让承载 H5 的 WebView 跳到对应 hash 路由（不要自己渲染）
  webViewController.loadUrl(H5_BASE + '#/user/' + encodeURIComponent(deviceId))
}
```

**关注的原生处理（保持现状）**
```js
if (path.startsWith('feed/follow?id=')) {
  const feedId = path.slice('feed/follow?id='.length)
  // 走现有原生关注/取关逻辑（H5 乐观更新由 Flutter 成功回调驱动）
}
```

**私信（二期，未实现时 H5 自愈）**
```js
if (path.startsWith('message/user?deviceId=')) {
  const deviceId = decodeURIComponent(path.split('deviceId=')[1])
  // 打开原生私信会话；未实现则 H5 提示「即将上线」
}
```

### 🔵 最终效果是啥（个人主页联调验收清单）

- [ ] 原生入口 / 推送 / @提及 → `openNative('user/<deviceId>')` → WebView 跳到对应 H5 个人主页（资料卡 + 六 Tab 正常）。
- [ ] 「我的」tab → WebView 打开 `#/user/me`，正确识别自己（显示「编辑资料」而非「关注」）。
- [ ] 六 Tab 加载正常：自己显 动态/赞过/收藏/关注/粉丝/足迹；他人仅显 动态/赞过/收藏/关注/粉丝（足迹不可见）。
- [ ] 点赞走 H5 后端（Flutter 收不到 `feed/interact` 点赞）；赞过/收藏 Tab 数据正确回显、刷新不丢。
- [ ] 关注走原生 `feed/follow?id=`（保持现状）；关注/粉丝列表展示头像+昵称+车型，点人进其主页形成闭环。
- [ ] `getUserInfo` 返回真实 `deviceId`/`avatar`(https)/`carModel`。
- [ ] （二期）`message/user?deviceId=` 私信入口可用，或 H5 占位提示正常不报错。

---

## 🔵 最终效果是啥（联调通过后的验收标准）

### 5.1 Flutter 自测验收清单（全过 = 对接完成）

- [ ] 注入 `window.PXIDBridge`（`isNative:true`）后，控制台不再出现 `[PXIDBridge:mock]` 日志。
- [ ] 同时注入 `window.PXIDApp`（积分返回用）。
- [ ] 发现页「＋」→ 拉起原生发布；`pickImages` 可选图。
- [ ] 点车型卡 / 立即定制 → 原生购车页（`vehicle/<id>` / `purchase/customize`）。
- [ ] 未登录点赞 / 评论 / 关注 → 跳原生登录 → 返回后已登录（无刷新）。
- [ ] `getUserInfo` 返回 `email` / `nickname` / `avatar` / `carModel` 真实值（打印确认）。
- [ ] 商品「去购买」→ `openShopify` 打开 Shopify 结账，可返回。
- [ ] 作者头像/昵称、`@用户`、互动消息 actor → 进 H5 个人主页 `/user/<deviceId>`（真机验证可跳转、资料卡+动态流正常）。
- [ ] 个人主页六 Tab 加载正常：`/user/me` 显 动态/赞过/收藏/关注/粉丝/足迹；他人 `/user/:id` 仅显 动态/赞过/收藏/关注/粉丝（足迹不可见）。
- [ ] 点赞/收藏走 H5 后端（Flutter 不再收到 `feed/interact` 点赞）；赞过/收藏 Tab 数据正确回显，刷新不丢。
- [ ] 关注/粉丝列表展示头像+昵称+车型，点人进其主页形成闭环。
- [ ] 「我的」tab → 进自己的主页 `#/user/me`。
- [ ] 原生侧 `openNative('user/<deviceId>')` 能让 WebView 跳到对应 H5 个人主页。
- [ ] 积分页「我的」入口 WebView 打开 → 顶部返回键 `PXIDApp.postMessage('closeWebView')` 关 WebView 回「我的」。
- [ ] 多语言 / 货币按 `getLocale` 返回初始化。
- [ ] 视觉与《ToC App 视觉开发规范》一致。

### 5.2 验收通过后的整体效果

- H5 在原生 App 内**完整可用**：发现/精选/服务/我的 全模块经 WebView 承载，原生底部 5 tab 接管切换。
- **原生互通**：发布、购车、分享、登录、拨号、导航、搜索、积分商城等全部经 `openNative` 跳原生页，互不割裂。
- **登录态打通**：登录后无刷新即生效，不再反复弹登录窗。
- **积分闭环**：积分页从「我的」WebView 进入、顶部返回键关 WebView 回「我的」，子页正常 `router.back()`。
- **我的车真实**：发现页「我的车」筛选、`carModel` 展示均取 Flutter 注入的真实车型，不再依赖 H5 兜底。
- **商城 Shopify 打通**：商品结算经 `openShopify` 打开 Shopify 结账页，支付后回 H5。
- **多语言/货币**：按 `getLocale` 初始化，支持 CN/BR/US 等区域。
- **视觉一致**：H5 与 Flutter 原生页共用一套视觉规范。

### 5.3 已知边界与统一建议

- **双桥统一建议（后续）**：把积分返回也统一到 `PXIDBridge`（新增 `closeWebView()` 方法），删 `window.PXIDApp` 依赖，避免两套桥命名混乱。过渡期先两套都注入。
- **H5 兜底页**：`vehicle/<id>`、`purchase/customize`、`search` 在 mock 下映射到同名 H5 路由；原生接入后可接管或保留降级。
- **商城孤儿页**：`CartView`/`CheckoutView`/`OrderSuccessView`/`OrderListView` 暂未走通，联调无需关注。
- **服务类标识**：H5 服务模块已彻底屏蔽，`service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit` 在 H5 内无法触发；原生若保留服务入口，由原生自己承载。
- **「我的动态」入口**：落点待产品负责人定夺（见 🟡.8）。
- **openCheckout 终态**：若产品决定从 `openShopify` 切换到「Flutter cartCreate → WebView 结账」，需产品明确 + H5 同步改造后再接入。

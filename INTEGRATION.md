# PXID H5 × Flutter 原生对接总纲（Flutter 必读 · 唯一入口）

> **最后更新**：2026-08-28 ｜ **基准代码**：`3d6e64e`（对接文档五步重组 HEAD）  
> **读者**：Flutter 原生开发同学 ｜ **目的**：**一份文档说清所有 H5 ↔ Flutter 桥接契约与对接步骤**，不再分散到多个文档找来找去  
> **配套（同仓库，按需深读）**：后端 API 见 `docs/PXID_ToC_后端接口规范.md`；视觉规范见 `docs/ToC_App_视觉开发规范.md`；Shopify 结账 Flutter 实现见 `docs/PXID_Shopify_结账桥接_Flutter版.md`  
> **本文件按 🔴现状 / 🟠问题或卡点 / 🟡需要什么帮助 / 🟢怎么做 / 🔵最终效果 五步组织**

---

## 🔴 现状（H5 侧已经做好什么、契约是什么）

### 1.1 两套桥契约（H5 已经定义、等你注入）

**主桥 `window.PXIDBridge`（H5 自有命名）**
- **注入时机**：WebView 加载 H5 **前**注入，实现对象**必须带 `isNative: true`**。
- **判定入口**：`src/bridge/index.js` 里 `isEmbed() = window.PXIDBridge?.isNative === true`。若为 false / undefined，H5 启用 `mockBridge` 兜底（浏览器独立预览用）。
- **调用方式**：业务代码统一 `import { bridge } from '../bridge'`，再 `bridge.xxx(...)`，不直接碰 `window.PXIDBridge`。

**积分子桥 `window.PXIDApp`（积分对接文档另行规定）**
- 按《积分 H5 返回对接说明》：原生「我的」页用 WebView 打开 `#/points` 并**隐藏原生返回键**，由 H5 顶部返回键负责关闭。
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

### 1.2 主桥方法清单（H5 已经约定好，Flutter 必须实现）

> `getAuthToken` 是 H5 内部封装（优先 `getUserInfo.token` → 回退 `getToken`），Flutter **不需要**单独实现。

| 方法 | 签名 | 优先级 | 调用场景 | Flutter 职责 |
| --- | --- | --- | --- | --- |
| `getToken` | `() => Promise<string>` | P0 | 登录 Gate、发帖、点赞、评论、订单 | 返回登录态 token；**未登录返回空串** |
| `getUserInfo` | `() => Promise<{email?, nickname?, token?, avatar?, carModel?}>` | P0 | 评论/点赞/发帖带身份、我的车、订单 | 登录后必须返回 `email`/`nickname`/`avatar`/`carModel`；未登录返回 `null` 或空对象 |
| `getLocale` | `() => Promise<{locale, country, currency}>` | P0（多国） | 启动初始化 i18n 与货币 | 返回如 `{locale:'zh-CN', country:'CN', currency:'CNY'}` |
| `openNative` | `(path: string) => void` | P0 | 见 🔴.4 全部标识 | 解析 `module/action?param=value` 字符串，路由到对应原生页 |
| `pickImages` | `({maxCount}) => Promise<[{uri, url, ...}]>` | P0（发布） | 发动态选图 | 唤起原生多选；返回线上 URL 或本地 uri 数组 |
| `openCheckout` | `(lines) => Promise<boolean \| {ok:true, orderId:string}>` | P0（商城） | 商品结算 | 拿 `[{variantId, quantity}]` 调 Shopify `cartCreate` → 得 `checkoutUrl` → WebView 打开 → `pxid://checkout/done` 回弹后 resolve |
| `navigateTo` | `(tab: string) => void` | P1 | 切底部 5 tab | `discover`/`featured`/`purchase`/`service`/`profile` |
| `openShopify` | `(url: string) => void` | P1 | 商品/去购买/公告外链 | WebView 或外部浏览器打开 URL，保留返回 |
| `requestPurchase` | `(payload) => Promise<boolean>` | P1 | 车辆购买/活动/工单下单 | 拉起原生购买/下单；resolve 支付结果 |
| `getRegion` | `() => Promise<string>` | P1 | 活动中心、发布、发现 | 返回 `CN` / `BR` / `US` |
| `getDeviceId` | `() => Promise<string>` | P1 | 发帖封禁维度 | 返回设备唯一 ID |
| `getOSSCredentials` | `() => Promise<{...}>` | P1 | 图片直传 | 返回 OSS 临时凭证；未实现则 H5 降级 |
| `popPage` | `() => void` | P1 | 根页面侧滑空栈返回 | pop 当前承载 H5 的原生页 |
| `callPhone` | `(phone: string) => void` | P2 | 门店/工单拨号 | 走原生拨号 |
| `openMap` | `({lat, lng, name}) => void` | P2 | 门店/救援/工单导航 | 拉起系统/高德/百度地图 |
| `getLocation` | `() => Promise<{lat, lng}\|null>` | P2 | 发布/发现定位 | 返回当前坐标；用户拒绝返回 null |
| `pickVideo` | `({maxDuration}) => Promise` | P2 | 发动态选视频 | 唤起原生单选视频 |
| `exit` | `() => void` | P2 | 双按退出 | 退出 App（亦兜底 `openNative('app/exit')`） |

### 1.3 `openNative` 标识全表（H5 真实调用点已收齐，共 21 个）

| path | 触发场景 | 参数 | 备注 |
| --- | --- | --- | --- |
| `login` | 缺登录跳原生登录 | — | 全局登录 Gate |
| `discover/publish` | 发现页「＋」发布 | 可带 `?content=` 预填文案 | 原生拉起发布器；H5 兜底 `/publish` |
| `purchase/customize` | 立即定制 / 车型详情定制 | — | 购车 |
| `vehicle/<id>` | 车型卡 / 动态车型标签 / @车型 | id = 真实型号字符串，如 `P2`、`MOTA Z3` | 购车车型页 |
| `vehicle/check?model=<m>` | 车辆体检 | model | 服务 |
| `vehicle/bind` | 切换/绑定车辆 | — | 服务 |
| `feed/interact?type=like&id=<id>` | 点赞 | type=like, id | 互动 |
| `feed/follow?id=<id>` | 关注作者 | id | 互动 |
| `share/feed?id=<id>` | 分享 | id | 原生分享面板；H5 兜底 Web Share / 复制链接 |
| `address/list` | 结算选地址 | — | 下单 |
| `manual/download?model=<m>` | 说明书下载 | model | 服务 |
| `service/contact?orderId=<id>` | 工单联系客服 | orderId | 服务 |
| `service/cancelOrder?orderId=<id>` | 取消工单 | orderId | 服务 |
| `rescue/submit?<params>` | 道路救援提交 | 多参 | 服务 |
| `buy/customize?<params>` | 购车定制提交 | 多参 | 购车 |
| `search?q=<kw>` | 搜索 | q | H5 兜底 `/search` |
| `points/rules` | 积分规则 | — | 积分 |
| `points/guide` | 玩转积分 banner | — | 积分（H5 等价页 `/points/guide`） |
| `points/mall` | 积分商城「更多」 | — | 积分（H5 等价页 `/points/mall`） |
| `points/exchange?id=<id>` | 积分商品兑换 | id | 积分 |
| `settings/language` | 语言/地区切换 | — | 多国 |
| `user/<name>` | **@用户跳用户主页** | name（需 encodeURIComponent） | `FeedDetailView:516` 调用；原生需承载用户主页 |
| `app/exit` | 退出兜底 | — | `bridge.exit()` 未实现时兜底 `openNative('app/exit')` |

> 字符串约定：`module/action?param=value`，`/` 分隔模块与动作，`?` 后接参数，多参用 `&`，值需 `encodeURIComponent`。❌ 不允许对象形式。

### 1.4 底部 tab 已彻底移除（H5 现状）

- `src/App.vue` 不再渲染底部 tab bar，原生底部 5 tab 始终接管。
- `navigateTo(tab)` 用于 tab 间切换，tab 取值：`discover` / `featured` / `purchase` / `service` / `profile`。
- 原 `?standalone=1` 控制 tab 显隐的逻辑已无作用。`isEmbed()` 现在只决定「走原生实现还是 H5 mock 兜底」。

### 1.5 H5 已具备、已修好的能力（背景交代清楚）

- **切后台点击失效 bug 已修**（2026-08-28，`89f0685`）：`App.vue` 根容器 `.app-root` 常驻 `will-change: transform` 已移除，改 `useSwipeBack` 手势激活时临时加、复位时清除；并加 `visibilitychange` 回前台强制复位 transform + 重建合成层。Flutter 侧**无需改动**，只要正常把 H5 放 WebView 即可。
- **积分返回已对接**：H5 已按《积分 H5 返回对接说明》实现 `PXIDApp.postMessage('closeWebView')`，等 Flutter 注入 `PXIDApp`。
- **商城结账已留接口**：H5 调 `bridge.openCheckout(lines)` 已约定，等 Flutter 实现 Shopify `cartCreate` → WebView 结账 → 回弹。
- **我的车 `carModel`**：H5 第一方案读 `getUserInfo().carModel`，Flutter 未返回时回退 `localStorage`（仅兜底）。
- **token 不自签**：H5 已废弃自签 deviceId，登录态完全靠 Flutter 经 `getToken` / `getUserInfo` 注入。

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
- **@用户**：`FeedDetailView` 调 `openNative('user/<name>')`，原生需承载用户主页。
- **我的动态**：入口落点**待 Flutter 确认**（跳 H5 路由还是原生页）——这是当前卡点之一。

### 2.5 服务类标识是否还有入口（待确认）
- `service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit` H5 代码仍调用，但服务模块 H5 版已声明移除（tab/路由屏蔽）。
- 需 Flutter 确认：这些原生页是否仍有入口（通知 / 我的订单 / 推送进入）；有则实现，无则上线流程中不会触发。

### 2.6 token 签名（后端契约）
- H5 不再自签 deviceId（防自签他人身份）。
- `getToken` 必须由后端 `/auth/token` 生成 HMAC 签名 token（服务端生成 deviceId）。
- Flutter 需让 `getToken` 返回**服务端签名的真实登录 token**；生产环境返回真实 token，mock 环境返回假 token（仅浏览器预览用）。

### 2.7 验收清单尚未通过（当前状态）
- 以下项需 Flutter 自测通过后，联调才算完成（完整清单见 🔵 最终效果）：
  - 双桥注入、发现页「＋」拉起原生发布、`pickImages` 可选图；
  - 车型卡/立即定制 → 原生购车页；未登录点赞/评论/关注 → 跳原生登录 → 返回后已登录（无刷新）；
  - `getUserInfo` 返回真实 `email`/`nickname`/`avatar`/`carModel`；
  - 商品「去购买」→ `openCheckout` 打开 Shopify 结账可返回；
  - @用户 → 用户主页；积分页顶部返回键关 WebView；多语言/货币初始化；视觉一致。

---

## 🟡 需要什么帮助（要 Flutter 同学提供 / 确认 / 做掉）

1. **注入两套桥**：`window.PXIDBridge`（`isNative:true`）+ `window.PXIDApp`（`postMessage('closeWebView')`）。
2. **实现 19 个主桥方法**：P0 六个先交（`getToken`/`getUserInfo`/`getLocale`/`openNative`/`pickImages`/`openCheckout`），其余 P1/P2 按排期。
3. **解析 21 个 `openNative` 标识**：按 🔴.3 全表路由到对应原生页。
4. **登录闭环**：登录成功后 `getToken` + `getUserInfo` 同时返回新值，且 `getUserInfo` 含 `email`/`nickname`/`avatar`/`carModel`/`token`。
5. **我的车**：`getUserInfo` 返回 `carModel`（在售 12 车型之一）；字段兼容 `myCar`/`vehicle`/`bindVehicle`/`boundCar`。
6. **积分 WebView**：「我的」页 WebView 打开 `#/points`、隐藏原生返回键、注入 `PXIDApp` 并响应 `closeWebView`。
7. **商城结账**：实现 `openCheckout` —— Shopify `cartCreate` → `checkoutUrl` → WebView 打开 → `return_to(pxid://checkout/done)` 回弹 resolve。（详细 Flutter 实现见同仓库 `docs/PXID_Shopify_结账桥接_Flutter版.md`）
8. **确认两件事**（卡点定夺）：
   - 「我的动态」入口落点：跳 H5 路由还是原生页？跳 H5 的话需新增路由并登记 `openNative` 标识（如 `user/<id>/moments`）。
   - 服务类标识（`service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit`）是否仍有原生入口？有则实现，无则忽略。

---

## 🟢 怎么做（具体对接步骤 / 实现方案）

### 4.1 注入时机与示例

- WebView 加载 H5 **前**注入 `window.PXIDBridge`（带 `isNative:true`）。
- WebView 打开 `#/points` 时同样注入 `window.PXIDApp`。
- 所有方法保证异步安全；`getToken`/`getUserInfo`/`requestPurchase`/`openCheckout` 返回 Promise。

```js
// 主桥（伪代码示意，具体用 Flutter 的 JS 注入通道）
window.PXIDBridge = {
  isNative: true,
  getToken: () => Promise.resolve('<服务端签名 token>'),
  getUserInfo: () => Promise.resolve({ email, nickname, avatar, carModel, token }),
  getLocale: () => Promise.resolve({ locale:'zh-CN', country:'CN', currency:'CNY' }),
  openNative: (path) => { /* 解析 module/action?param=value 路由 */ },
  pickImages: ({maxCount}) => Promise.resolve([/* {uri,url} */]),
  openCheckout: (lines) => { /* 见 4.8 */ },
  navigateTo: (tab) => { /* 切底部 5 tab */ },
  // ...其余方法
}

// 积分子桥（仅积分页返回用）
window.PXIDApp = {
  postMessage: (msg) => { if (msg === 'closeWebView') { /* 关闭 WebView，回「我的」 */ } }
}
```

### 4.2 方法实现要点（按优先级）

- **P0（阻塞联调）**：`getToken` / `getUserInfo` / `getLocale` / `openNative` / `pickImages` / `openCheckout`。
- **P1（核心功能）**：`navigateTo` / `openShopify` / `requestPurchase` / `getRegion` / `getDeviceId` / `getOSSCredentials` / `popPage`。
- **P2（次要）**：`callPhone` / `openMap` / `getLocation` / `pickVideo` / `exit`。

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

### 4.8 商城（精选 / 积分好物）与 Shopify 打通

- **终态架构**：商品数据来自 Shopify（Storefront API）；H5 做自有商品详情页 + 购物车 + 确认订单页；Flutter 负责结账交接。
- **核心流程**：用户点「去结算」→ `bridge.openCheckout(lines)` → Flutter 调该国店 Storefront `cartCreate` 生成 `checkoutUrl` → WebView 打开 Shopify 结账 → 支付后 `return_to(pxid://checkout/done)` 回弹 App → `openCheckout` resolve。
- Storefront token 是公开级，**直接放 Flutter 原生层即可，无需服务端代理**。
- 完整 Flutter 实现（含 cartCreate mutation、return_to 配置、回弹解析）见同仓库 `docs/PXID_Shopify_结账桥接_Flutter版.md`。

### 4.9 侧滑返回（手势返回）

1. 底部 tab 已彻底移除，由原生 tab 始终接管（见 🔴.4）。
2. 侧滑返回由原生处理：Flutter 监听侧滑，优先调用 WebView `goBack()`（H5 为 hash 路由）；H5 历史栈空时，由原生决定是否关闭 WebView 或返回上一级原生页。
3. H5 页内返回按钮：所有二级页顶部保留返回箭头，点击调 `history.back()`；原生应保证状态栏/刘海区域不遮挡该按钮。
4. 切后台点击失效 bug 已修（见 🔴.5），Flutter 正常嵌 WebView 即可，无需额外处理。

### 4.10 视觉规范

- H5 颜色/字号/圆角/间距统一走 `tokens.css` 令牌，依据《ToC App 视觉开发规范》。
- **原生侧（Flutter 写的页面）也请对齐同一份规范**，保证两端视觉一致。
- 价格红 `--price` 为国内电商习惯（涨红）；若规范要统一错误红 `#D93025` 请告知即可改。
- 头像/封面当前为 Unsplash 占位，接入真实用户数据后由接口替换。

---

## 🔵 最终效果是啥（联调通过后的验收标准）

### 5.1 Flutter 自测验收清单（全过 = 对接完成）

- [ ] 注入 `window.PXIDBridge`（`isNative:true`）后，控制台不再出现 `[PXIDBridge:mock]` 日志。
- [ ] 同时注入 `window.PXIDApp`（积分返回用）。
- [ ] 发现页「＋」→ 拉起原生发布；`pickImages` 可选图。
- [ ] 点车型卡 / 立即定制 → 原生购车页（`vehicle/<id>` / `purchase/customize`）。
- [ ] 未登录点赞 / 评论 / 关注 → 跳原生登录 → 返回后已登录（无刷新）。
- [ ] `getUserInfo` 返回 `email` / `nickname` / `avatar` / `carModel` 真实值（打印确认）。
- [ ] 商品「去购买」→ `openCheckout` 打开 Shopify 结账，可返回。
- [ ] @用户 → `openNative('user/<name>')` 跳用户主页。
- [ ] 积分页「我的」入口 WebView 打开 → 顶部返回键 `PXIDApp.postMessage('closeWebView')` 关 WebView 回「我的」。
- [ ] 多语言 / 货币按 `getLocale` 返回初始化。
- [ ] 视觉与《ToC App 视觉开发规范》一致。

### 5.2 验收通过后的整体效果

- H5 在原生 App 内**完整可用**：发现/精选/服务/我的 全模块经 WebView 承载，原生底部 5 tab 接管切换。
- **原生互通**：发布、购车、分享、登录、拨号、导航、搜索、积分商城等全部经 `openNative` 跳原生页，互不割裂。
- **登录态打通**：登录后无刷新即生效，不再反复弹登录窗。
- **积分闭环**：积分页从「我的」WebView 进入、顶部返回键关 WebView 回「我的」，子页正常 `router.back()`。
- **我的车真实**：发现页「我的车」筛选、`carModel` 展示均取 Flutter 注入的真实车型，不再依赖 H5 兜底。
- **商城打通 Shopify**：商品结算经 Flutter `openCheckout` 调 Shopify 结账，支付后回弹 App。
- **多语言/货币**：按 `getLocale` 初始化，支持 CN/BR/US 等区域。
- **视觉一致**：H5 与 Flutter 原生页共用一套视觉规范。

### 5.3 已知边界与统一建议

- **双桥统一建议（后续）**：把积分返回也统一到 `PXIDBridge`（新增 `closeWebView()` 方法），删 `window.PXIDApp` 依赖，避免两套桥命名混乱。过渡期先两套都注入。
- **H5 兜底页**：`vehicle/<id>`、`purchase/customize`、`search` 在 mock 下映射到同名 H5 路由；原生接入后可接管或保留降级。
- **商城孤儿页**：`CartView`/`CheckoutView`/`OrderSuccessView`/`OrderListView` 暂未走通，联调无需关注。
- **服务类标识**：`service/*`、`vehicle/check`、`vehicle/bind`、`manual/download`、`rescue/submit` H5 代码仍调用，但服务模块 H5 版已声明移除，需 Flutter 确认是否仍有入口（见 🟡.8）。
- **「我的动态」入口**：落点待 Flutter 确认（见 🟡.8）。

# PXID H5 × Flutter 待实现对接清单（Flutter 同学执行版）

> **用途**：从 `INTEGRATION.md`（对接总纲）中拆出的「待办」单，专门列 **H5 已写好、但 Flutter 原生侧还没接，导致功能不完整/走兜底** 的项。
> **基准代码**：`55645a8`（2026-08-31 部署）｜**对照契约**：`src/bridge/index.js`、`INTEGRATION.md`
> **组织方式**：🔴现状 / 🟠问题或卡点 / 🟡需要什么帮助 / 🟢怎么做 / 🔵最终效果
> ⚠️ 本文件只列 **Flutter 原生侧** 待办。数据层 mock（后端/API 未接）见文末「附：非 Flutter 待办」，不归 Flutter 管。

---

## 🔴 现状（H5 已定义、等你注入）

主桥 `window.PXIDBridge` 由 Flutter 在 WebView 加载 H5 **前**注入，对象**必须带 `isNative: true`**。
- 未注入时 H5 启用 `mockBridge` 兜底（浏览器独立预览可用，但能力是假的）。
- 业务代码统一走 `import { bridge } from '../bridge'`，已对 `getUserInfo` 字段名做了兼容归一（`normalizeProfile`），Flutter 返回任意常见字段名都能识别。
- H5 已写好本地兜底：分享面板、发布上传（走后端 `/media/upload`）、底部 tab 路由、`points/*` 等价页。但这些兜底**只在原生没实现时才生效**，体验不如原生。

---

## 🟠 问题或卡点（哪些方法现在是 reject / 返回假数据）

| Bridge 方法 | 当前状态 | 导致的现象 |
| --- | --- | --- |
| `getUserInfo()` | mock 返回游客态 `我/测试头像` | 评论/点赞头像错、登录态不稳、「我的车」chip 拿不到真实车型、App「我的」四格串号 |
| `getFollowList()` / `getFansList()` | mock 返回 `[]`，桥里 `reject('未实现')` | 个人主页关注/粉丝列表回退 H5 本地，非 App 真实账号关系 |
| `pickImages()` / `pickVideo()` | mock `reject('未实现')` | 原生内发布动态无法选图/选视频（浏览器靠 `<input>`，嵌入模式卡死） |
| `getLocale()` | mock 返回 `zh` | 语言靠 H5 `onMounted initLocale + 系统语言` 兜底，不如原生注入准 |
| `getRegion()` | mock 返回 `US` | 地区（CN/BR/US）视图不对 |
| `getToken()` | 走后端匿名 token | 登录态 token 来源不稳（已用 `getAuthToken` 优先 `getUserInfo().token` 缓解） |
| `navigateTo(tab)` | mock 走 H5 路由 | 嵌入模式切底部 tab 不是原生体验 |
| `openNative(path)` | 部分映射到 H5 路由 | `vehicle/`、`rescue/submit`、`service/*`、`manual/download`、`message/user`、`buy/customize`、`discover/publish`、`app/exit` 等原生子页未拉起 |
| `requestPurchase(payload)` | mock 直接 `resolve(true)` | 活动购买/下单未走真实支付 |
| `openShopify(url)` / `openCheckout(lines)` | mock 新标签/直接成功 | Shopify 购买/结账未走原生 WebView |
| `exit()` / `popPage()` | mock 静默/ reject | 侧滑退出/返回原生页无效 |
| `getOSSCredentials()` | mock `reject` | **当前不在关键路径**（见 🟢 说明），仅 `oss` 存储驱动未来用 |

> ⚠️ **App「我的」四格串号**：不是桥方法问题，是 Flutter「我的」原生页没调 H5 的 `/users/me`（受限 token）。见 🟡 P0-1。

---

## 🟡 需要什么帮助（按优先级实现清单）

### P0 — 必须（影响核心功能/数据正确性）
1. **`getUserInfo()`**
   - 返回真实登录用户：`{ nickname, avatar, email, carModel, token }`
   - 字段名兼容（H5 已归一）：头像可用 `avatar/avatarUrl/headImgUrl/portrait/photo` 任一；昵称可用 `nickname/name/userName/nickName/displayName` 任一；车型用代号如 `'P2'`（`carModel`）
   - 未登录返回 `null` 或空对象（H5 据此弹登录）
2. **App「我的」原生页改调 `/users/me`**（受限 token）
   - Flutter 用 Bridge 换发的受限 token 调 `GET https://pxid-api.appin.site/users/me`，与 H5 个人主页对齐，消除串号（此前「骑友#F2」「官方头像」根因）

### P1 — 重要（原生体验 / 发布链路）
3. **`pickImages({ maxCount })`** → `Promise<[{ uri, path, url? }]>`
4. **`pickVideo({ maxDuration })`** → `Promise<{ uri, path, url? }>`
5. **`getFollowList()`** → `Promise<[{ deviceId, nickname, avatar }]>`
6. **`getFansList()`** → `Promise<[{ deviceId, nickname, avatar }]>`
7. **`getLocale()`** → `Promise<'zh'|'en'|'pt'>`
8. **`getRegion()`** → `Promise<'CN'|'BR'|'US'>`
9. **`getToken()`** → `Promise<string>`（登录态 token）

### P2 — 体验增强（H5 已有兜底，原生更顺）
10. **`navigateTo(tab)`** — `tab ∈ {discover,featured,purchase,service,profile}`，切原生底部 tab
11. **`openNative(path)`** — 支持：`vehicle/<Pxx>`、`rescue/submit`、`service/contact`、`service/cancelOrder`、`manual/download`、`message/user?deviceId=`、`buy/customize`、`discover/publish`、`app/exit`
12. **`requestPurchase(payload)`** — 真实支付/下单流程，`payload:{type,id}` 或 `{orderId,total}`，完成后 `resolve(true/false)`
13. **`openShopify(url)` / `openCheckout(lines)`** — 原生 WebView 打开 Shopify 商品/结账页，`lines:[{variantId,quantity}]`
14. **`exit()` / `popPage()`** — 退出 App / 返回原生上一页

### P3 — 未来（非紧急）
15. **`getOSSCredentials()`** — 仅当 H5 切 `VITE_STORAGE_DRIVER=oss` 时才需要（当前 `local` 走后端 `/media/upload`，**不在关键路径**）。返回 OSS STS：`{ accessKeyId, accessKeySecret, stsToken, bucket, region, objectKeyPrefix }`

---

## 🟢 怎么做（契约细节 + 示例）

**注入入口（关键）**
```js
// Flutter 在 WebView 加载 H5 前执行
window.PXIDBridge = {
  isNative: true,            // ← 必须有，H5 据此判定嵌入模式
  getUserInfo() { /* 返回真实用户或 null */ },
  getFollowList() { /* ... */ },
  // ...其余方法
}
```

**`getUserInfo` 返回示例**
```js
// 已登录
{ nickname:'李坤', avatar:'https://.../a.jpg', email:'k@pxid.app', carModel:'P2', token:'<受限JWT>' }
// 未登录
null   // 或 {}
```

**`openNative` 路径约定**（H5 已对这些有 H5 等价页兜底，原生实现后体验更原生）
```
vehicle/<Pxx>           → 车型详情（原生）
rescue/submit?<params>  → 道路救援提交
service/contact?orderId=→ 工单联系客服
service/cancelOrder?... → 取消工单
manual/download?model=  → 说明书下载
message/user?deviceId=  → 给某用户发消息
buy/customize           → 购车定制原生页
discover/publish        → 原生发布器（当前 H5 自管发布可用）
app/exit                → 退出 App
```

**`share/feed` 说明**：H5 已用本地 `ShareSheet`（复制链接/系统分享/微信/朋友圈）兜底，**不再依赖此原生路由**；Flutter 若实现 `openNative('share/feed?id=')` 会被面板「微信/朋友圈」按钮调用，不实现也不影响功能。

**`getOSSCredentials` 说明**：当前 H5 媒体上传走 `storage.uploadMedia → POST /media/upload`（后端落 ECS），**不经过 OSS 直传**，所以此方法暂不阻塞发布。只有后续切 OSS 直传驱动才需要。

---

## 🔵 最终效果（联调验收清单）

- [ ] 真机进入 App「我的」→ 四格 stats 与 H5 个人主页一致（不串「骑友#F2」/官方头像）
- [ ] 评论/点赞/发帖自动带真实昵称+头像
- [ ] 发现页「我的车」chip 显示 Flutter 返回的真实绑定车型
- [ ] 原生内发布动态：可 `pickImages`/`pickVideo` 选文件并上传成功
- [ ] 个人主页关注/粉丝列表 = App 真实账号关系
- [ ] 跟随 App 语言/地区切换（zh/en/pt、CN/BR/US）
- [ ] 底部 tab 切原生页；车型/救援/工单/说明书等原生子页能拉起
- [ ] 活动购买、Shopify 结账走真实原生流程
- [ ] 侧滑可退出 App / 返回原生页

---

## 附：非 Flutter 待办（数据层仍 mock，归后端/H5，不阻塞 Flutter）

以下页面**功能写了但数据是本地假数据**（`src/data/mock.js`，注释明确"后续接 API 整文件替换"），需后端补接口或 H5 接真实 API：

| 模块 | mock 数据 | 待接 |
| --- | --- | --- |
| 发现动态流 | `feed.js` 的 `moments/feedItems` | `/feed` 列表接口（已有函数，view 层仍引 mock） |
| 公告/活动 | `notices`/`activities` | `/notifications` 等 |
| FAQ/说明书 | `faqs`/`manualSections`/`guideVideos` | 后端静态/CMS |
| 服务网格/门店/工单 | `serviceEntries`/`stores`/`workOrders` | 售后系统 API |
| 积分商城商品 | `pointsProducts` | 商品接口（`/growth/*` 已真，商品列表仍假） |
| 订单/购车定制/车型 | `orders`/`customizeOptions`/`carModels`/`plazaShowcase` | 对应后端 |
| 精选 quick/搜索 | `featuredQuick`/搜索结果 | Shopify + 搜索 API |

> 另：i18n 里 `points.demoTip` 文案仍写"演示数据·签到即激活"，但后端已移除 demo 兜底，文案误导，待清。

# PXID H5 × Flutter 桥方法对接文档（Flutter 实现侧必读）

> 本文件从 `INTEGRATION.md`（总纲）、`src/bridge/index.js`（H5 真实调用契约）、各业务页真实调用抽取，**只列 Flutter 必须注入实现的桥方法**。H5 已上线，缺这些方法会导致对应功能在 App 内失效。
>
> 通信方式：H5 经 `window.PXIDBridge`（`isNative:true`）与 Flutter 通信。Flutter 在 WebView 加载 H5 前注入真实实现；未注入时 H5 用 mock 兜底（浏览器预览可跑，但媒体/位置/返回等原生能力不可用）。

---

## 基础环境（必读 · 联调域名）

> ⚠️ 这是最基础的联调信息，先确认域名再动手。



| 用途                     | 地址                                |
| ---------------------- | --------------------------------- |
| **H5 静态站（WebView 加载）** | `https://appin.site/nav/pxid-h5/` |
| **API 基地址（所有后端接口）**    | `https://pxid-api.appin.site`     |

- **所有接口都挂在 `https://pxid-api.appin.site` 下**，例如：
  - `GET https://pxid-api.appin.site/users/:deviceId`（个人主页四宫格 stats）
  - `POST https://pxid-api.appin.site/feed`（发帖）
  - `POST https://pxid-api.appin.site/media/upload`（媒体上传）
  - `GET https://pxid-api.appin.site/feed/:id`（动态详情）
- ❌ **不是**裸 `appin.site`（那是静态站，不承载接口）。
- ❌ **不是** `toc.pxidiot.com:446`（那是 Flutter App / tocApp **自己**的后端，H5 完全不连它）。若你看到这个域名，那是 Flutter 侧惯例，与 H5 联调无关。
- 线上 nginx 把 `pxid-api.appin.site` 反代到 ECS `:8700`（Node + better-sqlite3）。

---

## 🔴 现状（H5 已上线，Flutter 只需补齐桥方法）

- **发布页**：图片/视频选择、上传（`/media/upload`）、发帖（`POST /feed`）均由 H5 自管，但**选择动作依赖原生桥**（WebView 内 `<input type=file>` 不响应）。
- **个人主页**：四宫格（发布/收藏/关注/粉丝）+ 发布子 Tab 已上线，返回「我的」页依赖 `closeWebView`。
- **身份**：所有上传/发帖/互动走 `getUserInfo().token` 鉴权。

---

## 🟠 问题或卡点（不实现会怎样）

1. **WebView 内 `<input type=file>` 无效** → 图片/视频选择完全依赖 `pickImages`/`pickVideo`。
2. **`pickVideo` 未实现 = 视频不能选**（历史「视频不能传」真实根因）。
3. **`getLocation` 未实现 = 位置打卡不灵**：H5 降级 `navigator.geolocation`，但 WebView 内浏览器定位常不可用。
4. **`getUserInfo` 不带 `token` = 上传/发帖 401**（`/media/upload` 与 `POST /feed` 均 `requireAuth`）。
5. **`avatar` 必须 https**：http 明文会被 HTTPS 页拦截，发帖头像丢失。
6. **`closeWebView` 未实现 = 个人主页返回不了「我的」**（返回按钮卡死）。

---

## 🟡 需要什么帮助（Flutter 待实现清单）

### P0 必做（不做功能直接废）

| 方法             | 调用签名                                         | 返回                                                                     | 说明                                           |
| -------------- | -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| `isNative`     | `true`（属性）                                   | —                                                                      | 标记真实原生桥，缺了 H5 走 mock                         |
| `getUserInfo`  | `getUserInfo()`                              | `{ deviceId, nickname, avatar(https), email, carModel, token(登录JWT) }` | token 是发布/上传/发帖鉴权关键；avatar 必须 https          |
| `pickImages`   | `pickImages({ maxCount })`                   | `[{ url }]` 或 `[{ path }]`，H5 取 `url \|\| path`                        | 多选图片，≤maxCount 张                             |
| `pickVideo`    | `pickVideo({ maxDuration: 60 })`             | `{ url, duration }`（duration 单位秒）                                      | 单选视频，≤maxDuration 秒                          |
| `closeWebView` | `window.PXIDApp.postMessage('closeWebView')` | —                                                                      | 个人主页返回「我的」；**注意是 `PXIDApp` 不是 `PXIDBridge`** |

### P1 建议（不实现会降级但不崩）

| 方法                | 调用签名                          | 返回                      | 说明                                                        |
| ----------------- | ----------------------------- | ----------------------- | --------------------------------------------------------- |
| `getLocation`     | `getLocation()`               | `{ lat, lng }` 或 `null` | 位置打卡；不实现时 H5 降级浏览器定位                                      |
| `getToken`        | `getToken()`                  | `string`（登录 JWT）        | `getUserInfo.token` 的兜底通道                                 |
| `getRegion`       | `getRegion()`                 | `'CN' \| 'BR' \| 'US'`  | 区域路由（发现/精选/发布）                                            |
| `getLocale`       | `getLocale()`                 | `'zh' \| 'en' \| 'pt'`  | 语言                                                        |
| `getDeviceId`     | `getDeviceId()`               | `string`                | 设备唯一 ID                                                   |
| `navigateTo`      | `navigateTo(tab)`             | —                       | 切换原生 tab：`discover\|featured\|purchase\|service\|profile` |
| `openNative`      | `openNative(path)`            | —                       | 打开原生页（如 `vehicle/P2`、`points/guide`）                      |
| `openMap`         | `openMap({ lat, lng, name })` | —                       | 拉起地图导航                                                    |
| `callPhone`       | `callPhone(phone)`            | —                       | 拨号                                                        |
| `openShopify`     | `openShopify(url)`            | —                       | 打开 Shopify 商品/页                                           |
| `openCheckout`    | `openCheckout(lines)`         | `Promise<boolean>`      | Headless 结账                                               |
| `requestPurchase` | `requestPurchase(payload)`    | `Promise<boolean>`      | 拉起原生购买                                                    |
| `exit`            | `exit()`                      | —                       | 退出 App                                                    |

---

## 🟢 怎么做（注入示例）

```js
// Flutter 在 WebView 加载 H5 前注入（Android JavascriptChannel / iOS WKScriptMessageHandler）
window.PXIDBridge = {
  isNative: true,

  // —— P0 ——
  // 多选图片，返回 [{ url }] 或 [{ path }]，H5 取 url || path
  pickImages: async ({ maxCount = 9 } = {}) => {
    const list = await nativePickImages(maxCount)
    return list.map((it) => ({ url: it.url, path: it.path }))
  },

  // 选视频，返回 { url, duration }（duration 秒）
  pickVideo: async ({ maxDuration = 60 } = {}) => {
    const v = await nativePickVideo(maxDuration)
    return { url: v.url, duration: v.durationSec }
  },

  // 登录态 + 资料：token 字段是发布/上传鉴权关键；avatar 必须 https
  getUserInfo: async () => ({
    deviceId: 'd_xxx',
    nickname: '骑友名',
    avatar: 'https://...',     // 必须 https
    email: 'a@b.com',
    carModel: 'P2',            // 绑定车型代号
    token: '<登录态 JWT>',      // H5 发布/上传用
  }),

  getToken: async () => '<登录态 JWT>',

  // —— P1 ——
  getLocation: async () => {
    const loc = await nativeGetLocation()
    return loc ? { lat: loc.latitude, lng: loc.longitude } : null
  },
  getRegion: async () => 'CN',
  getLocale: async () => 'zh',
  getDeviceId: async () => 'd_xxx',
  navigateTo: (tab) => nativeSwitchTab(tab),
  openNative: (path) => nativeOpen(path),
  openMap: ({ lat, lng, name }) => nativeOpenMap(lat, lng, name),
  callPhone: (phone) => nativeCall(phone),
  openShopify: (url) => nativeOpenUrl(url),
  openCheckout: (lines) => nativeCheckout(lines),
  requestPurchase: (payload) => nativePurchase(payload),
  exit: () => nativeExit(),
}

// 返回「我的」页：个人主页 goBack 在原生环境调这个
window.PXIDApp = {
  postMessage: (msg) => {
    if (msg === 'closeWebView') nativeCloseWebView()
  },
}
```

**H5 侧已锁定的调用契约（供你核对，Flutter 不用改）**

```js
// 图片选择入口（native 下唯一通道）
if (bridge.isNative()) await bridge.pickImages({ maxCount: 9 - picked.length })
// 视频选择入口
if (bridge.isNative()) await bridge.pickVideo({ maxDuration: 60 })

// 上传（原生选完已给 url，浏览器模式才走 file 上传）
POST https://pxid-api.appin.site/media/upload  →  { objectKey, url, type }

// 发帖
POST https://pxid-api.appin.site/feed
Authorization: Bearer <token from getUserInfo().token>
body: { content, images, carModel, tags, region, nickname, avatar,
        deviceId, lat, lng, mentions, video, cover }

// 个人主页返回「我的」
window.PXIDApp.postMessage('closeWebView')
```

---

## 🔵 最终效果是啥（Flutter 联调验收清单）

- [ ] 进发布页，点图库 → 调 `pickImages`，可多选 ≤9 张，回显缩略图，上传成功（不再「图片不能选」）。
- [ ] 点视频 → 调 `pickVideo`，选后回显预览 + 时长；≤60s / ≤200MB 校验生效（不再「视频不能传」）。
- [ ] 点位置 → 调 `getLocation`，打卡成功；未实现时 H5 降级浏览器定位不崩。
- [ ] 发布成功：`getUserInfo().token` 有效，`/media/upload` 与 `POST /feed` 鉴权通过，不再 401/500。
- [ ] 进个人主页 `/user/me`，点返回 → 调 `PXIDApp.postMessage('closeWebView')`，回到「我的」页。
- [ ] 进入「我的」拉 `GET /users/:deviceId` 返回 `stats{posts,favorites,following,followers}` 四宫格数字正确。
- [ ] 点四宫格打开 `#/user/me?tab=publish|favorites|follow|followers`（发布可加 `&sub=liked|footprints`）对应页正常。

---

*文档版本：2026-08-29 · 汇总自 bridge/index.js 真实契约 + 发布/个人主页业务页调用 · 单一真相源 `INTEGRATION.md`*

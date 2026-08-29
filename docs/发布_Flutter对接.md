# PXID H5 × Flutter 发布功能对接文档（Flutter 必读）

> 本文件从 `INTEGRATION.md`（H5↔Flutter 对接总纲）抽出，独立发给 Flutter 同学。**只讲「发布」模块**；如需全量契约（商城 / 积分 / 个人主页 / 购车等），仍以 `INTEGRATION.md` 为准。

## 背景（1 分钟读懂）

> ⚠️ **联调域名（最基础）**：H5 静态站 `https://appin.site/nav/pxid-h5/`；所有后端接口（含 `POST /feed`、`POST /media/upload`）基地址 `https://pxid-api.appin.site`。**不是**裸 `appin.site`，**不是** `toc.pxidiot.com:446`（那是 Flutter App 自己的后端，H5 不连）。

- H5 是内嵌在 Flutter WebView 的 Vue3 应用，通过 `window.PXIDBridge`（`isNative:true`）与 Flutter 通信。
- **发布页是 H5 自实现的页面（非原生页）**：路由 `/publish`（发现页「+」入口进入）。Flutter **不需要自己渲染发布页**，也不要把发布甩回原生——选→传→发全流程 H5 自管。
- **发布链路已修通（2026-08-28）**：图片/视频选择、上传（`/media/upload`）、发帖（`POST /feed`）均由 H5 完成。**之前「视频不能传 / 图片不能选 / 服务器 500」的根因是原生桥被改坏 + `upsertProfile` UNIQUE 冲突，现已修复**，本文档锁定最终契约，避免再回退。

---

## 🔴 现状（H5 已上线，Flutter 只需补齐桥方法）

- **路由**：`/publish`（他人/原生侧无需透传，H5 内部跳转）。
- **发布流程**：选车型(可选) → 选图(≤9 张) / 选视频(≤60s, ≤200MB) → 位置(可选) / @提到(可选) → 点「发布」。
- **媒体选择：原生桥优先且不再静默回退**。`onPickImageClick` / `onPickVideoClick` 在 `isFlutterEnv()`（即 `window.PXIDBridge.isNative` 为 truthy，容错 `'true'`）为真时**直接 `await bridge.pickImages / pickVideo`**；桥缺失/失败 → 明确 toast + `console.error('[Publish] ... failed')` 打印诊断，**不再静默回退 `<input type=file>`**（旧版静默回退正是「点击加号没反应」的真因，已于 2026-08-29 修复）。浏览器独立预览环境无原生桥，才走 `<input type=file>` 兜底。详见《发布页媒体选择_线上排查与Flutter对接.md》。
- **上传**：逐张 `POST /media/upload`（要求 `Authorization: Bearer <token>`），返回 `{ objectKey, url, type }`；H5 用 `url` 回填。
- **发帖**：`POST /feed`（`requireAuth`），**后端按 token 注入 deviceId**（不信任 body 的 deviceId），落 `feeds` 表并 `upsertProfile` 同步资料。
- **视频封面**：浏览器模式 H5 自己 `canvas` 抽首帧上传；**原生模式 Flutter 选完直接给 `url`（已上传），H5 不再抽帧**。

---

## 🟠 问题或卡点（易踩的坑）

1. **WebView 内 `<input type=file>` 无效** → 图片/视频选择**完全依赖** Flutter 实现 `pickImages` / `pickVideo`。这两个不实现，发布就选不了媒体。
2. **`pickVideo` 未实现 = 视频不能选**（之前「视频不能传」的真实原因）。
3. **`getLocation` 未实现 = 位置打卡不灵**：H5 会降级 `navigator.geolocation`，但 WebView 内浏览器定位常不可用 → 建议 Flutter 直接实现 `getLocation()`。
4. **token 是发布的前提**：`/media/upload` 与 `/feed` 都 `requireAuth`。H5 取 token 逻辑为 `getUserInfo.token || getToken()`——**Flutter 必须在 `getUserInfo` 注入登录态 token（字段名 `token`），或实现 `getToken()` 返回登录态 JWT**，否则上传/发帖 401。
5. **`avatar` 必须 https**：`getUserInfo.avatar` 返回 http 明文会被 HTTPS 页拦截，导致发帖头像丢失。
6. **媒体返回格式要对**：`pickImages` 返回数组，元素取 `url || path`；`pickVideo` 返回对象取 `.url` 和 `.duration`（秒）。字段名错 H5 拿不到。

---

## 🟡 需要什么帮助（要 Flutter 做 / 确认）

1. **实现 `window.PXIDBridge.pickImages({ maxCount })`**：调原生相册多选，返回数组，元素含 `url` 或 `path`（建议直接传线上 URL，H5 不再二次上传）。
2. **实现 `window.PXIDBridge.pickVideo({ maxDuration: 60 })`**：调原生视频选择，返回 `{ url, duration }`（duration 单位秒）。
3. **（建议）实现 `getLocation()`**：返回 `{ lat, lng }`，提升位置打卡可用率；不实现时 H5 降级不崩。
4. **`getUserInfo` 注入登录态**：返回 `deviceId` / `nickname` / `avatar`(https) / `email` / `carModel` / **`token`(登录 JWT)**。
5. **保留 H5 后端处理 `/media/upload` 与 `/feed`**：Flutter 不用管上传/发帖后端，只管桥选媒体 + 注入身份。

---

## 🟢 怎么做（实现要点 / 示例）

**Flutter 注入桥（关键方法）**
```js
window.PXIDBridge = {
  isNative: true,

  // 多选图片，返回 [{ url }] 或 [{ path }]，H5 取 url || path
  pickImages: async ({ maxCount = 9 } = {}) => {
    const list = await nativePickImages(maxCount) // 你的原生相册
    return list.map((it) => ({ url: it.url, path: it.path }))
  },

  // 选视频，返回 { url, duration }（duration 秒）
  pickVideo: async ({ maxDuration = 60 } = {}) => {
    const v = await nativePickVideo(maxDuration)
    return { url: v.url, duration: v.durationSec }
  },

  // 位置打卡：返回 { lat, lng } 或 null
  getLocation: async () => {
    const loc = await nativeGetLocation()
    return loc ? { lat: loc.latitude, lng: loc.longitude } : null
  },

  // 登录态 + 资料：token 字段是发布/上传鉴权关键
  getUserInfo: async () => ({
    deviceId: 'd_xxx',
    nickname: '骑友名',
    avatar: 'https://...',      // 必须 https
    email: 'a@b.com',
    carModel: 'P2',             // 绑定车型代号
    token: '<登录态 JWT>',       // H5 发布/上传用
  }),

  getToken: async () => '<登录态 JWT>',
  getRegion: async () => 'CN',    // CN / BR / US
  getDeviceId: async () => 'd_xxx',
  // …其余桥方法保持现状
}
```

**H5 侧已锁定的调用契约（供你核对，不用改）**
```js
// 图片选择入口（native 下直接调，失败明确报错，不再静默回退 file input）
// 判据 isFlutterEnv() = window.PXIDBridge.isNative 为 truthy（容错字符串 'true'）
const images = await bridge.pickImages({ maxCount: 9 - picked.length })
// 视频选择入口
const video = await bridge.pickVideo({ maxDuration: 60 })

// 上传（原生选完已给 url，浏览器模式才走 file 上传）
POST https://pxid-api.appin.site/media/upload  →  { objectKey, url, type }

// 发帖
POST https://pxid-api.appin.site/feed
Authorization: Bearer <token>
body: {
  content, images: [url,...], carModel, tags: [carModel],
  region: 'CN', nickname, avatar, deviceId, lat, lng,
  mentions: [{ deviceId, nickname }], video, cover
}
```

---

## 🔵 最终效果是啥（发布联调验收清单）

- [ ] 进 `/publish`，点图库 → 调 Flutter `pickImages`，可多选≤9 张，回显缩略图，上传成功（不再「图片不能选」）。
- [ ] 点视频 → 调 Flutter `pickVideo`，选后回显预览 + 时长；≤60s / ≤200MB 校验生效（不再「视频不能传」）。
- [ ] 图片/视频 `POST /media/upload` 返回 200 + `objectKey`，发布 `POST /feed` 不再 500（根因 `upsertProfile` UNIQUE 冲突已修）。
- [ ] 点位置 → 调 `getLocation`，打卡成功；未实现时 H5 降级浏览器定位不崩。
- [ ] 点 @ → 选人插入「@昵称」，发帖后后端 `mentions` 落库。
- [ ] 发布成功跳发现页，动态流可见，刷新不丢（后端持久化）。
- [ ] `getUserInfo` 带 `token`，`/media/upload` 与 `/feed` 鉴权通过。

---

*文档版本：2026-08-28 · 对应发布功能修复之后 · 单一真相源 `INTEGRATION.md`*

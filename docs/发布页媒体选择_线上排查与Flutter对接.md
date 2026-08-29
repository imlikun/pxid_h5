# PXID H5 发布页媒体选择 · 线上排查与 Flutter 对接（2026-08-29 版）

> 背景：真机在发布页点「+」/「视频」**完全没反应**。本文件是给 Flutter 同学的交接 + 排查手册，平行于《发现页媒体选择失败_线上H5排查与处理.md》。
> 单一真相源仍是 `INTEGRATION.md`，本文只聚焦「发布页媒体选择」这一条链路。

---

## 🔴 现状（H5 已修，待 Flutter 验证）

- **发布页路由**：`/publish`（发现页「+」入口进入，H5 自管，非原生页）。
- **当前线上版本**：
  - 主包：`index-DuWITcI7.js`
  - 发布页懒加载 chunk：`PublishView-jZAR5X5x.js`
  - 部署：`2026-08-29 17:18:44`，对应 H5 提交 `d6fb6a9`
- **选择逻辑（2026-08-29 修复后）**：
  - `onPickImageClick` / `onPickVideoClick` 在 `isFlutterEnv()` 为真时，**直接 `await bridge.pickImages / pickVideo`**，不再有任何静默回退。
  - `isFlutterEnv()` 判据：`window.PXIDBridge && window.PXIDBridge.isNative` 为 truthy（容错字符串 `'true'`），**不再要求严格 `===true`**。
  - **桥缺失 / 调用失败** → 明确 `showToast(...)` + `console.error('[Publish] pickImages failed', ...)` 打印诊断（含 `isNative`、`hasPickImages`），把「没反应」变成「可定位」。
  - 浏览器独立预览（非嵌入）：走 `<input type=file>` 兜底，可正常选图/选视频。

---

## 🟠 问题或卡点（「点击加号没反应」根因）

1. **旧逻辑静默回退**（2026-08-29 前）：native 环境下若 `isNative` 未设或 `pickImages` 未实现，H5 会静默回退到 `<input type=file>`；而 Flutter WebView **没有 file-chooser delegate**，点这个 input 就是「完全没反应」。这就是现场现象。
2. **`pickImages` / `pickVideo` 未实现** = 真机选不了图/视频（Flutter 侧缺桥）。
3. **`isNative` 未设 / 设为非 true 字符串外的假值** = H5 误判为非嵌入，走 file input 静默失败（旧版）；新版虽不再静默，但若 `isNative` 完全是 `false/undefined`，H5 会走浏览器 file input 路径，依旧在 WebView 内无效。
4. **`getUserInfo` 不带 `token`** = `POST /media/upload` 与 `POST /feed` 401，发布失败（注意：这是「选完发不出」，不是「选不了」）。
5. **`avatar` 必须 https**：http 明文在 HTTPS 页被拦截，发帖头像丢失。

---

## 🟡 需要什么帮助（要 Flutter 做 / 确认）

| 项 | 要求 | 不做的后果 |
| --- | --- | --- |
| P0 | 注入 `window.PXIDBridge.isNative = true`（或字符串 `'true'`） | H5 不进入原生选择路径，WebView 内 file input 无响应 → 点击没反应 |
| P0 | 实现 `pickImages({ maxCount })` | 点图库没反应（request 都不产生） |
| P0 | 实现 `pickVideo({ maxDuration: 60 })` | 点视频没反应 |
| P0 | `getUserInfo()` 返回 `token`（登录 JWT）+ `avatar`(https) | `/media/upload`、`/feed` 401，选完发不出 |
| P1 | 实现 `getLocation()` 返回 `{ lat, lng }` | 位置打卡降级浏览器定位（不崩但常不可用） |

**最低可用闭环**：`isNative:true` + `pickImages` + `pickVideo` + `getUserInfo.token` 四项齐全，发布页即可在真机跑通。

---

## 🟢 怎么做（契约 + 示例）

**Flutter 注入桥（发布页相关最小集）**
```js
window.PXIDBridge = {
  isNative: true,   // 关键：缺了 H5 走 mock/浏览器路径，WebView 内选媒体无响应

  // 多选图片，返回 [{ url }] 或 [{ path }]，H5 取 url || path
  pickImages: async ({ maxCount = 9 } = {}) => {
    const list = await nativePickImages(maxCount)   // 你的原生相册（≤maxCount 张）
    return list.map((it) => ({ url: it.url, path: it.path }))
  },

  // 选视频，返回 { url, duration }（duration 单位秒）
  pickVideo: async ({ maxDuration = 60 } = {}) => {
    const v = await nativePickVideo(maxDuration)
    return { url: v.url, duration: v.durationSec }
  },

  // 登录态 + 资料：token 是发布/上传鉴权关键；avatar 必须 https
  getUserInfo: async () => ({
    deviceId: 'd_xxx',
    nickname: '骑友名',
    avatar: 'https://...',     // 必须 https
    email: 'a@b.com',
    carModel: 'P2',            // 绑定车型代号
    token: '<登录态 JWT>',      // H5 发布/上传用
  }),
}
```

**H5 侧当前调用契约（供核对，Flutter 不用改）**
```js
// onPickImageClick（isFlutterEnv 为真时）
const images = await bridge.pickImages({ maxCount: 9 - picked.length })
// 元素取 img.url || img.path；失败 → toast + console.error('[Publish] pickImages failed', ...)

// onPickVideoClick
const video = await bridge.pickVideo({ maxDuration: 60 })
// 取 video.url + video.duration

// 上传 / 发帖（原生选完直接给 url，H5 不再二次上传）
POST https://pxid-api.appin.site/media/upload   Authorization: Bearer <token>
POST https://pxid-api.appin.site/feed            Authorization: Bearer <token>
```

---

## 🔵 最终效果（真机验收 + 排查清单）

### A. 排查四步（看 console 的 `[Publish]` 日志 / 屏幕 toast）

| 现象 | 结论 | 谁修 |
| --- | --- | --- |
| 屏幕弹 toast「未实现 / 选择图片失败」或 console 有 `[Publish] pickImages failed … hasPickImages:false` | Flutter 没实现 `pickImages` | Flutter |
| console 有 `[Publish] pickImages failed … isNative:false` | Flutter 漏设 `isNative:true` | Flutter |
| 点击后 console 完全没有 `[Publish]` 任何日志 | 点击没进 `onPickImageClick`（另有原因，再查 H5） | H5 |
| Flutter 侧出 `request=pickImages` 但无 `selected` 回传 | 系统选择器 / 权限链路问题（Flutter 内部） | Flutter |

### B. 发布联调验收清单

- [ ] 进 `/publish`，点图库 → 调 Flutter `pickImages`，可多选≤9 张，回显缩略图（不再「没反应」）。
- [ ] 点视频 → 调 `pickVideo`，选后回显预览 + 时长；≤60s 校验生效。
- [ ] `pickImages/pickVideo` 缺失时，屏幕有明确 toast + console `[Publish]` 诊断日志（不再静默失败）。
- [ ] `getUserInfo` 带 `token`，`/media/upload` 与 `POST /feed` 鉴权通过，不再 401/500。
- [ ] 发布成功跳发现页，动态流可见，刷新不丢。

---

*文档版本：2026-08-29 17:20 · 对应 H5 提交 `d6fb6a9`（发布页点击加号静默回退修复）· 单一真相源 `INTEGRATION.md`*

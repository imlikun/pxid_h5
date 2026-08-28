# PXID H5 × Flutter 个人主页对接文档（Flutter 必读）

> 本文件从 `INTEGRATION.md`（H5↔Flutter 对接总纲）抽出，独立发给 Flutter 同学。**只讲「个人主页」模块**；如需全量契约（商城 / 积分 / 发布 / 购车等），仍以 `INTEGRATION.md` 为准。

## 背景（1 分钟读懂）

- H5 是内嵌在 Flutter WebView 的 Vue3 应用，通过两套桥与 Flutter 通信：
  - **主桥 `window.PXIDBridge`**（`isNative:true`）：`getToken` / `getUserInfo` / `openNative` / `pickImages` / `openShopify` 等。
  - **积分子桥 `window.PXIDApp`**：仅 `postMessage('closeWebView')` 用于积分页返回。
- **个人主页是 H5 自实现的页面（非原生页）**：`/user/:id`（他人）、`/user/me`（自己）。Flutter 只需要在原生侧想进入用户主页时「透传」deviceId 让 WebView 导航过去，**不要自己渲染用户页**。

---

## 🔴 现状（H5 已上线，Flutter 只需配合透传）

- **路由**：`/user/:id`（他人主页）、`/user/me`（自己的主页，App「我的」tab 入口）。
- **资料卡 + 四宫格 + 内容区（2026-08-28 上线）**：App「我的」头像下方四块【发布】【收藏】【关注】【粉丝】与 H5 1:1 对齐。
  - **四宫格（资料卡下方，带数字）**：
    - 发布（数字 = 该用户动态数 `feedCount`）
    - 收藏（数字 = 收藏数 `favoriteCount`，**仅自己可见**，他人主页不显示该入口）
    - 关注（数字 = `followeeCount`）
    - 粉丝（数字 = `followerCount`）
  - **点「发布」→ 内容区展开子 Tab**：动态 · 赞过 ·（足迹，仅自己可见）。
  - **点「收藏」→ 收藏列表**（仅自己可见）。
  - **点「关注」→ 关注列表**；**点「粉丝」→ 粉丝列表**。
  - 私密性：收藏、足迹对他人隐藏；他人主页四宫格无「收藏」入口。
- **数据全部 H5 自管**（不依赖 Flutter）：点赞/收藏/赞过/足迹/关注对象数组均存 H5 后端（`feed_likes`/`favorites`/`footprints`/`follows` 表）。
- **H5 内所有「进用户主页」都是 `router.push('/user/<deviceId>')`，不调 openNative**——作者头像/昵称、`@用户`、互动消息 actor、关注/粉丝列表点人，全部 H5 内闭环。
- **标识统一 `device_id`**：路由参数必须是 device_id（后端按 device_id 存/查），昵称会变、会重名，绝不可用于路由。

---

## 🟠 问题或卡点（易踩的坑）

1. **deviceId 是唯一标识**：原生侧任何 `user/<xxx>` 透传都必须用真机 `getUserInfo`/后端返回的 deviceId，不能用昵称。
2. **点赞已改 H5 自管**：旧契约 `openNative('feed/interact?type=like')` **已废弃**，Flutter 不要再处理点赞（避免双源不一致）。但**关注仍走 `openNative('feed/follow?id=')`**，Flutter 需保留现有原生关注逻辑。
3. **私信是二期占位**：他人主页「发消息」→ `openNative('message/user?deviceId=')`；Flutter 未实现时 H5 会 toast「即将上线」并**不报错**，不阻塞浏览。
4. **混合内容**：`getUserInfo.avatar` 必须返回 **https** 完整 URL，禁止 `http://` 明文（HTTPS 页加载 http 头像会被浏览器拦截）。

---

## 🟡 需要什么帮助（要 Flutter 做 / 确认）

1. **原生侧进入用户主页**：从原生页面（推送/消息/@提及）进入 H5 用户主页时，调 `openNative('user/<deviceId>')`，收到后**让承载 H5 的 WebView 导航到 `#/user/<deviceId>`**（透传 deviceId，不要自己渲染用户页）。
2. **「我的」tab 四宫格入口**：App「我的」头像下【发布】【收藏】【关注】【粉丝】四个入口都需链接进 H5 用户主页，且**分别直达对应宫格**。让 WebView 打开带 `tab`/`sub` query 的 URL（H5 读取后自动选中对应宫格/子Tab）：
   - 发布：`#/user/me?tab=publish`（默认动态；`&sub=liked` 进赞过、`&sub=footprints` 进足迹）
   - 收藏：`#/user/me?tab=favorites`
   - 关注：`#/user/me?tab=follow`
   - 粉丝：`#/user/me?tab=followers`
   - （`/user/me` 内部用本机 `getDeviceId()` 识别自己；`tab`/`sub` 为 H5 支持的合法值才生效，非法值回退默认。）
3. **`getUserInfo` 返回真实资料**：`deviceId`/`email`/`nickname`/`avatar`(https)/`carModel`，供 H5 识别自己与填充资料卡。
4. **保留 `feed/follow?id=` 关注处理**（现状不变）。
5. **（二期）** 实现 `message/user?deviceId=` 私信入口，或确认继续用 H5 占位提示。

---

## 🟢 怎么做（实现要点 / 示例）

**透传用户主页（最关键）**
```js
// Flutter 解析 openNative 路径
if (path.startsWith('user/')) {
  const deviceId = decodeURIComponent(path.slice('user/'.length)) // 如 'user/d_xxx' → 'd_xxx'
  // 让承载 H5 的 WebView 跳到对应 hash 路由（不要自己渲染）
  webViewController.loadUrl(H5_BASE + '#/user/' + encodeURIComponent(deviceId))
}
```

**App「我的」四宫格 → 直达 H5 对应宫格（关键新增）**
```js
// App「我的」四个入口点击时，让 WebView 打开带 query 的 H5 用户主页
const TAB_MAP = {
  publish:   '#/user/me?tab=publish',     // 默认动态；赞过 = ?tab=publish&sub=liked；足迹 = ?tab=publish&sub=footprints
  favorites: '#/user/me?tab=favorites',
  follow:    '#/user/me?tab=follow',
  followers: '#/user/me?tab=followers',
}
webViewController.loadUrl(H5_BASE + TAB_MAP[tapped])
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

---

## 🔵 最终效果是啥（个人主页联调验收清单）

- [ ] 原生入口 / 推送 / @提及 → `openNative('user/<deviceId>')` → WebView 跳到对应 H5 个人主页（资料卡 + 四宫格 + 内容区正常）。
- [ ] App「我的」四宫格四个入口分别链接进 H5：`#/user/me?tab=publish|favorites|follow|followers`（发布可加 `&sub=liked|footprints`），直达对应宫格/子Tab。
- [ ] 「我的」tab → WebView 打开 `#/user/me`，正确识别自己（显示「编辑资料」而非「关注」）。
- [ ] 四宫格加载正常：自己显 发布(动态数)/收藏(收藏数)/关注/粉丝；点发布→子Tab 动态/赞过/足迹；他人无「收藏」入口。
- [ ] 点赞走 H5 后端（Flutter 收不到 `feed/interact` 点赞）；赞过/收藏数据正确回显、刷新不丢。
- [ ] 关注走原生 `feed/follow?id=`（保持现状）；关注/粉丝列表展示头像+昵称+车型，点人进其主页形成闭环。
- [ ] `getUserInfo` 返回真实 `deviceId`/`avatar`(https)/`carModel`。
- [ ] （二期）`message/user?deviceId=` 私信入口可用，或 H5 占位提示正常不报错。

---

*文档版本：2026-08-28 · 对应 H5 四宫格重构（发布/收藏/关注/粉丝 + 发布子Tab 动态/赞过/足迹）· 单一真相源 `INTEGRATION.md`*

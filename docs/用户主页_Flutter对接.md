# PXID H5 × Flutter 个人主页对接文档（Flutter 必读）

> 本文件从 `INTEGRATION.md`（H5↔Flutter 对接总纲）抽出，独立发给 Flutter 同学。**只讲「个人主页」模块**；如需全量契约（商城 / 积分 / 发布 / 购车等），仍以 `INTEGRATION.md` 为准。

## 背景（1 分钟读懂）

> ⚠️ **联调域名（最基础）**：H5 静态站 `https://appin.site/nav/pxid-h5/`；所有后端接口（含 `GET /users/:deviceId`）基地址 `https://pxid-api.appin.site`。**不是**裸 `appin.site`，**不是** `toc.pxidiot.com:446`（那是 Flutter App 自己的后端，H5 不连）。

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

## 六、四宫格统计对接（2026-08-29 Flutter 来文追加 · 已落地）

> 来源：Flutter 侧《我的页_四格统计与个人主页_Flutter对接-2026-08-29.md》（已存仓 `docs/Flutter_我的页四格统计对接-2026-08-29.md`）。以下为八戒答复与最终契约。

### 6.1 四格真实值：`stats` 字段（方式 A，已落地）
- H5 在 `GET https://pxid-api.appin.site/users/:deviceId` 返回中**新增 `stats` 对象**，字段名固定不可改：
  | 字段 | 含义 | 映射自 H5 原有 |
  | --- | --- | --- |
  | `posts` | 发布/动态数（对应「发布」格） | `feedCount` |
  | `favorites` | 收藏数（仅自己可见，他人返回 0） | `favoriteCount` |
  | `following` | 关注数（对应「关注」格） | `followeeCount` |
  | `followers` | 粉丝数（对应「粉丝」格） | `followerCount` |
- 原顶层 `feedCount/favoriteCount/followeeCount/followerCount` **保留不删**（H5 前端宫格仍用，向后兼容）。
- Flutter 进入「我的」页拉一次、从 H5 返回再拉一次；`>99` 显示 `99+`。
- 兜底：未登录/token 失效也返回 `stats` 全 0，不报错不阻断渲染。

### 6.2 返回按钮：`PXIDApp.postMessage('closeWebView')`（已落地）
- H5 个人主页顶部返回按钮：原生环境（`window.PXIDApp.postMessage` 存在）调 `app.postMessage('closeWebView')` 回 Flutter「我的」页；浏览器预览退回 `router.back()`。
- ⚠️ 不是 `window.PXIDBridge.closeWebView()`（该方法不存在），关闭桥固定是 `PXIDApp.postMessage('closeWebView')`（与积分页一致）。
- 实现细节：`goBack()` 中 `if (window.history.length > 1) router.back(); else app.postMessage('closeWebView')`——根页（无 H5 历史）关 WebView，深层进入（如点粉丝进他人主页）先回上一页。

### 6.3 Tab 值确认（最终）
- `tab=publish | favorites | follow | followers` 即线上最终值，无别名/大小写差异。
- `tab=publish` 是「发布」容器，默认子 Tab = 动态（`sub=dynamic`）；`&sub=liked` 赞过、`&sub=footprints` 足迹（仅自己）。不等于单独「动态」页，而是发布聚合。

### 6.4 答复 Flutter 待答复清单
1. **【接口】** 方式 A：`GET /users/:deviceId` 返回内增 `stats` 对象（见 6.1 表）。
2. **【返回按钮】** 是，已按 2.2 调 `PXIDApp.postMessage('closeWebView')`（见 6.2）。
3. **【Tab 值】** 是，`publish/favorites/follow/followers` 为最终值；`publish` 默认显示动态。
4. **【字段名】** 是，固定 `posts/favorites/following/followers`（关注=following，粉丝=followers；Flutter 自行把 `followers` 映射到第 4 格 `fans` 展示）。
5. **【兜底】** 是，未登录/接口失败返回 `stats` 全 0，不报错不阻断我的页渲染。

### 6.5 数据接口清单（四宫格数字与列表的数据源）

> 以下接口基地址均为 `https://pxid-api.appin.site`（详见文首「联调域名」）。所有接口除标注外均 `Authorization: Bearer <token>`（token 取自 `getUserInfo().token`）。

| 用途 | 方法 + 路径 | 返回关键字段 | 说明 |
| --- | --- | --- | --- |
| 四宫格数字 | `GET /users/:deviceId` | `stats{posts,favorites,following,followers}` | 数字源；他人 `favorites` 返回 0 不泄露私密 |
| 发布列表（我发的） | `GET /feed?tab=dynamic&deviceId=:id` | `feeds[]` | 「发布」宫格默认子 Tab |
| 赞过列表 | `GET /feed/liked` | `feeds[]` | 需登录；「发布」子 Tab `sub=liked` |
| 足迹列表 | `POST /footprints`(写) + 本地读 | — | 仅自己可见；「发布」子 Tab `sub=footprints` |
| 收藏列表 | `GET /favorites` | `feeds[]` | 仅自己可见；「收藏」宫格 |
| 关注列表 | `GET /follow/list` | `[{deviceId,nickname,avatar,carModel}]` | 「关注」宫格 |
| 粉丝列表 | `GET /follow/followers` | `[{deviceId,nickname,avatar,carModel}]` | 「粉丝」宫格 |

- 收藏/赞过/足迹/关注对象数组均存 H5 后端（`favorites`/`feed_likes`/`footprints`/`follows` 表），**不依赖 Flutter**，Flutter 只需拉上述接口渲染即可。
- `tab`/`sub` query 为 H5 前端路由参数，不在接口层；Flutter 打开对应 `#/user/me?tab=...` URL 即可，数据由 H5 按上表自行拉取。

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
- [ ] **（2026-08-29 新增）** `GET /users/:deviceId` 返回含 `stats:{posts,favorites,following,followers}` 四格真实值（字段名固定；他人 `favorites` 返回 0 不泄露私密）。
- [ ] **（2026-08-29 新增）** 原生环境点 H5 返回按钮 → `window.PXIDApp.postMessage('closeWebView')` 直接回到 Flutter「我的」页；浏览器预览退回 `router.back()`。

---

*文档版本：2026-08-29 · 对应 H5 四宫格重构（发布/收藏/关注/粉丝 + 发布子Tab 动态/赞过/足迹）+ 四格统计 stats 契约 + closeWebView 返回 · 单一真相源 `INTEGRATION.md`*

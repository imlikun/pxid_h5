# 发现个人数据修复与 Flutter 对接

日期：2026-10-10。

## 已修复的 H5 / API 链路

- 个人主页直接以登录 token 调用 `GET /users/me`；不再要求原生设备 ID 才能加载。
- 修复原生资料回写缺少 `updateMyProfile` 导入。只同步当前已验证账号的原生资料，浏览器 mock 不覆盖真实资料。
- 进入个人主页、从详情返回、页面恢复可见时刷新资料和统计；切换账号时重新读取 token，清除上一账号的数据。
- 原生桥后注入时清除预热的旧 token；登录操作与发布前重新取 token。原生发布前检查后端解析出的会员 ID，匿名 token 不再被当成 App 会员发帖。
- 发布、收藏、关注、粉丝请求失败显示可重试的错误状态，不再冒充 0 或空列表。切换标签、用户时取消旧请求，避免旧数据覆盖当前页面。
- 关注/粉丝列表返回 `memberUserId`，按会员身份取头像、昵称、车型，并优先以会员 ID 打开主页。计数与列表使用相同筛选口径。
- 关注写入使用 token 中的真实关注者，忽略客户端自报的关注者会员 ID。修复同手机多账号关注同一骑友的冲突、关注状态串号和错误的“本人”判定。
- `/users/:id` 支持 ToC 身份验证；他人的收藏不可见，本人的收藏数仅计仍公开的内容。

## 已确认的历史数据

会员账号 `17` 的两条动态 `235`、`245` 原来属于匿名身份。用户已在本次对话确认均由本人发布，并授权恢复。只修正这两条动态的 `member_user_id`，保留内容、图片、互动和原设备字段；操作前保存原始记录，事务内核对身份。禁止按昵称或共享设备自动合并其他历史数据。

## Flutter 需要核对

1. App“我的”四个数字读取 `GET https://pxid-api.appin.site/users/me`，请求头为 `Authorization: Bearer <当前登录 token>`。使用同一次响应的 `stats.posts / favorites / following / followers`，分别对应发布、收藏、关注、粉丝。顶层字段 `feedCount / favoriteCount / followeeCount / followerCount` 保持兼容。
2. 四个入口分别打开 `#/user/me?tab=publish`、`favorites`、`follow`、`followers`。不要以设备 ID 代替当前账号调用私密数据。
3. 登录成功、切换账号、退出登录后，所有存活 WebView 的 `getUserInfo().token` 和 `getToken()` 必须同步更新；未登录返回空 token。返回“我的”、发布成功、收藏/关注变化后刷新统计，旧请求返回时核对账号再写入 UI。
4. 原生桥应在 H5 启动前完整注入，`isNative: true`；后注入请替换桥对象。真实 App token 需要在后端验证为非空 `memberUserId`，不要调用匿名预览的 `POST /auth/token` 充当 App 登录。
5. HTTP 401 / 网络失败展示错误与重试，不能把四个数字直接清零。ToC token / WebView 刷新仍需在真实 Android 和 iOS App 上联调。

## 验证范围

- `node --test tests/discover-data.test.mjs tests/profile-data.test.mjs`：12 项真实服务器读取/关系处理测试，以内存 SQLite 隔离执行。
- `node tests/profile-ui-checks.mjs`：18 项实际浏览器检查，模拟 Flutter 桥；覆盖无设备 ID、资料同步、账号切换、退出登录、错误重试、分页、会员主页跳转和原生发帖身份校验。
- `node tests/discover-ui-checks.mjs`：40 项实际浏览器检查，覆盖推荐/动态/广场、独立筛选、位置授权、话题发布、详情返回、互动、缓存竞态、1–9 图和折叠屏阅读。
- 个人主页检查 375 / 390 / 430 / 600 / 1017 / 1337px，发现检查另覆盖 854px。
- 浏览器写操作均在本地拦截，不使用真实账号 token、不向线上发测试动态。
- 已执行 Vite 构建与服务器语法检查。真实 App 原生“我的”页面不在当前仓库，未修改或宣称完成 Flutter 实机验收。

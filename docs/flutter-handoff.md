# PXID ToC App · H5 联调交付说明（发给 Flutter）

> 用途：把这份文档 + 两份附件直接转给 Flutter 同学，他们按文档注入桥、加载 H5 即可联调。
> H5 当前版本：`df5a702`（已 build 通过，已推送到远端）。
> 最后更新：2026-08-14

---

## 一、你要发给 Flutter 的材料清单

| 材料 | 说明 | 位置 |
| --- | --- | --- |
| ① 本交付说明 | 联调流程 + 注意事项 + 验收清单 | `docs/flutter-handoff.md` |
| ② 桥接契约（**必读**） | 7 个桥方法签名 + 所有 `openNative` 标识表 + Shopify 模式 | 仓库根目录 `INTEGRATION.md` |
| ③ 视觉开发规范 | 颜色/字号/圆角/间距令牌，H5 已对齐，原生页面也要对齐 | 仓库内 `docs/ToC_App_视觉开发规范.md`（文字规范已入库；含设计稿截图的原文件建议另行转发） |
| ④ H5 构建产物 | Flutter 用 WebView 加载的对象（二选一） | `dist/` 目录，或部署到某个可访问 URL |

**发法（两种，选其一）：**
- **A. 给构建产物 + ②③**：让 Flutter 把 `dist/` 放进原生工程本地加载，或你先 `npm run build` 后把产物丢给他们。最省事，不涉及仓库权限。
- **B. 给仓库权限**：`ssh://root@101.133.136.140/srv/sync/pxid_h5.git`（分支 `master`）或 `http://47.100.82.63:8099/likun/pxid_h5.git`（分支 `main`）。**注意：仓库地址里的访问令牌不要外泄，发给外部团队前务必去掉凭据、另走权限申请。**

---

## 二、联调前置条件

- H5 侧已全部完成并自测通过（构建 110 模块无报错）。
- Flutter 需在 **WebView 加载 H5 之前** 注入 `window.PXIDBridge` 真实实现。
- 注入后 H5 自动跳过内置 mock（代码判断 `if (!window.PXIDBridge) window.PXIDBridge = mockBridge`），无需 H5 改任何代码。

---

## 三、Flutter 联调步骤

1. 取 H5 代码/产物（见材料一）。
2. 通读 `INTEGRATION.md` 的「调用出口」表 + 「已用标识一览」表，确认要实现的方法和页面路由。
3. 实现 7 个桥方法：`getToken` / `navigateTo` / `openNative` / `requestPurchase` / `callPhone` / `openMap` / `openShopify`。
4. **重点做登录闭环**：H5 在未登录时调 `openNative('login')`，原生拉起登录；登录成功后 **`getToken` 必须能立即返回新 token**（H5 不刷新页面，靠 token 变化判断登录态）。
5. WebView 注入桥 → 加载 H5 → 跑验收清单。

---

## 四、注意事项（最容易踩坑，务必看）

1. **登录态不刷新**：H5 不主动刷新，依赖 `getToken` 实时返回最新 token。未登录时任何"点赞/关注/评论/发布"都会先跳 `openNative('login')`。
2. **商城走 Shopify，不自建购物车**：商品点击 / 「去购买」走 `bridge.openShopify(product.shopUrl)`，H5 没有购物车/结算/订单流。原生用 WebView 或外部浏览器打开该 URL，并保留返回能力。
3. **车型 id 是真实型号字符串**：`openNative('vehicle/<id>')` 的 `id` 是 H5 传的真实型号（如 `MOTA Z3`、`PX-4`），不是内部数字 ID。原生按自家车型库解析即可。
4. **带参标识按 `?k=v&k=v` 解析**：如 `rescue/submit?type=...&phone=...`、`buy/customize?...`，值需 `encodeURIComponent`。**禁止对象形式**（`openNative({action,id})` 一律不支持）。
5. **视觉对齐同一份规范**：H5 颜色/字号/圆角/间距全走 `tokens.css` 令牌，依据《ToC App 视觉开发规范》。**原生写的页面也要对齐这份规范**，否则两端视觉不一致。
6. **H5 兜底页**：`vehicle/<id>`、`purchase/customize`、`search` 在 mock 下映射到同名 H5 路由；原生接入后可接管，也可保留作降级。
7. **token 安全**：生产 `getToken` 返回真实登录态；mock 环境返回的是假 token（`mock-token-standalone`），仅预览用，勿用于生产判断。

---

## 五、Flutter 自测验收清单

- [ ] 注入桥后，控制台不再出现 `[PXIDBridge:mock]` 日志（说明走的是原生实现）
- [ ] 发现页「＋」发布 → 拉起原生发布
- [ ] 点车型卡 / 「立即定制」 → 原生购车页
- [ ] 未登录时点赞/关注/评论 → 跳原生登录 → 返回后已登录（无需刷新）
- [ ] 商品 / 「去购买」 → 打开 Shopify 页面，可返回
- [ ] 道路救援 / 工单联系客服 → 原生对应页
- [ ] 搜索 → 原生或 H5 搜索页
- [ ] 底部 tab 切换（`navigateTo`）正常
- [ ] 整体视觉与《ToC App 视觉开发规范》一致

---

## 六、H5 侧已知边界（联调时不用管）

- `CartView` / `CheckoutView` / `OrderSuccessView` / `OrderListView` 是商城孤儿页（车辆购买走 `requestPurchase`、商品走 `openShopify`），联调无需关注。
- 价格红 `--price` 是 H5 业务令牌（国内电商习惯红价），若规范要统一成错误红 `#D93025` 告知我即可改。
- 头像/封面目前是 Unsplash 占位图，联调显示正常；接入真实用户数据后由接口替换。

---

## 七、后续

- 桥标识如有新增，告诉我，我会登记进 `INTEGRATION.md` 的「已用标识一览」。
- 联调遇到问题直接贴 Flutter 侧报错或 H5 表现，我这边排查。

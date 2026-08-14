# PXID ToC App H5 · 发现页业务流开发总结

> 日期：2026-08-14
> 基础产品文档：`docs/discover-business-flow.md`（发现页及关联业务流 PRD）
> 配套契约文档：`INTEGRATION.md`（H5 × 原生 Flutter 桥接契约）
> 视觉规范（用户侧）：`ToC_App_视觉开发规范.md`
> 当前 HEAD：`6eb784b`（已双 remote 推送：origin master / gitlab main）

---

## 1. 起点：先有产品文档，再动手

今天所有代码都围绕一份 PRD 级产品文档落地——`docs/discover-business-flow.md`。

它把发现页及关联业务流（发布、定制、公告、登录、审核、红点、召回、车型详情）拆成了 **8 个决策点**，并让你在剪贴板决策表里逐项确认。确认结果全部为 **A**（走原生承载 / 先发后审 / 独立入口 / 强制知悉等）。文档第 7 节据此给出开发排期，作为今天分批落地的总纲。

> 关键经验：**决策先行**。先把"做什么、走原生还是 H5、红点归谁、审核顺序"全部钉死在文档里，开发时才不会边写边改、返工推倒重来。

---

## 2. 今天落地了什么（按排期逐块推进）

每一块都遵循同一节奏：**改源码 → `npm run build` 验证 → commit → 同时 push 双 remote**。

| # | 模块 | 交付物 | 说明 |
|---|------|--------|------|
| 1 | 数据模型 + 登录 Gate | `src/utils/auth.js` `requireLogin()` | `bridge.getToken()` 取不到 token 即跳原生登录（决策 A） |
| 2 | 官方公告独立入口 + 红点 | `NoticesView.vue` `NoticeDetailView.vue` | 发现顶部独立入口带红点；铃铛红点 = 消息未读 + 公告未读（并集不重复计数）；召回通知强制"已知悉" |
| 3 | 内容详情排版 | `FeedDetailView.vue` | 作者卡+关注、富文本（`#车型#`/`@` 可点）、九宫格、种草商品卡、活动报名卡、底部赞/评/藏/享（走登录 Gate）、楼中楼评论、相关推荐、空态 |
| 4 | 动态独立流 | `MomentCard.vue` + `src/store/ui.js` | "动态" tab 改单列渲染独立 `moments` 源；底部"发现"图标动态红点，进动态 tab 即清 |
| 5 | 发布/点赞/关注交互 | 复用 `FeedDetailView` / `MomentCard` | ＋原生发布（H5 降级提示）、车型卡/立即定制跳原生购车页 |
| 6 | bridge 契约统一 + H5 兜底 | `INTEGRATION.md` + 3 个兜底页 | 修 `bridge.call` 运行时报错；`openNative` 统一为字符串 `module/action?k=v`；补 `/vehicle/:id`、`/purchase/customize`、`/search` 三页让 preview 链路跑通 |
| 7 | 推荐流虚拟化 | `src/data/mock.js` `feedItems` | 6 条重复占位文 → 7 条不同类型内容，绑定 pxid.com 真实在售型号（MOTA Z3 / PX-4 / CoolPlay PX-2 / P5 / MOTA Z1 / Urban 03） |
| 8 | 我的积分页 | `PointsView.vue` | 余额 + 玩转积分 banner + 积分好物列表；按《ToC App 视觉开发规范》收敛色值（金币改品牌蓝+白字） |
| 9 | 商城与 Shopify 打通 | `bridge.openShopify()` | 新增桥接方法；商品卡/积分好物/详情购买按钮直跳 Shopify；H5 只展示不自建购物车 |
| 10 | 服务补漏 | `FeedbackView.vue` `GuideManualView.vue` | 在线客服 FAQ 按"热门/售后查询/使用指导"三类虚拟补充；修复产品说明书返回按钮（漏引 `useRouter`） |

---

## 3. 怎么补全这个产品的（方法论）

连起来看，补全一个"H5 嵌原生壳"的产品，核心是一套可复用的做法：

### 3.1 决策先钉死在文档里
- 每个业务流先列决策点（原生 vs H5、审核顺序、红点归属、跳转去向），让用户拍板后写入 PRD。
- 好处：开发时不纠结"这功能到底归谁"，照文档执行即可。

### 3.2 按"数据 → 入口 → 详情 → 动态 → 交互"顺序排期
- 先补 mock 数据模型和登录 Gate（地基），再依次往上盖：入口红点 → 详情排版 → 独立动态流 → 发布点赞关注。
- 每块独立 build + commit + 双 remote 推送，出问题可单独回滚，不牵连其他块。

### 3.3 原生能力用"桥接契约"封装，H5 兜底保预览
- 所有原生跳转统一走 `bridge`：`openNative('module/action?k=v')`（页面跳转）、`openShopify(url)`（外部购买）、`navigateTo(key)`（切底部 tab）。
- 契约写进 `INTEGRATION.md`，原生 Flutter 端按表对齐标识即可。
- 无原生时的 mock bridge 提供 H5 兜底页（search/vehicle/customize），保证 `npm run preview` 也能走通整条链路，不等联调。

### 3.4 内容数据"真实化"虚拟，不写废文
- 推荐流、车型卡、商城商品都从 pxid.com 真实在售型号取数据虚拟，保证产品感真实；而非"货运三轮"占位重复文。

### 3.5 视觉一律走规范令牌
- 颜色/圆角/间距全部引用 `tokens.css` 令牌，遵守《ToC App 视觉开发规范》。
- 曾踩坑：积分页金币用了硬编码金黄（规范色板无金色），已改品牌蓝+白字收敛。
- 组件化前提下，颜色细节后续统一过规范，不 blocking 业务流。

### 3.6 商城定位："前台展示 + 外链成交"
- ToC App 商城只是 Shopify 的前台橱窗，点击商品直接 `openShopify` 跳外部购买，H5 不自建购物车/结算/订单流（决策 A 的延伸落地）。

---

## 4. 当前进度与遗留

### 已完成
- 发现页业务流 5 大块 + 辅助（积分页、Shopify 打通、FAQ 分类、返回修复）全部落地，构建稳定通过（110 模块），双 remote 同步至 `6eb784b`。

### 遗留项（不阻塞，按需推进）
1. **原生联调依赖**：`auth.js` 的 `openNative('login')`、车型/定制/搜索等跳转，需 Flutter 注入真实 `window.PXIDBridge` 才能在生产环境真正跳原生；H5 侧契约已就绪。
2. **商城孤儿页**：`CartView` / `CheckoutView` / `OrderSuccessView` / `OrderListView` 已无流量（商城改走 Shopify），暂未删除，待清理。
3. **价格红令牌**：`--price: #e53935` 为业务令牌（国内电商习惯），规范未定义价格色；若要统一为规范错误红 `#D93025` 待你定。
4. **视觉规范全量对齐**：已做页面是否全部过《ToC App 视觉开发规范》颜色/字号，待组件化统一核对。

---

## 5. 关键交付物清单

**文档**
- `docs/discover-business-flow.md` —— 产品决策 + 开发排期（本日工作的总纲）
- `INTEGRATION.md` —— H5 × 原生 Flutter 桥接契约（openNative / openShopify / navigateTo 标识表）
- `docs/dev-summary-2026-08-14.md` —— 本总结

**新增/改造页面**
- 业务流：`FeedDetailView.vue` `MomentCard.vue` `NoticesView.vue` `NoticeDetailView.vue`
- 积分：`PointsView.vue`
- H5 兜底：`VehicleDetailView.vue` `CustomizeView.vue` `SearchView.vue`
- 改造：`DiscoverView.vue` `FeedbackView.vue` `GuideManualView.vue`

**桥接与数据**
- `src/bridge/index.js` —— `getToken / openNative / navigateTo / requestPurchase / callPhone / openMap / openShopify`
- `src/utils/auth.js` —— `requireLogin()` 登录 Gate
- `src/store/ui.js` —— 动态红点状态
- `src/data/mock.js` —— 全量虚拟数据（feedItems / moments / notices / products / pointsProducts / feedbackFaqs 等）

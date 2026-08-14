# PXID H5 × 原生 Flutter 集成契约

> H5 通过 `src/bridge` 暴露的统一接口与原生通信。生产环境由 Flutter 在 WebView 中注入 `window.PXIDBridge` 真实实现；独立预览时由 `mockBridge` 兜底（仅 console.log，部分能力有 H5 等价页）。

## 调用出口

业务代码一律 `import { bridge } from '../bridge'`，不直接访问 `window.PXIDBridge`。

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `getToken` | `() => Promise<string>` | 获取登录态 token；缺失即未登录 |
| `navigateTo` | `(tab: string) => void` | 切换到原生底部 tab：`discover` / `featured` / `purchase` / `service` / `profile` |
| `openNative` | `(path: string) => void` | 打开原生页面（见下方约定） |
| `requestPurchase` | `(payload) => Promise<boolean>` | 拉起原生购买/下单；resolve 支付结果 |
| `callPhone` | `(phone: string) => void` | 拨号 |
| `openMap` | `({lat, lng, name}) => void` | 地图导航 |
| `openShopify` | `(url: string) => void` | 打开 Shopify 商品/页面（商城与 Shopify 打通，H5 仅展示、点击跳 Shopify 购买） |

## `openNative` 约定（重要）

**统一接收字符串 `path`，格式：`module/action?param=value`**

- `module/action` 用 `/` 分隔；多参数用 `&` 连接；值需 `encodeURIComponent`。
- ❌ 不允许对象形式：`openNative({ action: 'x', id })`、`openNative({ target: 'x.y', id })`。
- ✅ 正确：`openNative('feed/interact?type=like&id=1')`。

### 已用标识一览

| path | 触发场景 | 业务流 |
| --- | --- | --- |
| `login` | 缺失登录时跳转原生登录（决策 4） | 全局登录 Gate |
| `discover/publish` | 发现页「＋」发布（决策 1，H5 降级提示） | 发布 |
| `purchase/customize` | 立即定制 / 车型详情「立即定制」（决策 2/8） | 购车 |
| `vehicle/<id>` | 车型卡 / 动态车型标签（决策 8） | 购车 |
| `feed/interact?type=like&id=<id>` | 点赞 | 互动 |
| `feed/follow?id=<id>` | 关注作者 | 互动 |
| `share/feed?id=<id>` | 分享 | 互动 |
| `address/list` | 结算页选地址 | 下单 |
| `manual/download?model=<m>` | 说明书下载 | 服务 |
| `vehicle/check?model=<m>` | 车辆体检 | 服务 |
| `vehicle/bind` | 切换/绑定车辆 | 服务 |
| `service/contact?orderId=<id>` | 工单联系客服 | 服务 |
| `service/cancelOrder?orderId=<id>` | 取消工单 | 服务 |
| `rescue/submit?<params>` | 道路救援提交 | 服务 |
| `buy/customize?<params>` | 购车定制提交 | 购车 |
| `search?q=<kw>` | 搜索（决策相关，H5 兜底页） | 发现 |
| `points/rules` | 积分页「积分规则」 | 积分 |
| `points/guide` | 积分页「玩转积分」banner | 积分 |
| `points/mall` | 积分页「更多」跳转积分商城 | 积分 |
| `points/exchange?id=<id>` | 积分商品「兑换」 | 积分 |

## H5 兜底页（预览 / 无原生时）

`mockBridge.openNative` 会把以下标识映射到同名 H5 路由，便于浏览器预览走通链路；其余标识仅打印日志：

- `vehicle/<id>` → `/vehicle/:id`
- `purchase/customize` → `/purchase/customize`
- `search?q=<kw>` → `/search`

> 原生接入后，上述 H5 兜底页可保留作为降级，也可由原生直接接管。

## 商城（精选 / 积分好物）与 Shopify 打通

- ToC App **只在前台展示商品数据**（图片、名称、价格来自 Shopify 商品 feed / 接口，预览期用 `mock.products` / `mock.pointsProducts` 等价字段）。
- 用户点击商品 / 「去购买」时，调用 `bridge.openShopify(product.shopUrl)` 跳转到 Shopify 完成购买；H5 **不自建购物车 / 结算 / 订单流**。
- 商品数据需携带 `shopUrl`（Shopify 商品页地址）。预览期 mock 用 `https://shop.pxid.com/products/<handle>` 占位。
- 原生侧 `openShopify` 实现：在 WebView 或外部浏览器打开该 URL，并保留返回能力。

## Flutter 接入清单（联调前必读）

H5 这边已全部完成并推送到 `origin/master` 与 `gitlab/main`，构建通过。**原生侧按本文件注入桥即可联调**。

### 1. 注入时机
- WebView 加载 H5 前注入 `window.PXIDBridge` 真实实现（Android `JavascriptChannel` / iOS `WKScriptMessageHandler`）。
- 注入后 H5 自动跳过 `mockBridge`（代码判断 `if (!window.PXIDBridge) window.PXIDBridge = mockBridge`）。
- 所有方法请保证异步安全；`getToken` / `requestPurchase` 返回 Promise。

### 2. 必须实现的 7 个方法（签名见「调用出口」表）
`getToken` / `navigateTo` / `openNative` / `requestPurchase` / `callPhone` / `openMap` / `openShopify`

- `getToken`：返回当前登录 token；**未登录返回空串**，H5 的登录 Gate（`auth.js`）会据此调 `openNative('login')`。
- `navigateTo(tab)`：tab 取值 `discover` / `featured` / `purchase` / `service` / `profile`，对应原生底部 5 个 tab。
- `openNative(path)`：解析「已用标识一览」表里的 `module/action?param=value` 字符串，路由到对应原生页。
- `openShopify(url)`：在 WebView/外部浏览器打开商品 URL，保留返回。

### 3. 登录闭环（重点）
- H5 在缺失 token 时调 `openNative('login')` → 原生拉起登录页。
- 登录成功后 **`getToken` 要能立即拿到新 token**（H5 不刷新页面，靠 token 变化判断登录态）。

### 4. 验收方式
- 联调时建议原生侧打印 H5 实际调桥的 `path`，与「已用标识一览」逐条对一遍。
- H5 全量路径已通（含 H5 兜底页 `/vehicle/:id`、`/purchase/customize`、`/search`、`/points`）；注入原生后这些应由原生接管或保留降级均可。

### 5. 视觉规范
- H5 颜色/字号/圆角/间距统一走 `tokens.css` 令牌，依据《ToC App 视觉开发规范》。**原生侧（Flutter 写的页面）也请对齐同一份规范**，保证两端视觉一致。

### 6. 当前已知边界（联调时留意）
- 车型 `vehicle/<id>` 的 `id` 由 H5 传入真实型号字符串（如 `MOTA Z3`），原生按自有车型库解析即可。
- `rescue/submit`、`buy/customize` 等带多参标识，原生需按 `?k=v&k=v` 解析。
- H5 内 `CartView`/`CheckoutView`/`OrderSuccessView`/`OrderListView` 为商城孤儿页（车辆购买走 `requestPurchase`、商品走 `openShopify`），联调无需关注。

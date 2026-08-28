# PXID × Shopify 结账桥接（Flutter 原生侧 · Trae 编写版）

> **读者**：Flutter 原生开发同学（用 Trae 实现）  
> **目的**：本文是**原生侧结账闭环的唯一对齐依据**。  
> **总纲**：先看仓库根目录 `INTEGRATION.md` §10「商城与 Shopify 打通」；本文是它的 Shopify 专项展开，按 🔴🟠🟡🟢🔵 五步流程写清楚。

---

## 🔴 读：H5 侧已经给了什么

### 1.1 H5 负责的边界

- 商品**数据展示**：列表 / 详情 / 购物车 / 确认订单页。
- 唤起结账：用户点「提交订单」→ 调 `bridge.openCheckout(lines)`。
- 支付成功页：`OrderSuccessView.vue` 已支持 `orderId` / `currency` 参数。
- 取消/失败：留在确认页并提示。

### 1.2 H5 调用契约（`src/bridge/index.js`）

```js
const res = await bridge.openCheckout(lines)
// lines: Array<{
//   variantId: string | null,   // gid://shopify/ProductVariant/<id>；mock 阶段可能为 null
//   quantity: number,
//   shopUrl?: string,           // variantId 缺失时的兜底商品页
//   name?: string               // 展示用
// }>
// 返回：{ ok: true, orderId?: string } | false
```

### 1.3 两方模型

- **我们（H5 + Flutter 原生）= 前端展示与结账编排**。
- **Shopify 兄弟（每国一个独立店铺）= 真正的后端**（数据 / 结账 / 支付 / 出单 / 发货 / 退款）。
- 没有独立 Java 后端——Storefront token 是公开级（unauthenticated scope），**直接放原生层即可，无需服务端代理**。

---

## 🟠 找：Flutter 侧必须补齐的根因

- **根因**：H5 只做展示，真正的结账必须在原生层完成。
- **唯一硬活**：拿 H5 传来的购物车行，调该国店 Shopify Storefront `cartCreate` 生成 `checkoutUrl`，用 WebView 打开 Shopify 结账，监听 `return_to` 回弹，把结果回给 H5。
- **一句话职责**：
  ```
  H5 确认订单页点「提交订单」 → bridge.openCheckout(lines)
     → 你：cartCreate → checkoutUrl → WebView 打开 Shopify 结账
     → 用户付款 → return_to(pxid://checkout/done) 回弹 → 关闭 WebView
     → 你：resolve 给 H5 → H5 跳「支付成功」页
  ```

---

## 🟡 提：实现方案（已定，直接执行）

- **单一路线**（无分支）：`getLocale().country` 路由到该国店 → 逐行校验 → `cartCreate` → WebView 打开 `checkoutUrl` → 监听 `pxid://checkout/done` → 关闭 WebView → resolve。
- 不采用「外部浏览器打开」：必须 WebView，否则 `return_to` 回不到 App。
- `variantId` 为 null 时：用 `shopUrl` 兜底打开 Shopify 商品页，整单 resolve `false`。

---

## 🟢 解决：Flutter 具体实现步骤

### 步骤 1：路由到该国店铺

用 `getLocale()` 的 `{ country }` 决定用哪个店铺的 Storefront（域名 + token）。

- 配置表放原生，或远程配置下发。
- 必须与 H5 展示数据来自同一国店铺。
- 常见映射示例：
  ```
  CN → pxid-cn.myshopify.com → <CN storefront token>
  US → pxid-us.myshopify.com → <US storefront token>
  BR → pxid-br.myshopify.com → <BR storefront token>
  ```

### 步骤 2：逐行校验

遍历 `lines`：

- `variantId` 有效 → 进入下一步。
- `variantId` 为 null → 视为「未同步商品」。
  - 用 `shopUrl` 兜底：直接 WebView 打开该商品页，让用户在 Shopify 上加购。
  - 同时 resolve `false` 前可提示 H5「该商品需前往 Shopify 选购」，或整单失败提示。

### 步骤 3：调用 `cartCreate`

用 Storefront API 的 `cartCreate` mutation：

```graphql
mutation {
  cartCreate(input: {
    lines: [{ merchandiseId: "<variantId>", quantity: <qty> }]
    buyerIdentity: {
      email: "<App登录用户邮箱>"
      countryCode: <country>
      # 可选：phone / deliveryAddress 预填收货信息
    }
  }) {
    cart { id checkoutUrl }
    userErrors { field message }
  }
}
```

- **email 必须传**：订单按 email 落到该店 customer，也是后续订单同步关联我们用户的唯一依据。
- 这是「预填」不是「登录 Shopify 账号」—— Shopify 结账默认游客结账，用户无需 Shopify 密码（见后端规范 §5.7）。

### 步骤 4：复校验价 / 库存（建议）

`cartCreate` 前可用 Storefront 查该 variant 当前 `price` / `availableForSale`。

- 与 H5 展示不一致 → 返回错误。
- H5 提示「该规格价格或库存已更新，请重新确认」，避免 Shopify 端价格跳变。

### 步骤 5：打开结账

- 用 WebView 打开 `cart.checkoutUrl`。
- **不要外部浏览器**，保证 `return_to` 能回 App。
- WebView 需正常保存 cookie / 会话，否则每次打开都像新访客。

### 步骤 6：回弹处理

监听 scheme `pxid://checkout/done`（可带参 `?orderId=<shopifyOrderId>`）。

捕获后：

1. 关闭 WebView。
2. `openCheckout` resolve：`{ ok: true, orderId: '<shopifyOrderId>' }`（orderId 可空）。
3. H5 据此跳「支付成功」页并显示订单号。

### 步骤 7：取消 / 失败

- 用户关闭 WebView → resolve `false`。
- `cartCreate` 报 userErrors（缺货 / 下架）→ resolve `false`。
- H5 保持确认页并提示「该规格暂不可购」。

### 配套 bridge 方法（ Flutter 侧需保证）

| 方法 | 状态 | 说明 |
| --- | --- | --- |
| `getLocale()` | 已约定 | 返回 `{locale, country, currency}`；结账路由用 `country` |
| `openCheckout(lines)` | **本次核心** | 上文 §🟢 |
| `openShopify(url)` | 已有 | 打开 Shopify 商品页 / 店铺页（详情页兜底、公告外链等） |
| `openNative(path)` | 已有 | `share/feed`、`settings/language`、`address/list` 等 |
| `getToken()` / `requestPurchase()` | 已有 | `requestPurchase` 现仅用于车辆购买；商品结算改走 `openCheckout` |

> H5 侧 `openCheckout` 的 mock 兜底：预览环境直接 resolve `true`（无真 checkoutUrl），联调时原生注入后即被覆盖。

---

## 🔵 收尾：验收清单 + 关键注意 + 二期订单同步

### 联调检查清单

- [ ] `getLocale().country` 正确路由对应国店铺（token / 域名映射无误）。
- [ ] `openCheckout` 收到 lines 后能生成 `checkoutUrl` 并在 WebView 打开。
- [ ] `buyerIdentity` 正确预填 email / 收货信息（用户几乎不用重输）。
- [ ] `pxid://checkout/done` 回弹后 WebView 关闭、resolve `{ok:true, orderId}`。
- [ ] `cartCreate` userErrors（缺货 / 下架）能透传，H5 提示「该规格暂不可购」。
- [ ] 真机 + 不同国家定位各跑一遍（每国店独立 token）。

### H5 状态流转对照

| 状态 | H5 表现 | 你的触发 |
| --- | --- | --- |
| 提交中 | 按钮禁用「提交中...」 | — |
| 跳转 Shopify | WebView 打开 checkoutUrl | `openCheckout` 被调用后 |
| 支付完成 | 跳「支付成功」页，清购物车 | resolve `{ok:true, orderId}` |
| 用户取消 | 留在确认页 | resolve `false` |
| 缺货 / 价格漂移 | toast「该规格暂不可购 / 价格已更新」 | resolve `false` |

### 关键注意

1. **Storefront token 不能进 H5 代码**（会被浏览器暴露）；放原生层或原生发起的请求里。
2. **每个国家店独立**：token 和域名按 `country` 映射，不要混用（多国定位见 `PXID_多国定位_i18n_对接规范.md`）。
3. **WebView 别丢 cookie / 会话**：Shopify 结账页可能用到会话，确保 WebView 正常保存，否则每次 checkoutUrl 打开都像新访客。
4. **价格 / 库存漂移**：`cartCreate` 前建议复校验，不一致让 H5 提示。
5. **支付成功页**：H5 的 `OrderSuccessView.vue` 已支持 `orderId` / `currency` 参数，回弹时尽量带上真实订单号。

### 订单同步（二期可选，不用急）

「我的订单」需要 Shopify `orders/create` webhook 推到一个公网端点 → 落库 → App 读取。没有 Java 后端时：

- 用一个云函数（阿里云 FC / Cloudflare Worker）收 webhook + HMAC 校验 + 轻量存储即可；
- 或一期不做，App「我的订单」先外链 Shopify 账户页 / 展示本地已付记录。

> 契约细节见 `PXID_Shopify_对接契约_Codex版.md` §4——那是对 Shopify 兄弟的要求，你的取舍由你们定。

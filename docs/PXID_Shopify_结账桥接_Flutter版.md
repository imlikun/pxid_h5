# PXID × Shopify 结账桥接（Flutter 原生侧）

> 读者：**Flutter 原生开发同学**
> 目的：商品列表/详情/加购由 H5 完成，**结账交接是原生侧唯一的硬活**——由你（Flutter）在原生层调 Shopify Storefront `cartCreate` 生成 `checkoutUrl`，用 WebView 打开 Shopify 结账，并处理 `return_to` 回弹。本文是这一段的**唯一对齐依据**。
> 两方：**我们（H5 + Flutter 原生）** / **Shopify 兄弟（每国一个独立店铺，见 `PXID_Shopify_对接契约_Codex版.md`）**。没有独立 Java 后端——Storefront token 是公开级（unauthenticated scope），**可以直接放 App 原生层**，不需要服务端代理。

---

## 0. 为什么这活归 Flutter（不需要 Java）

| 能力 | 归属 | 原因 |
| --- | --- | --- |
| 商品列表/详情/加购/确认页 | H5（已完成） | 纯展示 + 本地购物车 |
| 生成 checkoutUrl（cartCreate） | **Flutter 原生** | Storefront token 是 unauthenticated（公开级），按 Shopify 官方设计本就可放客户端；无服务端时由原生直调最干净 |
| 打开 Shopify 结账页 | **Flutter 原生** | WebView 打开 checkoutUrl，需要原生上下文 |
| 支付完成回弹（return_to） | **Flutter 原生** | 监听 `pxid://checkout/done` scheme 并关闭 WebView |
| 订单同步（可选，二期） | 云函数/Serverless | webhook 需要一个公网端点；一期可不做，「我的订单」先外链 Shopify 或留空 |

**给 H5 的桥方法只有一个：`openCheckout(lines)`。** H5 在确认订单页点「提交订单」时调用，把购物车行交给你。

---

## 1. H5 → 原生 桥方法契约

```js
// H5 调用（已实现，见 src/bridge/index.js）
bridge.openCheckout(lines)
// lines: Array<{
//   variantId: string | null,   // gid://shopify/ProductVariant/<id>；mock 阶段可能为 null
//   quantity: number,
//   shopUrl?: string,           // 兜底用（variantId 缺失时打开商品页）
//   name?: string               // 展示用
// }>
// 返回 Promise<boolean>：true = 已跳转/已支付回弹；false = 用户取消或失败
```

### 原生实现要求（照此实现即可联调）
1. **路由到该国店铺**：从 H5 之前拿到的 `getLocale()`（`{country}`）决定用哪个店铺的 Storefront（域名 + token）。配置表放原生（或远程配置下发），与 H5 展示数据来自同一国店铺。
2. **cartCreate**：用 Storefront API 的 `cartCreate` mutation：
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
   - **email 必须传**：订单按 email 落到该店 customer，也是后续订单同步关联我们用户的唯一依据（见 §4）。
   - 这是「预填」不是「登录 Shopify 账号」——Shopify 结账默认游客结账，用户无需 Shopify 密码（见后端规范 §5.7）。
3. **打开结账**：用 WebView 打开 `cart.checkoutUrl`（不要用外部浏览器，保证 return_to 能回 App）。
4. **回弹**：监听 `pxid://checkout/done` scheme（可带参如 `?orderId=`）。捕获后关闭 WebView，`openCheckout` resolve `true`，可展示原生/ H5 支付完成页。
5. **取消/失败**：`cartCreate` 报 userErrors（缺货/下架）或用户关闭 WebView，resolve `false`（H5 据此提示）。

---

## 2. 你需要在 `window.PXIDBridge` 上实现/确认的方法

| 方法 | 状态 | 说明 |
| --- | --- | --- |
| `getLocale()` | 已约定 | 返回 `{locale, country, currency}`，H5 启动时取一次；结账路由用 `country` |
| `openCheckout(lines)` | **本次新增** | 上文 §1，核心 |
| `openShopify(url)` | 已有 | 打开 Shopify 商品页/店铺页（详情页兜底、公告外链等） |
| `openNative(path)` | 已有 | `share/feed`、`settings/language`、`address/list` 等 |
| `getToken()` / `requestPurchase()` | 已有 | `requestPurchase` 现仅用于车辆购买，商品结算已改走 `openCheckout` |

> H5 侧 `openCheckout` 的 mock 兜底：预览环境无真 checkoutUrl，会直接 `window.open` 第一个 `shopUrl` 模拟跳转（联调时原生注入后即被覆盖）。

---

## 3. 联调检查清单

- [ ] `getLocale()` 的 `country` 能正确路由到对应国店铺（token/域名映射正确）。
- [ ] `openCheckout` 收到 lines 后能生成 checkoutUrl 并在 WebView 打开。
- [ ] buyerIdentity 正确预填 email/收货信息（用户几乎不用重输）。
- [ ] `pxid://checkout/done` 回弹后 WebView 关闭、`openCheckout` resolve `true`。
- [ ] cartCreate userErrors（缺货/下架）能原样透传，H5 提示「该规格暂不可购」。
- [ ] 真机 + 不同国家定位各跑一遍（每国店独立 token）。

---

## 4. 订单同步（二期可选，不用急）

「我的订单」需要 Shopify `orders/create` webhook 推到一个公网端点 → 落库 → App 读取。没有 Java 后端时：
- 用一个云函数（阿里云 FC / Cloudflare Worker）收 webhook + 校验 HMAC + 写个轻量存储（表格/对象存储）即可；
- 或一期不做，App「我的订单」先外链 Shopify 账户页 / 展示本地已付记录。

> 契约细节（webhook 地址、HMAC 密钥、字段）见 `PXID_Shopify_对接契约_Codex版.md` §4——那是对 Shopify 兄弟的要求，这里的取舍由你们定。

---

## 5. 关键注意

1. **Storefront token 不能进 H5 代码**（会被浏览器暴露）；放原生层或原生发起的请求里。
2. **每个国家店独立**：token 和域名按 country 映射，不要混用（多国定位见 `PXID_多国定位_i18n_对接规范.md`）。
3. **WebView 别丢 cookie/会话**：Shopify 结账页可能用到会话，确保 WebView 正常保存，否则每次 checkoutUrl 打开都像新访客。
4. **价格/库存漂移**：cartCreate 前可选做一次复校验（用 Storefront 查询该 variant 当前价/库存，与 H5 展示不一致就返回错误让 H5 提示），否则用户在 Shopify 端可能看到价格变化。

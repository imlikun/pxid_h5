# PXID × Shopify 对接契约（Codex 友好版）

> 读者：**Shopify 店铺开发同学（用 Codex 实现）**
> 目的：本文件是 Shopify 侧对接的**唯一对齐依据**。照此实现，我们的 App（H5 + Flutter 原生）即可拉到商品、完成购买闭环。
> 两方：我们（App 团队：H5 前端 + Flutter 原生，结账编排在 Flutter 原生完成，无独立后端）/ **Shopify（你这边，每国一个独立店铺）**。

---

## 0. 你必须交付的清单（checklist）

- [ ] 每个国家店铺创建 **Storefront API token**（scope 见 §1），交给 Flutter 兄弟。
- [ ] 商品 Collection handle **跨店统一**（§2）。
- [ ] 商品在线页可被外部访问（即 `shopUrl`）。
- [ ] 结账 `return_to` 配为 `pxid://checkout/done`（§3）。
- [ ] （可选，二期）注册 webhook `orders/create` + `orders/updated` 到我们侧公网端点（§4，HMAC 校验）。
- [ ] 运费区 / 承运商 + 锂电跨境运输规则按目标国配置（§5）。
- [ ] 结账页品牌化（§6）。

---

## 1. Storefront API token

创建位置：Shopify Admin → Settings → Apps and sales channels → Develop apps → 新建 app → 配置 Storefront API 权限，勾选：

- `unauthenticated_read_product_listings`
- `unauthenticated_read_collections`
- `cart`（用于 `cartCreate` 生成结账链接）

将生成的 **Storefront API access token** 文本交给 Flutter 兄弟（**切勿进入前端 / H5**）。
每个国家店铺各发一个，对应 Flutter 原生配置里的 `{ country: token }`。

---

## 2. Collection handle 约定（跨店一致）

我们按 handle 拉取分区，请严格使用以下 handle（新增分区先与我们对齐再上架）：

| handle | 含义 |
| --- | --- |
| `spring` | 踏春装备 |
| `p1parts` | P1 配件 |
| `points` | 积分商城 |

---

## 3. 结账回弹 return_to

Shopify 结账完成 / 取消后需回到 App。配置 checkout 的 `return_to` = `pxid://checkout/done`（或你们与 Flutter 约定的 scheme）。

H5 在 WebView 内打开 `checkoutUrl`，Flutter 监听该 scheme 关闭 WebView 并展示订单确认页。

---

## 4. 订单 webhook（可选，二期；一期可不做）

> 一期不做「我的订单」时可跳过本节，App 侧先外链 Shopify 账户页 / 展示本地已付记录。若做 App 内订单中心，按本节配置。

在 Shopify Admin → Settings → Webhooks（或用 Admin API）注册：

- 事件：`orders/create`、`orders/updated`
- 格式：JSON
- 目标 URL：我们侧公网接收端点（无后端时用云函数 / Cloudflare Worker，最终地址以我们确认为准）
- 签名：开启签名；接收端用请求头 `X-Shopify-Hmac-Sha256` 做 HMAC-SHA256 校验（密钥与我们约定）。

推送的 order JSON 至少包含：

```json
{
  "id": 123456789,
  "email": "user@example.com",
  "financial_status": "paid",
  "fulfillment_status": "unfulfilled",
  "currency": "USD",
  "total_price": "1850.00",
  "created_at": "2026-08-17T10:00:00Z",
  "line_items": [
    { "title": "Ant5", "quantity": 1, "price": "1850.00", "sku": "P5AB000001" }
  ]
}
```

---

## 5. 运费与合规（跨境电车）

- 按目标国配置 **Shipping zones** + 承运商费率。
- 锂电 / 电车属危险品，部分承运商 / 国家限制，请在 Shopify 侧按国配置可售与禁运规则，避免下单后无法发货。

---

## 6. 结账页品牌化（建议）

支付步骤在 Shopify 结账页完成。建议：

- 在 Shopify 主题 / 结账品牌设置中套用 PXID 主色与 Logo，保持与 App 视觉连续。
- 文案使用目标国语言（店铺语言设置）。

---

## 7. 给 Codex 的精确实现提示

- 不要改动商品 / 集合的数据结构，只按上面 handle 与字段暴露。
- `cartCreate` 的 `merchandiseId` 用 `gid://shopify/ProductVariant/{variant_id}`，`variant_id` 来自商品 `variants` 接口。
- 多币种由「每国一个店」决定，**不要**在单个店里做 Markets 切换；Flutter 原生会按用户地区访问对应国的店。
- 任何新增接口 / 字段，先同步我们（App 团队），避免 H5 解析失败。

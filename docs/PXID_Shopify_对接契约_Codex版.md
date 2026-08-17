# PXID × Shopify 对接契约（Codex 友好版）

> 读者：**Shopify 店铺开发同学（用 Codex 实现）**
> 目的：本文件是 Shopify 侧对接的**唯一对齐依据**。照此实现，我们的 App（H5 + Flutter 原生）即可拉到商品、完成购买闭环。
> 两方：我们（App 团队：H5 前端 + Flutter 原生，结账编排在 Flutter 原生完成，无独立后端）/ **Shopify（你这边，每国一个独立店铺）**。

---

## 0. 完整购买流程（先看这节，理解你在链路里的位置）

```
[App 内] 用户浏览商品列表 / 详情（数据 = 你的店铺 /products.json）
   → H5 选规格加购物车 → 确认订单页 → 点「提交订单」
[Flutter 原生] 拿购物车行 → 调你的店铺 Storefront cartCreate（带 buyerIdentity 预填邮箱/地址）
   → 拿到 checkoutUrl → 在 App 内 WebView 打开 Shopify 结账页
[Shopify 店铺 = 你] 地址 / 国际运费 / 关税 / 支付 / 出单 / 发货 / 退款 —— 全部在这边完成
   → 支付完成 → return_to 回弹回 App
[App 内] 「支付成功」页（订单号）；二期经 webhook 同步订单进我们库
```

**你在整条链路里的职责：店铺本身（商品 / 结账 / 支付 / 发货）。** 你要交付的清单见下。

## 0.1 你必须交付的清单（checklist）

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

Shopify 结账完成 / 取消后需回到 App。配置 checkout 的 `return_to` = `pxid://checkout/done`（或你们与 Flutter 约定的 scheme），**支付完成时请带上订单号**：`pxid://checkout/done?orderId=<shopify_order_id>`（App 内「支付成功」页据此显示真实订单号）。

H5 在 WebView 内打开 `checkoutUrl`，Flutter 监听该 scheme 关闭 WebView 并 resolve 给 H5。

### 3.1 买家身份预填（buyerIdentity，你只需知道、不用做）

Flutter 在 `cartCreate` 时会把 App 登录用户的 `email / phone / countryCode / 收货地址` 放进 `buyerIdentity`，Shopify 结账页会**预填**这些信息——**这是预填，不是登录 Shopify 账号**，用户无需 Shopify 密码（游客结账）。请确保：
- **不要关闭 guest checkout**（Shopify 默认开启，勿改）。
- 结账页不要强推「创建账号 / 登录」，允许游客直接付。
- 订单按 `email` 落到该店 customer——**请保证 `order.email` 原样保存**，这是我们二期按 email 关联 App 用户的唯一依据。

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

---

## 8. 商品介绍结构化字段（Codex 必填，H5 按此渲染）

> 现成 `body_html` 太简陋（一行英文），H5 无法拼出像样的商品介绍页。请按下方 **JSON 结构** 在每个商品的 **Metafield**（命名空间 `custom`，键 `intro`，类型 `json`）里填一份**结构化介绍**，H5 端会按此渲染富详情页。`products.json` 公开端点不带 metafield，请用 Storefront API 查询时一并返回此字段；H5 通过 `bridge.openCheckout` 同源链路（Flutter 原生 Storefront）拉到 H5（详见 `PXID_Shopify_结账桥接_Flutter版.md`）。

### 8.1 字段定义（必填，结构稳定）

```json
{
  "intro": {
    "summary":  "一句话卖点（≤ 40 字）",
    "highlights": [
      "亮点 1（≤ 20 字）",
      "亮点 2",
      "亮点 3",
      "亮点 4（3-5 条为宜）"
    ],
    "sections": [
      {
        "title": "分段标题",
        "body":  "段落正文（1-3 句，可含简单 <br>）",
        "image": "https://cdn.shopify.com/.../xxx.jpg",
        "specs": [
          { "k": "电机",     "v": "250W 高速无刷" },
          { "k": "电池",     "v": "48V 10Ah 锂电池" },
          { "k": "续航",     "v": "纯电 40km / 助力 60km" },
          { "k": "充电时间", "v": "4-6 小时" },
          { "k": "最大载重", "v": "120 kg" },
          { "k": "整车重量", "v": "21 kg" }
        ]
      }
    ],
    "video": "https://cdn.shopify.com/.../demo.mp4"
  }
}
```

### 8.2 字段说明与规则

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `summary` | string | ✅ | ≤ 40 字，一句话卖点，用于详情页顶部简介 |
| `highlights` | string[] | ✅ | 3-5 条，每条 ≤ 20 字，用于详情页亮点胶囊 |
| `sections[].title` | string | ✅ | 分段标题 |
| `sections[].body` | string | ✅ | 段落正文，支持 `<br>` |
| `sections[].image` | string(url) | ⭕ | 分段配图，建议 ≤ 1MB、宽 ≥ 800 |
| `sections[].specs` | { k, v }[] | ⭕ | 规格参数表，每段 4-8 行；与 `variants[].sku/title` 不冲突 |
| `video` | string(url) | ⭕ | 商品演示视频 mp4 链接，可选 |

### 8.3 Codex 实现要点

1. **每个商品都要填** `custom.intro` metafield（即使内容少，也要有 `summary` + 1 个 `sections`，避免 H5 出现空白）。
2. 同一商品的多语言版本在 metafield 里存多套（命名空间 `custom.locale`，键 `intro_<lang>`，如 `intro_en` / `intro_zh`），H5 按 `getLocale()` 取对应版本；缺语言时回退店铺默认语言。
3. Storefront API 查询示例（Codex 自测用）：
   ```graphql
   query {
     product(handle: "p4") {
       title
       variants(first: 10) { edges { node { id available title } } }
       intro: metafield(namespace: "custom", key: "intro") { value }
       introEn: metafield(namespace: "custom", key: "intro_en") { value }
     }
   }
   ```
4. H5 端已经按本规范做好结构化渲染（`ProductDetailView.vue` 的 `.intro` 区块），拿到 `intro` JSON 直接显示富详情页；拿不到时回退 `body_html`，body_html 为空显示占位"商品介绍待完善"。

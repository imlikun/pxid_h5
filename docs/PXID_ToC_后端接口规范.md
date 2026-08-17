# PXID ToC App 后端接口规范 v1

> 读者：**我们自己的后端同学（App 后端服务，由我们团队维护）**
> 背景：PXID ToC App（H5 + Flutter 原生）当前所有数据都是前端 `mock.js` 假数据，需要后端提供真实接口替换。本文件列出 H5 与原生两侧都要用的全部接口，字段严格对齐前端现有结构，**后端返回的 JSON key 请与本规范保持一致，前端即可零改造接入**。
> 状态：v1 初稿，待后端确认 Base URL 与鉴权细节。

---

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| Base URL | `https://api.pxid.com/pxid/v1`（**待我们确认**） |
| 协议 | HTTPS，请求/响应均为 `application/json`（上传除外） |
| 鉴权 | `Authorization: Bearer <token>`。token 由客户端登录态提供（H5 经 `bridge.getToken()`、原生经登录态） |
| 未登录/失效 | 返回 HTTP 401；前端收到 401 会调 `openNative('login')` 拉起原生登录 |
| 统一响应体 | `{ "code": 0, "message": "", "data": ... }`，`code=0` 为成功 |
| 时间字段 | ISO 8601，如 `2026-08-17T10:00:00+08:00`。前端会自动计算「刚刚 / 2小时前」等相对展示 |
| 分页 | query 传 `page`（从 1 起）、`pageSize`；`data` 返回 `{ total, list }` |
| 图片字段 | **必须返回完整可访问 URL**（如 `https://cdn.pxid.com/...jpg`），不要只返回文件名。前端直接 `:src="url"` 渲染 |
| 车型标识 | `carModel` 统一用真实型号字符串（如 `"MOTA Z3"`、`"P1"`、`"CoolPlay PX-2"`），前后端共用同一枚举 |

---

## 2. 用户与鉴权

### GET /user/me
当前登录用户信息（发帖/动态需要知道作者）。

**响应 data：**
```json
{ "id": "U1001", "nickname": "骑手老王", "avatar": "https://cdn.pxid.com/avatars/u1001.jpg", "points": 1280 }
```
> 注：token 本身应能解出 userId，此接口供前端补全展示信息。发帖时作者信息由后端按 token 注入，前端无需传。

---

## 3. 发现 / 社区动态（核心模块）

> ⚠️ **多人可见的关键**：动态流必须由后端持久化 + 统一下发。当前前端是内存态（`src/store/publish.js`），刷新即丢、不同用户互不可见。**接好下面 3.1 的 `POST /feed` + `GET /feed` 即解决「不同人发布互相看见」。**

### 3.1 动态流列表
#### GET /feed
query：
- `tab`：`recommend`（推荐）/ `dynamic`（关注动态）/ `plaza`（广场）
- `carModel`（可选，车型筛选，如 `MOTA Z3`）
- `page`、`pageSize`

**响应 data.list 单条 `FeedItem` 字段（对齐 `mock.feedItems` / `mock.moments`）：**
```json
{
  "id": 101,
  "kind": "official",            // official | user
  "itemType": "feed",            // feed | moment
  "author": "骑手老王",
  "avatar": "https://cdn.pxid.com/avatars/u1001.jpg",
  "title": "今天跑了 120 公里",
  "content": "正文…",
  "images": ["https://cdn.pxid.com/f/1.jpg"],
  "tags": ["日常跑单", "续航实测"],
  "carModel": "P1",
  "likes": 88,
  "isLiked": false,
  "comments": 21,
  "createdAt": "2026-08-17T08:00:00+08:00",
  "productCard": { "id": 1, "name": "MOTA Z3 性能电摩", "price": 19999, "cover": "https://cdn.pxid.com/p/1.jpg" },  // 可空
  "followed": false              // 是否关注作者（仅动态流）
}
```

### 3.2 发帖
#### POST /feed
> H5 发现页「＋」发布触发 `openNative('discover/publish?content=...')`，由 **Flutter 原生发布器**采集文本/图片/车型，原生侧再调此接口。原生发布器负责图片上传（见 §10）与车型选择。

body：
```json
{ "content": "分享内容（max 1000）", "images": ["https://cdn.pxid.com/f/1.jpg"], "carModel": "P1", "tags": ["日常跑单"] }
```
**响应 data：** 返回新建的 `FeedItem`（同 3.1 结构），`author`/`avatar` 由后端按 token 注入。

### 3.3 详情
#### GET /feed/{id}
返回完整 `FeedItem`。

### 3.4 点赞（切换）
#### POST /feed/{id}/like
**响应 data：** `{ "isLiked": true, "likes": 89 }`

### 3.5 评论
#### POST /feed/{id}/comment
body：
```json
{ "content": "评论内容", "replyTo": "c1r1" }   // replyTo 可选，楼中楼
```
#### GET /feed/{id}/comments
**响应 data.list：**
```json
[{
  "id": "c1", "author": "外卖小哥阿强", "avatar": "https://cdn.pxid.com/a.jpg",
  "content": "这车续航真顶吗？", "createdAt": "2026-08-17T10:22:00+08:00",
  "likes": 8, "isLiked": false,
  "replies": [ { "id": "c1r1", "author": "一路向前", "avatar": "https://cdn.pxid.com/a2.jpg", "content": "亲测够用", "createdAt": "...", "likes": 3, "isLiked": false } ]
}]
```

### 3.6 关注作者
#### POST /user/{id}/follow
**响应 data：** `{ "followed": true }`（再次调用为取关）

### 3.7 广场活动
#### GET /activities
**响应 data.list：** `[{ "id": 1, "title": "...", "date": "05-14", "cover": "https://cdn.pxid.com/a.jpg", "content": "..." }]`（对齐 `mock.activities`）

---

## 4. 官方公告（消息中心系统分类共用）

#### GET /notices
**响应 data.list：**
```json
[{
  "id": "N1", "type": "recall",        // recall | version | activity | safety
  "forceAck": true, "isRead": false,
  "title": "关于部分批次 H10 控制器召回升级的通知",
  "summary": "为保障骑行安全…",
  "publisher": "PXID 产品安全委员会",
  "publishTime": "2026-08-10T10:00:00+08:00",
  "effectiveTime": "2026-08-10 起长期有效",
  "content": "召回范围：…"
}]
```
#### POST /notices/{id}/ack
标记已读/确认（`forceAck=true` 的公告需强制确认才能关闭）。

---

## 5. 精选 / 商城（Headless Shopify 终态）

> **两方架构（2026-08-17 终审，落地依据）**
> - **后端就是 Shopify**：商品数据、购物车、结账、支付、出单、发货、退款全部由 Shopify 承担（每国一个独立店铺，用 Codex 编写，详见 `PXID_Shopify_对接契约_Codex版.md`）。**没有独立的中间后端团队**。
> - **我们 = 前端展示**：H5 做商品列表 / 详情 / 自有加购 / 自有「确认订单」页；**Flutter 原生**负责结账交接——用该国店 Storefront `cartCreate` 生成 `checkoutUrl` → WebView 打开 Shopify 结账 → `return_to` 回弹 App。Storefront token 为公开级（unauthenticated scope），**可直接放 Flutter 原生层，无需服务端代理**（详见 `PXID_Shopify_结账桥接_Flutter版.md`）。
> - **多国 = 每国一个 Shopify 店铺**（非 Markets / `@inContext`）。App 账号与地区 1:1 对应到某国店铺；多币种由「选对店」解决——Flutter 按 `getLocale()` 的 `country` 路由到对应店铺（域名 + token 在原生侧按地区配置，见 5.1）。
> - **购买逻辑边界（已确认）**：点「去支付」→ Flutter `cartCreate` 生成 `checkoutUrl` → WebView 打开 Shopify 结账（地址 / 国际运费 / 关税 / 支付 / 出单 / 发货 / 退款全在 Shopify）→ `return_to` 回弹 App。订单经 Shopify `orders` webhook 同步（可选，见 5.4）。

### 5.0 Shopify 侧前置（Shopify 兄弟，按 Codex 契约实现）
- 每个国家店铺创建 **Storefront API 令牌**，scope 至少：`unauthenticated_read_product_listings`、`unauthenticated_read_collections`、`cart`（用于 `cartCreate`）。令牌交给 Flutter 兄弟（见契约文档，切勿进 H5）。
- Collection handle **跨店统一**（便于按 handle 拉取）：`spring`（踏春）、`p1parts`（P1 配件）、`points`（积分商城）等。
- 商品在线页 URL 即 `shopUrl`（如 `https://{country-store}/products/ant5`）。
- 结账 `return_to` 配为 App scheme（如 `pxid://checkout/done`），用于支付后回弹。
- （可选）注册 webhook：`orders/create` + `orders/updated` → 指向我们侧公网接收端点（HMAC 校验，见 5.4）。
- 运费区 / 承运商 + 跨境电车（锂电）运输规则按目标国配置。

### 5.1 Flutter 原生实现要点（无服务端代理）
- **地区 → 店铺路由**：在 Flutter 原生维护配置 `country/region → { shopifyDomain, storefrontToken }`。`country` 取自 `getLocale()`（见《多国定位 i18n 对接规范》）。
- 商品数据获取：H5 直接请求该国店 Storefront（`unauthenticated` 公开查询），或由原生转交给 H5；**缓存 5–15min**（目录不常变）；返回该国店默认币种（无需 `@inContext`）。
- 归一化映射（Shopify → 本规范 `Product`）：

| Shopify 字段 | Product 字段 | 说明 |
| --- | --- | --- |
| `id` / `handle` | `id` | |
| `title` | `name` | |
| `priceRange.minVariantPrice.amount` | `price` | 同时取 `currencyCode` → `currency` |
| `compareAtPrice` | `origin` | 无则空 |
| `images[0].url` | `cover` | 完整 URL |
| `tags` / 元字段 | `tag` | 主标签 |
| 忽略 | `sales` | Shopify 无原生销量，置 0 或库存近似 |
| `collections` handle | `collection` | |
| 在线商品页 | `shopUrl` | |
| `variants[]`（id / title / price / availableForSale / selectedOptions） | `variants` | **新增**，结账必传 `variantId` |
| `options[]`（name / values） | `options` | **新增**，前端动态渲染规格选择 |

### 5.2 商品列表
#### GET /products
query：`collection`（如 `spring` / `p1parts` / `points`，可选）、`country`（可选，缺省用登录地区）、`page`、`pageSize`
**响应 data.list（对齐 `mock.products`，新增 `currency` / `variants` / `options`）：**
```json
[{
  "id": 1, "name": "鸭舌帽 男士", "price": 280, "origin": 399, "currency": "CNY",
  "cover": "https://cdn.pxid.com/p/1.jpg", "tag": "踏春装备", "sales": 0,
  "collection": "spring", "shopUrl": "https://shop.pxid.com/products/cap-men",
  "options": [{ "name": "颜色", "values": ["黑", "白"] }],
  "variants": [{ "id": "gid://shopify/ProductVariant/43810663202975", "title": "黑", "price": 280, "available": true, "selectedOptions": { "颜色": "黑" } }]
}]
```
> `currency`：随店铺所在国返回（CNY / USD / EUR …），H5 按它渲染符号，不再写死 ¥。
#### GET /products/{id}
返回单条商品（含 `images[]`、`description`、`variants`、`options` 供详情页渲染规格选择）。

### 5.3 结账编排（Flutter 原生，核心新增）
> H5「去支付」调 `bridge.openCheckout(lines)`（见 `PXID_Shopify_结账桥接_Flutter版.md`）。Flutter 原生用该国店 Storefront `cartCreate`，入参购物车行（variantId + 数量），**先复校验价 / 库存**，返回 `checkoutUrl`。
lines（H5 传给原生）：
```json
[ { "variantId": "gid://shopify/ProductVariant/43810663202975", "quantity": 1, "shopUrl": "https://{country-store}/products/ant5", "name": "Ant5" } ]
```
**cartCreate 返回：**
```json
{ "checkoutUrl": "https://{country-store}/cart/.../checkout/..." }
```
> 失败（缺货 / 下架 / 价格漂移）：返回错误，H5 据此提示「该规格暂不可购」。
> Flutter 拿到 `checkoutUrl` 后在 WebView 内打开 Shopify 结账，支付后按 `return_to` 回弹 App。

### 5.4 订单同步（可选，二期）
> 若做 App 内「我的订单」：Shopify `orders/create` + `orders/updated` webhook 推到一个**公网端点**（无后端时用云函数 / Cloudflare Worker + 轻量存储即可），**必须 HMAC 校验**（`X-Shopify-Hmac-Sha256`，密钥与 Shopify 兄弟约定）。
body：Shopify order JSON（含 `id` / `email` / `financial_status` / `fulfillment_status` / `line_items` / `total_price`）。落库（按 `email` 关联用户），供「我的订单」读取。
> 一期可不做：App「我的订单」先外链 Shopify 账户页，或仅展示本地已付记录。

### 5.5 我的订单（读）
数据来自 5.4 同步的库（非直接查 Shopify），对齐 `mock.orders`：
```json
[{ "id": "PX20260812003", "time": "2026-08-12T15:22:00+08:00", "status": "已发货", "currency": "CNY", "items": [{ "name": "原装后轮 适配P1", "cover": "https://cdn.pxid.com/p/2.jpg", "price": 6800, "qty": 1 }], "total": 6800 }]
```
> 售后 / 退款在 Shopify 处理，App 仅展示状态 + 外链 Shopify 订单页。

### 5.6 积分商城
积分兑换仍走 `POST /points/exchange`（§6）；若需跳 Shopify 礼品卡 / 折扣，则一并返回 `shopUrl`。

### 5.7 结账登录澄清（guest checkout + 身份预填，必须照此实现）
> 经产品 / 开发复核确认：跳到 Shopify 结账**不需要用户登录 Shopify 账号**，体验上要像微信那样「已在 App 登录、付钱不再登一次」。实现方式如下：

1. **游客结账（guest checkout）即可，无需 Shopify 账号密码**：Shopify 结账默认支持游客结账，凭「邮箱 + 收货信息 + 支付」即可下单。不要关闭 guest checkout。
2. **身份顺流预填（达到微信式无缝）**：Flutter 原生在 `cartCreate` 的 `buyerIdentity` 中传入 App 登录用户的身份——
   `{ email, phone, countryCode, preferences: { deliveryAddress: { address1, city, country, zip, ... } } }`
   Shopify 结账页据此**预填**邮箱 / 电话 / 收货地址，用户几乎不用重输直接付。注意：这是「预填」，不是「登录 Shopify 账号」。
3. **必须传 email（硬约束）**：订单按 `email` 落到该 Shopify 店的 customer；Shopify `orders` webhook 回传的 `order.email` 是我们按 email 关联 App 用户、写入「我的订单」的唯一依据。不传 email 则无法归并，务必传。
4. **SSO（识别老客户 / 用已存支付方式）为二期可选**：真正「识别成 Shopify 老客户」需 `customerAccessToken` 挂到 cart 或 `checkoutUrl?sso=silent`（需 Shopify Customer Accounts 会话），或用 **Multipass**（需 Shopify Plus）。叠加「每国一店」，每个店都要单独 SSO，成本陡增。**一期不做**，游客结账 + email 预填已闭环。
5. **多国归并**：每个国家店 customer 独立，email 在各店独立；webhook 按「国家 / 店 + email」归并同一 App 用户。

---

## 6. 积分

#### GET /points/balance
**响应 data：** `{ "balance": 1280 }`（对齐 `mock.pointsBalance`）

#### GET /points/products
**响应 data.list（对齐 `mock.pointsProducts`）：**
```json
[{ "id": "pp-1", "name": "PXID 原装充电器 48V", "tags": ["原厂正品","快充"], "price": 299, "points": 2990, "cover": "https://cdn.pxid.com/pp/1.jpg", "shopUrl": "https://shop.pxid.com/products/charger-48v" }]
```
#### POST /points/exchange
body：`{ "productId": "pp-1" }`
**响应 data：** `{ "ok": true, "balance": 980 }`（扣减积分，返回新余额；如需跳转 Shopify 兑换则一并返回 `shopUrl`）

---

## 7. 服务 / 售后

### 7.1 FAQ
#### GET /faq/categories
返回分组结构（对齐 `mock.faqCategories`）：
```json
[{ "group": "APP相关", "items": [{ "key": "app-ride", "label": "骑行统计" }] }, ...]
```
#### GET /faq
query：`tag`（按 `key` 筛选，如 `app-use`）
**响应 data.list（对齐 `mock.faqs`）：**
```json
[{ "id": 1, "q": "为什么APP搜索不到滑板车设备", "a": "确认滑板车开机通电…", "tags": ["app-use","app-location"], "likes": 568 }]
```
#### GET /faq/{id}

### 7.2 附近门店
#### GET /stores
query：`lat`、`lng`（可选，用于距离排序）
**响应 data.list（对齐 `mock.stores`，按距离升序）：**
```json
[{ "name": "PXID 淮安体验店", "rating": 4.8, "reviews": 128, "distance": "4.8km", "phone": "0517-88886666", "address": "江苏省淮安市清江浦区翔宇大道 88 号", "lat": 33.5104, "lng": 119.016, "hours": "09:00 - 21:00", "tags": ["体验试驾","售后维修","配件购买"] }]
```

### 7.3 工单
#### GET /work-orders
query：`status`（全部/待处理/服务中/已完成/已取消，对齐 `mock.workOrderTabs`）
**响应 data.list：**
```json
[{ "id": "GD20260525001", "time": "2026-05-25T14:12:00+08:00", "type": "报修", "status": "服务中", "model": "P1", "summary": "刹车失灵，制动距离明显变长", "canCancel": true }]
```
#### GET /work-orders/{id}
**响应 data（对齐 `mock.workOrderDetails`，按 type 动态字段）：**
```json
{
  "id": "GD20260525001", "time": "2026-05-25T14:12:00+08:00",
  "steps": [{ "name": "创建", "done": true }, { "name": "检测开始", "done": true, "current": true }, { "name": "维修开始", "done": false }, { "name": "完工提交", "done": false }],
  "model": "P1", "type": "报修",
  "faultDesc": "刹车失灵…", "faultImages": ["https://cdn.pxid.com/wo/1.jpg"],
  "warranty": "质保内", "fee": 0, "eta": "2026-05-28", "address": "淮安市清江浦区深圳东路", "likes": 1546
}
```
> 报修类含 `faultDesc`/`faultImages`；保养类含 `maintainItems`/`maintainAdvice`；字段按 `type` 动态返回即可。

#### POST /work-orders
body（报修/保养/道路救援通用）：
```json
{ "type": "报修", "model": "P1", "faultDesc": "刹车失灵", "faultImages": ["https://cdn.pxid.com/wo/1.jpg"] }
```
**响应 data：** `{ "id": "GD20260817001" }`
#### POST /work-orders/{id}/cancel
取消工单（仅 `canCancel=true` 时）。

### 7.4 使用指南
#### GET /guides
query：`model`（如 `P1`）
**响应 data：**
```json
{
  "vehicleImg": "https://cdn.pxid.com/guide/p1.jpg",
  "videos": [{ "id": 1, "title": "P1 电动滑板车–开箱视频", "duration": "02:34" }],
  "manual": [{ "page": "01", "title": "目录", "body": "安全使用须知 / 部件说明…" }]
}
```

### 7.5 道路救援提交
#### POST /rescue
> 由原生侧 `openNative('rescue/submit?...')` 调起，原生采集后调此接口。
body：`{ "model": "P1", "location": "淮安市翔宇大道", "lat": 33.51, "lng": 119.01, "desc": "轮胎爆胎", "contact": "138****6688" }`
**响应 data：** `{ "id": "RJ20260817001" }`

---

## 8. 消息中心

#### GET /messages
query：`category`（system / service / vehicle / interaction，对齐 `mock.messageCategories`）
**响应 data.list（对齐 `mock.messages`）：**
```json
[{ "id": 1, "sender": "官方产品经理", "avatar": "https://cdn.pxid.com/a.jpg", "summary": "关于买车流程这里有一份说明", "createdAt": "2026-05-14T10:00:00+08:00", "unread": false, "category": "system", "type": "notice", "link": "/notice/N1", "payload": { "id": "N1" } }]
```
#### GET /message/unread
**响应 data：** `{ "total": 3, "byCategory": { "system": 1, "service": 0, "vehicle": 1, "interaction": 1 } }`（用于发现 tab 红点）
#### POST /messages/{id}/read
标记已读。

---

## 9. 搜索

#### GET /search
query：`q`（关键词）、`type`（可选：feed / product / store）
**响应 data：**
```json
{ "feeds": [ FeedItem... ], "products": [ Product... ], "stores": [ Store... ] }
```
（对齐前端 `SearchView`，返回各类型命中结果）

---

## 10. 图片上传

#### POST /upload
`Content-Type: multipart/form-data`，字段名 `file`（图片）。
**响应 data：** `{ "url": "https://cdn.pxid.com/f/abc.jpg" }`
> 用途：发帖图片、工单故障图片、购车定制图等，均先调此接口拿完整 URL，再随业务接口提交。
> 前端发布页当前用本地预置图库规避上传，**接后端后改为上传**。

---

## 11. 与 H5 桥接的边界（Flutter 原生 + 我们服务端两边都要看）

H5 的部分能力**不直接 fetch 后端**，而是调 `openNative(...)` 交给 Flutter 原生，由原生侧再调本规范接口。边界如下：

| 能力 | 调用方 | 后端接口 |
| --- | --- | --- |
| 动态流 / 点赞 / 评论 / 关注 | H5 直接 fetch | §3 各接口 |
| FAQ / 门店 / 工单查询 / 消息 / 积分 / 搜索 / 上传 | H5 直接 fetch | §4–§10 |
| **发帖** | H5→`openNative('discover/publish')`→原生发布器 | 原生调 **POST /feed** |
| **分享** | H5→`openNative('share/feed?id=')`→原生分享面板 | 无后端（原生处理） |
| **商品购买 / 结账** | H5 自有购物车 → `bridge.openCheckout(lines)` → **Flutter 原生** `cartCreate` 得 checkoutUrl → WebView 打开 Shopify 结账 → `return_to` 回弹 | **Flutter 原生**实现 cartCreate 编排；Shopify 负责支付 / 出单；订单经 webhook 同步（可选） |
| **支付** | 随「商品购买 / 结账」在 Shopify 收银台完成 | Shopify 负责，**不经我们任何服务** |
| **道路救援提交** | H5→`openNative('rescue/submit')`→原生 | 原生调 **POST /rescue** |
| **购车定制提交** | H5→`openNative('buy/customize')`→原生 | 原生调 **POST /customize** |
| **工单联系/取消** | H5→`openNative('service/cancelOrder?orderId=')`→原生 | 原生调 **POST /work-orders/{id}/cancel** |
| **车辆体检** | H5→`openNative('vehicle/check')`→原生 | 原生调自有检测服务 |

> 也就是：§2–§10 的 HTTP 接口（Feed / 救援 / 定制等）由我们侧服务端实现；商城结账（§5）由 **Flutter 原生**调 Shopify Storefront 完成，无需独立后端代理。前端 H5 同学（坤哥这边）负责把 `mock.js` 替换成这些接口调用。

---

## 12. 前端替换指引（给 H5 同学）

1. 替换 `src/data/mock.js`：保留导出名作为类型参考，取值改为调本规范接口。
2. 发帖：`src/store/publish.js` 的 `addMoment` 改为「调用 `POST /feed`」，发现页列表改为「`GET /feed`」。
3. 所有图片字段使用后端返回的**完整 URL**，前端直接渲染，不再拼接本地路径。
4. 时间字段用后端 ISO8601，前端做相对时间展示，无需后端预计算。
5. 未登录（401）→ 前端自动 `openNative('login')`，后端无需特殊处理。

---

## 附：接口清单速查

| 方法 | 路径 | 说明 | 调用方 |
| --- | --- | --- | --- |
| GET | /user/me | 当前用户 | H5 |
| GET | /feed | 动态流（tab 筛选） | H5 |
| POST | /feed | 发帖 | 原生 |
| GET | /feed/{id} | 动态详情 | H5 |
| POST | /feed/{id}/like | 点赞 | H5 |
| POST | /feed/{id}/comment | 评论 | H5 |
| GET | /feed/{id}/comments | 评论列表 | H5 |
| POST | /user/{id}/follow | 关注 | H5 |
| GET | /activities | 广场活动 | H5 |
| GET | /notices | 公告列表 | H5 |
| POST | /notices/{id}/ack | 公告确认 | H5 |
| GET | /products | 商品列表 | H5/Shopify 聚合 |
| GET | /products/{id} | 商品详情 | H5 |
| GET | /orders | 我的订单（读，来自 webhook 同步） | H5 |
| POST | /shopify/checkout | 结账编排→checkoutUrl | H5 |
| POST | /shopify/webhook/orders | 订单 webhook 接收（HMAC） | Shopify |
| GET | /points/balance | 积分余额 | H5 |
| GET | /points/products | 积分商城 | H5 |
| POST | /points/exchange | 积分兑换 | H5 |
| GET | /faq/categories | FAQ 分类 | H5 |
| GET | /faq | FAQ 列表 | H5 |
| GET | /faq/{id} | FAQ 详情 | H5 |
| GET | /stores | 附近门店 | H5 |
| GET | /work-orders | 工单列表 | H5 |
| GET | /work-orders/{id} | 工单详情 | H5 |
| POST | /work-orders | 创建工单 | 原生 |
| POST | /work-orders/{id}/cancel | 取消工单 | 原生 |
| GET | /guides | 使用指南 | H5 |
| POST | /rescue | 道路救援 | 原生 |
| GET | /messages | 消息列表 | H5 |
| GET | /message/unread | 未读统计 | H5 |
| POST | /messages/{id}/read | 标记已读 | H5 |
| GET | /search | 搜索 | H5 |
| POST | /upload | 图片上传 | H5/原生 |
| POST | /customize | 购车定制 | 原生 |

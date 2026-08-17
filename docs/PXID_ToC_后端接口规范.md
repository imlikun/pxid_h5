# PXID ToC App 后端接口规范 v1

> 读者：**后端（Java）对接同学**
> 背景：PXID ToC App（H5 + Flutter 原生）当前所有数据都是前端 `mock.js` 假数据，需要后端提供真实接口替换。本文件列出 H5 与原生两侧都要用的全部接口，字段严格对齐前端现有结构，**后端返回的 JSON key 请与本规范保持一致，前端即可零改造接入**。
> 状态：v1 初稿，待后端确认 Base URL 与鉴权细节。

---

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| Base URL | `https://api.pxid.com/pxid/v1`（**待你们确认**） |
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

## 5. 精选 / 商城

> 商城与 **Shopify 打通**：H5 仅展示商品，用户点击「去购买」调 `bridge.openShopify(product.shopUrl)` 跳 Shopify 完成购买，**H5 不自建购物车/结算/订单流**（见 §11 边界）。因此：
> - 若你们后端做商品聚合，提供下方接口；
> - 否则商品数据维持 Shopify feed，无需后端接口。

#### GET /products
query：`collection`（如 `spring` / `p1parts`，对齐 `mock.collections`）
**响应 data.list（对齐 `mock.products`）：**
```json
[{ "id": 1, "name": "鸭舌帽 男士", "price": 280, "origin": 399, "cover": "https://cdn.pxid.com/p/1.jpg", "tag": "踏春装备", "sales": 1203, "collection": "spring", "shopUrl": "https://shop.pxid.com/products/cap-men" }]
```
#### GET /products/{id}
返回单条商品。

#### GET /orders（订单查询，可选）
仅查询用户在 Shopify 侧的订单，对齐 `mock.orders`：
```json
[{ "id": "PX20260812003", "time": "2026-08-12T15:22:00+08:00", "status": "已发货", "items": [{ "name": "原装后轮 适配P1", "cover": "https://cdn.pxid.com/p/2.jpg", "price": 6800, "qty": 1 }], "total": 6800 }]
```
> 下单/支付走原生 `requestPurchase`（调 Shopify 收银台），**不经你们后端**（见 §11）。

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

## 11. 与 H5 桥接的边界（Java + Flutter 两边都要看）

H5 的部分能力**不直接 fetch 后端**，而是调 `openNative(...)` 交给 Flutter 原生，由原生侧再调本规范接口。边界如下：

| 能力 | 调用方 | 后端接口 |
| --- | --- | --- |
| 动态流 / 点赞 / 评论 / 关注 | H5 直接 fetch | §3 各接口 |
| FAQ / 门店 / 工单查询 / 消息 / 积分 / 搜索 / 上传 | H5 直接 fetch | §4–§10 |
| **发帖** | H5→`openNative('discover/publish')`→原生发布器 | 原生调 **POST /feed** |
| **分享** | H5→`openNative('share/feed?id=')`→原生分享面板 | 无后端（原生处理） |
| **商品购买** | H5→`openShopify(shopUrl)` | 跳 Shopify，**不经你们后端** |
| **下单/支付** | H5→`requestPurchase`→原生收银台 | 调 Shopify，**不经你们后端** |
| **道路救援提交** | H5→`openNative('rescue/submit')`→原生 | 原生调 **POST /rescue** |
| **购车定制提交** | H5→`openNative('buy/customize')`→原生 | 原生调 **POST /customize** |
| **工单联系/取消** | H5→`openNative('service/cancelOrder?orderId=')`→原生 | 原生调 **POST /work-orders/{id}/cancel** |
| **车辆体检** | H5→`openNative('vehicle/check')`→原生 | 原生调自有检测服务 |

> 也就是：Java 同学你要实现的 HTTP 接口 = §2–§10 全部；同时 Flutter 原生侧也会调其中的 `POST /feed`、`POST /rescue`、`POST /customize` 等。前端 H5 同学（坤哥这边）负责把 `mock.js` 替换成这些接口调用。

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
| GET | /orders | 订单查询 | H5 |
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

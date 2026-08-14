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
| `product/detail?id=<id>` | 积分商品 / 好物点击进商品详情 | 积分 |
| `points/exchange?id=<id>` | 积分商品「兑换」 | 积分 |

## H5 兜底页（预览 / 无原生时）

`mockBridge.openNative` 会把以下标识映射到同名 H5 路由，便于浏览器预览走通链路；其余标识仅打印日志：

- `vehicle/<id>` → `/vehicle/:id`
- `purchase/customize` → `/purchase/customize`
- `search?q=<kw>` → `/search`

> 原生接入后，上述 H5 兜底页可保留作为降级，也可由原生直接接管。

# PXID H5 接入文档（给 Flutter 原生侧 / “他”）

发现、精选、服务 三个板块用 **Vue H5** 实现，由现有 Flutter App 通过 **WebView** 承载。
本文档说明：如何构建、如何加载、以及 H5 与原生之间的 **JS Bridge 契约**。

---

## 1. 构建产物

```bash
npm install
npm run build      # 产物输出到 dist/
```

`vite.config.js` 已设 `base: './'`，所以 `dist/` 下的资源用**相对路径**引用，
可直接扔到 CDN 子路径，或打包进 App 用 `file://` / `asset` 方式加载，都不会因为根路径问题 404。

---

## 2. 加载方式

三个 Web 板块，每个对应一个 hash 路由，加载时**务必带 `?embed=1`**：

| 板块 | 加载 URL |
|---|---|
| 发现 | `https://your-cdn.com/h5/index.html#/discover?embed=1` |
| 精选 | `https://your-cdn.com/h5/index.html#/featured?embed=1` |
| 服务 | `https://your-cdn.com/h5/index.html#/service?embed=1` |

- `embed=1` 会让 H5 **隐藏自己的演示用底部导航**（DemoTabBar），避免和原生底部 5 tab 重复。
- 原生底部导航（发现 / 精选 / 购车 / 服务 / 我的）由 Flutter 提供，**是唯一**的 tab 切换入口。
- **购车 / 我的 不加载 H5**（蓝牙/NFC/硬件、个人中心等原生能力），由 Flutter 自行实现。

> 用 hash 路由（`#/xxx`）而非 history 路由，是因为 WebView 内加载任意域名或本地文件时，
> 服务端不会为深链做 rewrite，hash 模式能保证刷新/直链不 404。

---

## 3. JS Bridge 契约

H5 通过全局对象 **`window.PXIDBridge`** 调用原生能力。**原生须在 WebView 加载完成后注入该对象。**

### 3.1 方法清单

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `getToken` | 无 | `Promise<string>` | 获取登录态 token（H5 需要用户信息时调用） |
| `navigateTo` | `tab: 'discover'\|'featured'\|'purchase'\|'service'\|'profile'` | `void` | 切换到原生底部 tab |
| `requestPurchase` | `payload: object` | `Promise<boolean>` | 拉起原生购买/下单；**支付完成/取消后必须 resolve(true/false)**，H5 据此跳成功页或停留 |
| `callPhone` | `phone: string` | `void` | 拨打电话（服务页「门店电话」） |
| `openMap` | `{ lat:number, lng:number, name:string }` | `void` | 打开原生地图导航（服务页「地图导航」；独立预览时浏览器直开跳苹果/高德） |
| `openNative` | `{ target: string, ...payload }` | `void` | 打开原生页面（如 `{target:'vehicleCheck'}`、`{target:'address.list'}`） |

### 3.2 H5 侧调用示例（已是现成代码）

```js
import { bridge } from './bridge'
bridge.callPhone(store.phone)                 // 服务页打电话
bridge.openMap({ lat, lng, name })            // 服务页导航
bridge.requestPurchase({ type: 'buyNow', product })  // 商品详情/购物车结算
bridge.navigateTo('purchase')                 // 切到原生购车 tab
```

> H5 业务代码**只调用 `bridge` 封装**，不关心当前是 mock 还是原生实现。
> 独立预览（不带 `embed=1`）时走 `src/bridge/index.js` 里的 mock，页面在浏览器里也能点能跑。

### 3.3 原生注入示例（Flutter + flutter_inappwebview 思路）

Android 用 `JavascriptChannel`，iOS 用 `WKScriptMessageHandler`，或统一用
`evaluateJavascript` 在页面加载完成后把 `window.PXIDBridge` 写成一个对象，
每个方法通过 `postMessage` / channel 把调用转给 Dart 侧处理：

```dart
// 伪代码：页面 onLoadStop 后注入
controller.evaluateJavascript(source: '''
  window.PXIDBridge = {
    getToken: () => new Promise((resolve) => {
      window._resolveToken = resolve;
      // 通知原生：H5 想要 token
      NativeBridge.postMessage(JSON.stringify({ method: 'getToken' }));
    }),
    navigateTo: (tab) => NativeBridge.postMessage(JSON.stringify({ method:'navigateTo', tab })),
    requestPurchase: (p) => new Promise((resolve) => {
      window._resolvePurchase = resolve;   // 支付完成后原生回调 resolve(true/false)
      NativeBridge.postMessage(JSON.stringify({ method:'requestPurchase', payload: p }));
    }),
    callPhone: (phone) => NativeBridge.postMessage(JSON.stringify({ method:'callPhone', phone })),
    openMap: (o) => NativeBridge.postMessage(JSON.stringify({ method:'openMap', data: o })),
    openNative: (o) => NativeBridge.postMessage(JSON.stringify({ method:'openNative', data: o })),
  };
''');

// Dart 收到 NativeBridge 的消息后：
//  - getToken  → 取出登录 token，再 evaluateJavascript("window._resolveToken('$token')")
//  - navigateTo → 切换原生底部 tab（如跳到购车/我的）
//  - callPhone  → url_launcher 拨号 / 原生 Intent
//  - openMap    → 调起高德/百度地图
//  - requestPurchase → 支付/下单流程，完成后再 evaluateJavascript("window._resolvePurchase(true)")
//  - openNative → 路由到对应原生页面
```

**getToken / requestPurchase 是异步的**：H5 用 `Promise` 等原生回传，原生拿到结果后调用
`window._resolveToken(token)` / `window._resolvePurchase(true|false)` 兑现 Promise。
`requestPurchase` 必须回传布尔（支付成功 true / 取消或失败 false），H5 才会跳支付成功页。

---

## 4. 登录态注入（可选）

如果希望 H5 一加载就拿到登录态，原生可在 URL 上追加 `?embed=1&token=xxx`，
H5 在 `bridge.initBridge()` 时读取并缓存；或原生在注入 `getToken` 时直接兑现。
推荐走 `getToken` 拉取，避免 token 出现在 URL 里。

---

## 5. 安全提示

- 校验 `postMessage` / channel 消息来源，只接受来自 PXID H5 宿主的消息。
- `requestPurchase`、`callPhone` 等涉及资金/设备能力，原生侧务必做权限与登录校验。
- H5 资源建议走 **HTTPS + CDN**，并加完整性校验（SRI / 版本号），防止被篡改。

---

## 6. 目录结构（供参考）

```
pxid_h5/
├─ index.html
├─ vite.config.js
├─ package.json
├─ README.md               # 开发文档（快速开始/功能/目录/双机协作）
├─ INTEGRATION.md          # 本文件
├─ public/                 # 设计稿原图（banner/卡片封面/车型图）
└─ src/
   ├─ main.js
   ├─ App.vue
   ├─ bridge/index.js      # JS Bridge 契约（mock + 真实调用出口）
   ├─ router/index.js      # 路由（hash 模式）
   ├─ store/cart.js        # 购物车（勾选/合计）
   ├─ data/mock.js         # Mock 数据（接 API 时整文件替换）
   ├─ styles/tokens.css    # 设计 token（蓝强调/红价/白底）
   ├─ components/          # DemoTabBar / ProductCard / FeedCard / StoreCard / FaqItem / SectionHeader / QuickActions
   └─ views/               # 发现/精选/服务 三板块 + 商品详情/购物车/结算/订单/成功页 + 13 个服务子页
```

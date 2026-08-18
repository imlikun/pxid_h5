# PXID ToC App · Flutter 侧开发任务单（Trae 指挥版）

> 读者：**Flutter 原生开发同学（用 Trae 实现）**
> 说明：本文件是给 Flutter 侧的**唯一任务单**。按「任务 → 要求 → 代码示例 → 验收」逐条完成并回复结果即可。我们是主导方，你只做下面 4 件事，**不需要你写文档、搭服务器或碰 Shopify 店铺**。

---

## 任务 1 · WebView 加载方式（阻塞迁移，本周完成）

### 要求
确认当前 WebView 加载 H5 的方式，若是本地打包改为加载线上 URL。

### 现状
- H5 三个模块（发现/精选/服务）是 Vue3 构建的静态站，已部署在线上。
- 预览地址（开发用）：`https://appin.site/nav/pxid-h5/`
- 迁移后正式地址：**待坤哥确认**（预计 `https://h5.pxid.com/`），拿到后替换即可。

### Trae 实现要点（改法）
在 Flutter 创建 WebView 的地方（`WebViewController` / `WebViewWidget`），把初始 URL 改为线上地址：

```dart
// 例：加载线上 H5（替换你现有的本地 assets 加载）
final controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.unrestricted)
  ..setNavigationDelegate(NavigationDelegate(
    onNavigationRequest: (request) {
      // 拦截 App 内跳转：pxid:// 开头的 scheme 由原生处理
      if (request.url.startsWith('pxid://')) {
        handlePxidScheme(request.url);
        return NavigationDecision.prevent;
      }
      return NavigationDecision.navigate;
    },
  ))
  ..loadRequest(Uri.parse('https://h5.pxid.com/')); // ← 正式地址
```

### 验收
- 浏览器打开该 URL，发现/精选/服务三个 tab 都能看到首页。
- App 内 WebView 加载后，底部 tab 由原生提供（H5 不渲染 tab），页面可正常滑动。

### 回复格式
```
任务1：当前是【本地打包 / 线上URL】；已改 / 待改；正式地址是否已给我（h5.pxid.com?）
```

---

## 任务 2 · JS Bridge 注入与清单确认（本周完成）

### 要求
在 WebView 加载 H5 **之前**注入 `window.PXIDBridge` 真实实现；逐项确认已实现方法。

### 注入代码示例（Trae 照此实现）

```dart
// 在 controller 加载前注入 JS
final jsBridge = '''
(function() {
  window.PXIDBridge = {
    isNative: true,                          // 关键：标记真实原生桥
    getToken: function() {
      return NativeBridge.getToken();        // 调你的原生方法，返回 Promise
    },
    getLocale: function() {
      return NativeBridge.getLocale();       // 返回 {locale,country,currency}
    },
    navigateTo: function(tab) {
      NativeBridge.switchTab(tab);           // discover/featured/purchase/service/profile
    },
    openNative: function(path) {
      NativeBridge.openNative(path);         // 'module/action?k=v' 字符串
    },
    openShopify: function(url) {
      NativeBridge.openShopify(url);         // 打开 Shopify 商品页/结账
    },
    openCheckout: function(lines) {
      return NativeBridge.openCheckout(lines); // Promise<true | {ok,orderId} | false>
    },
    requestPurchase: function(payload) {
      return NativeBridge.requestPurchase(payload);
    },
    callPhone: function(phone) { NativeBridge.callPhone(phone); },
    openMap: function(o) { NativeBridge.openMap(o); }
  };
})();
''';
controller.runJavaScript(jsBridge, onPageStarted: true); // 页面加载前注入
```

### 需逐项确认的方法（对照 INTEGRATION.md 回复"已实现/未实现"）
`getToken` / `getLocale` / `navigateTo` / `openNative` / `openShopify` / `openCheckout` / `requestPurchase` / `callPhone` / `openMap`

### 关键点
- `isNative: true` **必须置 true**，H5 据此判定"嵌入原生模式"（隐藏 H5 tab、走原生能力）。
- `openNative` 统一收字符串 `module/action?k=v`（**不要**传对象）。
- 详见仓库 `INTEGRATION.md`。

### 回复格式
```
任务2：已注入 / 未注入；方法清单：getToken=已实现，getLocale=已实现，...（逐项）
```

---

## 任务 3 · 商城结账 openCheckout（与联调并行）

### 要求
实现 `openCheckout(lines)`：拿购物车行 → 调该国店 Shopify Storefront `cartCreate` 生成 `checkoutUrl` → WebView 打开 → 支付后 `return_to` 回弹。

### 入参（H5 传来）
```js
// lines: Array<{ variantId, quantity, shopUrl, name }>
[{ "variantId": "gid://shopify/ProductVariant/43810663202975", "quantity": 1, "shopUrl": "https://.../products/p4", "name": "P4" }]
```

### 实现步骤（Trae 照做）
1. 从 `getLocale().country` 路由到该国店铺（每国一个店，Storefront token 按 country 配置，**token 放原生层，不落 H5**）。
2. `cartCreate` GraphQL（**必传 email** 预填 + 身份关联）：
   ```graphql
   mutation {
     cartCreate(input: {
       lines: [{ merchandiseId: "<variantId>", quantity: <qty> }]
       buyerIdentity: { email: "<App登录邮箱>", countryCode: <country> }
     }) {
       cart { id checkoutUrl }
       userErrors { field message }
     }
   }
   ```
3. WebView 打开 `checkoutUrl`（**不要外部浏览器**）。
4. 监听 scheme `pxid://checkout/done?orderId=...`，捕获后关 WebView，`openCheckout` resolve：
   - 成功：`{ ok: true, orderId: '<shopify订单号>' }`
   - 失败/取消：`false`
5. `cartCreate` 报 userErrors（缺货/下架）：resolve `false`，H5 提示"该规格暂不可购"。

### 完整契约
见 `PXID_Shopify_结账桥接_Flutter版.md`（已按 Trae 风格写好，直接照做）。

### 回复格式
```
任务3：已完成 / 进行中 / 未开始；真机验证：能生成checkoutUrl并打开结账页 = 是/否
```

---

## 任务 4 · 服务模块原生版（供对比，不阻塞）

### 要求
按下方范围实现服务模块原生页面，截图/录屏给坤哥，用于最终拍板"服务用 H5 版还是原生版"。

### 实现范围（6 入口 + 子页，视觉对齐 tokens.css）
- **道路救援**：地图占位 / 救援时间选择 / 联系电话 / 故障描述 + 发起救援按钮
- **使用指南**：车型选择 → 新手指导视频 / 产品说明书
- **车辆体检**：绑定车辆展示 + 系统体检项列表 + 开始体检按钮
- **意见反馈（在线客服）**：热门问题 / 售后查询 / 使用指导 三分类 + 输入框
- **三包政策**：保修说明页
- **附近门店**：列表（距离/评分排序 + 搜索）
- **我的工单**：状态 tab（全部/待处理/服务中/已完成/已取消）+ 工单卡 + 详情/取消
- **常见问题**：搜索 + 筛选 + Q/A 详情

数据接口见 `PXID_ToC_后端接口规范.md` §7。

### 回复格式
```
任务4：服务模块原生版已完成，截图/录屏已发坤哥
```

---

## 边界（防止扯皮）

| 我们（App 团队）负责 | 你（Flutter）负责 |
| --- | --- |
| H5 三模块、后端、迁移部署、域名证书、热更新、Shopify 契约 | 上面 4 项任务 |

**你不需要做**：写迁移文档、搭服务器、配域名证书、碰 Shopify 店铺后台。

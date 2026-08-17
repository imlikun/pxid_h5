# PXID ToC App 多国定位与 i18n 对接规范 v1

> 读者：**Flutter 原生同学 + 后端（Java）同学 + H5 同学（坤哥）**
> 背景：App 面向多个国家使用，三个 tab（发现 / 精选 / 服务）需按 **国家 / 语言 / 货币** 自适应。本文定义三方分工与接口契约，配套文件：《PXID H5 × 原生 Flutter 集成契约》（INTEGRATION.md）、《PXID ToC App 后端接口规范》（PXID_ToC_后端接口规范.md）。
> 状态：v1 初稿，待三方确认语言/国家清单与汇率方案。

---

## 0. 一句话结论与分工

**定位「探测 + 注入」归 Flutter，「存储 + 内容本地化」归 Java 后端，「UI 多语言适配」归 H5。三方各管一段、互不重叠，H5 只消费不探测。**

| 角色 | 负责 | 不负责 |
| --- | --- | --- |
| **Flutter 原生** | 启动时读系统 Locale / SIM / 网络 → 算 `{locale, country, currency}` → 经 bridge 注入 H5；处理原生设置页的语言切换 | 不碰后端业务逻辑、不做内容多语言 |
| **Java 后端** | 存用户语言/国家偏好；所有接口加 `lang`/`country`/`currency` 入参，返回多语言文案、按币种计价、按地区过滤 | 不探测设备位置（那是原生职责） |
| **H5（我们）** | 读 bridge 给的 locale 做 i18n 文案切换、货币/时区格式化、带参拉数据；提供语言切换入口（调原生） | 不调 GPS/IP 库探测国家（避免与原生/后端打架） |

**数据流**：`Flutter 探测 → bridge 注入 {locale,country,currency} → H5 初始化 i18n + 格式化 → 带 lang/country/currency 调后端 → 后端按地区/语言返回`。

---

## 1. 定位模型（三元组）

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| `locale` | 语言-地区，遵循 BCP-47 | `zh-CN` / `en-US` / `de-DE` / `ja-JP` |
| `country` | ISO 3166-1 alpha-2 国家码 | `CN` / `US` / `DE` / `JP` |
| `currency` | ISO 4217 货币码 | `CNY` / `USD` / `EUR` / `JPY` |

三者由 Flutter 综合「系统 Locale」+「后端用户偏好（见 §3.2）」算出最终值后统一注入 H5，**H5 不再自行猜测国家**。

---

## 2. H5 ↔ Flutter 桥接契约（新增）

> 下文 `getLocale` / `onLocaleChange` 为新增方法，请 Flutter 同学在注入 `window.PXIDBridge` 时一并实现；H5 已规划调用。

### 2.1 `bridge.getLocale()`

```ts
getLocale: () => Promise<{ locale: string; country: string; currency: string }>
```

- H5 启动（App 初始化）时调用一次，用于初始化 i18n 与货币/日期格式化。
- 返回示例：`{ locale: 'zh-CN', country: 'CN', currency: 'CNY' }`。
- **mock 默认值**：`{ locale: 'zh-CN', country: 'CN', currency: 'CNY' }`（浏览器预览不报错）。

### 2.2 `bridge.onLocaleChange(cb)`

```ts
onLocaleChange: (cb: (loc: { locale: string; country: string; currency: string }) => void) => void
```

- 用户在原生「设置」切换语言/地区后，Flutter **主动回调** H5，H5 据此重新拉数据 + 切文案（**不刷新页面**）。
- H5 仅注册一次监听；切换时内部触发 localeState 更新 → 各组件响应式刷新。

### 2.3 `openNative('settings/language')`

- H5 在「设置 / 我的」提供「语言 / 地区」入口，点击调此标识交原生设置页。
- 原生改完后通过 `onLocaleChange` 通知 H5。
- mock（浏览器预览）可将此映射为 H5 本地切换下拉（仅前端文案切换，数据语言仍依赖后端 `lang`）。

### 2.4 注入时机

与 `getToken` 一致：WebView 加载 H5 前注入 `window.PXIDBridge` 真实实现；未注入时 H5 用 mock（默认 `zh-CN/CN/CNY`）。

---

## 3. H5 ↔ 后端接口扩展（给 Java）

### 3.1 通用约定新增（追加到《后端接口规范》§1）

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| `lang` | 所有请求 query | 内容语言，如 `zh-CN`/`en-US`；后端据此返回多语言字段，无翻译时返回默认 `zh-CN` |
| `country` | 所有请求 query | 用于门店/活动/合规按地区过滤（如 GDPR 地区隐藏特定内容） |
| `currency` | 所有请求 query | 价格字段按此币种返回；后端负责汇率换算 |

**价格字段建议结构**（替代原单值 `price: 280`）：

```json
{
  "price": { "amount": 39.99, "currency": "USD", "symbol": "$" },
  "origin": { "amount": 56.99, "currency": "USD", "symbol": "$" }
}
```

> 若汇率换算成本高，也可返回多币种对象 `{ "CNY": 280, "USD": 39.99, "EUR": 36.5 }`，由 H5 按 `currency` 取。二选一，请 Java 确认。

### 3.2 用户偏好存储（新增接口）

**GET /user/me** 响应 data 增加：

```json
{ "id": "U1001", "nickname": "骑手老王", "avatar": "https://cdn.pxid.com/avatars/u1001.jpg",
  "points": 1280,
  "locale": "zh-CN", "country": "CN", "currency": "CNY" }
```

**PUT /user/locale** — 用户切换语言/地区时持久化：

```json
// body
{ "locale": "en-US", "country": "US", "currency": "USD" }
// 响应 data: { "ok": true }
```

> 启动流程建议：Flutter 先 `GET /user/me` 拿偏好，与系统 Locale 合并决定最终值，再注入 H5。用户在设置切换时，H5/Flutter 调 `PUT /user/locale` 落库。

### 3.3 内容字段多语言

- 所有展示类字段（`title`/`name`/`content`/`summary`/`label`/`q`/`a` 等）后端应返回**按 `lang` 本地化的版本**。
- 车型名、商品名等建议返回多语言对象：`{ "zh-CN": "P1", "en-US": "P1" }`，前端按 `lang` 取；单值是兜底。
- **前端不做机翻兜底**：若某 `lang` 无翻译，后端返回默认 `zh-CN` 字段，前端原样展示，避免中英混杂。

---

## 4. H5 侧 i18n 改造清单（我们干）

### 4.1 新增 `src/utils/locale.js`

- 启动时 `await bridge.getLocale()` → 存入全局 `reactive` 状态 `localeState`。
- 注册 `bridge.onLocaleChange` → 更新 `localeState`（触发各页响应式刷新）。
- 导出工具：
  - `formatPrice(amount, currency, locale)` → 用 `Intl.NumberFormat(locale, { style: 'currency', currency })`。
  - `formatDate(iso, locale)` → `Intl.DateTimeFormat(locale).format(...)`；相对时间（刚刚/N分钟前）做本地化映射。

### 4.2 文案抽离到 `src/i18n/`

- `zh-CN.js` / `en-US.js` / `de-DE.js` / `ja-JP.js`，统一 key 命名：
  - `discover.recommend`、`discover.dynamic`、`discover.plaza`
  - `common.publish`、`common.share`、`common.collected`
  - `service.headset`、`service.faq`、`empty.noComment`
- H5 **静态文案**（tab 名、按钮、空态、提示语）全部抽 key，不再硬编码中文。
- **动态内容**（来自后端）按后端返回的 `lang` 字段展示，不进本 i18n 文件。

### 4.3 货币 / 时区格式化

- 价格统一走 `formatPrice`，删除散落的 `¥{{ price }}` 硬编码。
- 时间走 `formatDate` / 相对时间本地化。

### 4.4 语言切换入口

- 「设置 / 我的」页入口 → `bridge.openNative('settings/language')`。
- mock 预览下提供本地切换下拉（仅前端文案；数据语言需后端 `lang` 支持后才完整）。

### 4.5 落地步骤（建议顺序，改动由小到大）

1. **接注入**（小）：`locale.js` + `getLocale`/`onLocaleChange` + 价格/日期格式化。先让货币符号随 `currency` 变。
2. **抽静态文案**（中）：逐模块把中文抽进 `src/i18n/*.js`，先出 `zh-CN` + `en-US` 验证机制。
3. **后端联调**（依赖 Java）：请求自动带 `lang`/`country`/`currency`，后端返回本地化内容与多币种价格。

---

## 5. 验收标准

- 系统切语言 → Flutter 注入不同 `locale` → H5 文案 / 货币符号 / 门店列表随变。
- 用户在设置切语言 → `onLocaleChange` 触发 → H5 **不刷新页面**完成切换。
- 同一账号跨设备登录，语言偏好一致（后端 `GET /user/me` 返回持久化值）。

---

## 附：改动文件清单

**H5（我们）**
- 新增：`src/utils/locale.js`、`src/i18n/{zh-CN,en-US,de-DE,ja-JP}.js`
- 改：`src/bridge/index.js`（加 `getLocale`/`onLocaleChange` 及 mock）、`INTEGRATION.md`（见下方 §2 新增）、各 view 静态文案 + 价格/日期格式化

**Flutter 原生**
- 实现 `getLocale` / `onLocaleChange` / 响应 `openNative('settings/language')`
- 启动流程整合 `GET /user/me` 偏好

**Java 后端**
- 所有接口加 `lang`/`country`/`currency`（见 §3.1）
- 新增 `PUT /user/locale`，`GET /user/me` 返回定位字段（见 §3.2）
- 内容/商品字段多语言化（见 §3.3）

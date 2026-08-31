# 语言与地区规则（H5 ↔ Flutter 对接）

> 定版：2026-08-31（坤哥拍板）
> 适用：PXID ToC H5（内嵌 Flutter WebView）

---

## 核心原则（一句话）

**语言 = 用户是谁（手机系统语言）；地区 = 用户看哪国的内容。两者完全解耦。**

> 中国人去美国，界面仍显示中文 —— 语言**绝不**随地区变化。
> 反过来，用户手动切换「全球 / 中国 / 巴西」时，**只有内容变，界面语言不变**。

这条原则推翻了此前的错误实现（语言由地区反推：`US→英文 / CN→中文 / BR→葡语`），
相关代码（`REGION_LOCALE` 映射 + 切地区时 `setLocale`）已从发现页、活动中心全部移除。

---

## 🔴 现状：已经有什么

### 1. H5 支持三语

`zh` 中文 / `en` 英文 / `pt` 葡萄牙语，文案集中在 `src/i18n/index.js`，页面统一用 `t(key)` 取词。

### 2. 桥方法已定义（两个，各管一件事）

| 桥方法 | 返回值 | 语义（管什么） | mock 默认 | 大小写 |
|---|---|---|---|---|
| `window.PXIDBridge.getLocale()` | `'zh' \| 'en' \| 'pt'` | **界面语言**（用户是谁） | `'zh'` | 小写 |
| `window.PXIDBridge.getRegion()` | `'CN' \| 'BR' \| 'US'` | **内容地区**（用户看哪） | `'US'` | 大写 |

> `US` = 全球公共池（三区均可见）；`CN` / `BR` 仅本区内容可见。

### 3. H5 侧的取值优先级（已实现）

**语言**（`src/i18n/index.js` → `initLocale()`）：

```
URL ?lang=  >  bridge.getLocale()  >  navigator.language（系统语言兜底）  >  zh
```

**地区**（`DiscoverView` / `ActivityCenterView`）：

```
URL ?region=  >  bridge.getRegion()  >  兜底默认
```

### 4. 环境信息

| 项 | 地址 |
|---|---|
| H5 站点 | `https://appin.site/nav/pxid-h5/` |
| 接口基地址 | `https://pxid-api.appin.site` |

---

## 🟠 卡点与易错点

1. **不要把语言绑到地区上**（踩过的坑）：切地区就跳语言会让出国的用户看到看不懂的界面。
   地区只进内容请求参数（`?region=`），**不参与任何语言决策**。
2. **大小写约定**：`getLocale()` 返回小写 `zh/en/pt`，`getRegion()` 返回大写 `CN/BR/US`。
   H5 对 region 做了 `toUpperCase()` 容错，但请按约定传，别依赖容错。
3. **不实现 `getLocale()` 会怎样**：H5 退回读 `navigator.language`（WebView 里通常等于系统语言），
   但各机型 WebView 表现不一致，**建议显式实现**，这是最稳的。
4. **H5 浏览器预览态**（未注入真实桥）：mock 的 `getLocale()` 返回 `zh`、`getRegion()` 返回 `US`，
   所以浏览器直接打开默认是「中文 + 全球内容」。

---

## 🟡 需要 Flutter 提供什么（二选一）

### 方案 A：URL 参数（推荐 · 零 JS 通道，最简单）

打开 H5 的 WebView 时，直接把语言和国家拼在地址上：

```
https://appin.site/nav/pxid-h5/?lang=zh&region=CN
```

- `lang`：`zh` / `en` / `pt`（取 App 内语言设置，无则取手机系统语言）
- `region`：`CN` / `BR` / `US`（取目标内容地区）

**优点**：不用写任何 JS 通道；H5 优先级最高，联调和实测都方便。

### 方案 B：实现桥方法

```js
window.PXIDBridge = {
  isNative: true,                                    // 必须带，否则 H5 认为是预览态
  getLocale: () => Promise.resolve('zh'),            // 'zh' | 'en' | 'pt'
  getRegion: () => Promise.resolve('CN'),            // 'CN' | 'BR' | 'US'
  // ...其余桥方法
}
```

`getLocale()` 取值建议：

```
App 内语言设置（若有）  >  手机系统语言  >  兜底 'zh'
```

归一化规则（把系统 Locale 映射到 H5 三语）：

| 系统值示例 | 传给 H5 |
|---|---|
| `zh-CN` / `zh-Hans` / `zh-Hant` / `zh-TW` | `zh` |
| `pt-BR` / `pt-PT` | `pt` |
| `en-US` / `en-GB` 及其余一切 | `en` |

---

## 🟢 怎么做（H5 侧已落地的实现路径）

| 文件 | 职责 |
|---|---|
| `src/i18n/index.js` | `initLocale()` 按优先级定语言 → 写入 `locale` ref → 全站 `t(key)` 取词 |
| `src/views/DiscoverView.vue` | 地区只进内容请求（`/feed?region=`、`/activities?region=`、`/plaza-grid`）；`switchRegion()` 只重拉内容，**不碰语言** |
| `src/views/ActivityCenterView.vue` | 同上，切地区只换活动列表 |
| `src/api/shop.js` | 商城多店路由：`initRegion()` 读 `getRegion()`，下单/购物车带 `region` |

**内容请求链路**（region 的作用域，仅此而已）：

```
/feed?tab=recommend&region=CN&page=1&pageSize=15     → 帖子
/activities?region=BR                                 → 热门活动
/mall-api/products（body 带 region）                  → 商城商品/店铺
```

---

## 🔵 最终效果与验收清单

| # | 场景 | 期望结果 |
|---|---|---|
| 1 | 手机系统=中文，地区=全球(US) | 界面**中文** + 全球内容 |
| 2 | 手机系统=中文，地区=巴西(BR) | 界面**仍是中文** + 巴西内容 ✅ 关键 |
| 3 | 手机系统=葡语，地区=中国(CN) | 界面**葡语** + 中国内容 |
| 4 | 在发现页手动切换 全球 / 中国 / 巴西 | **界面语言不变**，只有下方内容变 ✅ 关键 |
| 5 | 手机系统切到英文后重新打开 App | 界面变英文（无需重装/清缓存） |
| 6 | 顶部地区标签（全球/中国/巴西）文案 | 随界面语言翻译（如英文下显示 Global / China / Brazil） |

### H5 预览实测链接（用 `?lang=` 模拟系统语言）

| 验证点 | 链接 |
|---|---|
| 中文 + 巴西内容（验证「人在巴西仍中文」） | `https://appin.site/nav/pxid-h5/?lang=zh&region=BR` |
| 英文 + 中国内容 | `https://appin.site/nav/pxid-h5/?lang=en&region=CN` |
| 葡语 + 全球内容 | `https://appin.site/nav/pxid-h5/?lang=pt&region=US` |
| 切地区不改语言：先打开上面任一条，再手动点顶部地区切换 | 界面语言应保持 `?lang=` 指定的语言不变 |

---

## 变更记录

| 日期 | 说明 |
|---|---|
| 2026-08-31 | 定版。移除「地区→语言」强制映射（`REGION_LOCALE`），语言改为跟随手机系统语言；新增 URL `?lang=` / `?region=` 支持；提交 `0bfedb8`（参数支持）、本次解耦改动 |

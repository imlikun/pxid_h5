# 语言与地区规则（H5 ↔ Flutter 对接）

> 定版：2026-08-31（坤哥拍板）  
> 适用：PXID ToC H5（内嵌 Flutter WebView）

---

## 核心原则（一句话）

**语言同时决定「界面语言」和「内容地区」。地区不是独立可切换的维度，而是由当前语言映射出来的结果。**

| 语言 | 界面 | 内容地区 | 看到的内容池 |
|---|---|---|---|
| `zh` 中文 | 中文 | `CN` | 中国内容 |
| `pt` 葡萄牙语 | 葡语 | `BR` | 巴西内容 |
| `en` 英文 | 英文 | `US` | 全球内容 |

> 中国人去美国：手机语言仍是中文 → **界面中文 + 中国内容**。  
> 在巴西把手机语言切成葡语 → **界面葡语 + 巴西内容**。  
> 不存在「界面中文但看巴西内容」或「界面葡语但看中国内容」的独立组合。

这条原则推翻了此前两个错误表述：
1. **语言由地区反推**（`US→英文 / CN→中文 / BR→葡语`）—— 已移除 `REGION_LOCALE` 映射。
2. **语言与地区完全解耦**（语言管界面、地区管内容）—— 已删除发现页 / 活动中心独立的地区切换器。

---

## 🔴 现状：已经有什么

### 1. H5 支持三语

`zh` 中文 / `en` 英文 / `pt` 葡萄牙语，文案集中在 `src/i18n/index.js`，页面统一用 `t(key)` 取词。

### 2. 语言 → 地区映射已固化

`src/i18n/index.js`：

```js
export const LOCALE_REGION = {
  zh: 'CN',
  pt: 'BR',
  en: 'US',
}

export function regionFromLocale(loc) {
  return LOCALE_REGION[loc] || LOCALE_REGION[locale.value] || 'US'
}
```

所有内容请求（帖子、活动、商城、发布）均通过 `regionFromLocale(locale.value)` 取地区。

### 3. H5 需要的桥方法只剩一个

| 桥方法 | 返回值 | 语义 | mock 默认 | 大小写 |
|---|---|---|---|---|
| `window.PXIDBridge.getLocale()` | `'zh' \| 'en' \| 'pt'` | **语言**（同时决定界面和内容） | `'zh'` | 小写 |

`getRegion()` 不再需要传给 H5；H5 不再调用它来决定内容。Flutter 可以保留该方法用于其他原生逻辑，但 H5 侧忽略。

### 4. 语言取值优先级（`src/i18n/index.js` → `initLocale()`）

```
URL ?lang=  >  bridge.getLocale()  >  navigator.language（系统语言兜底）  >  zh
```

- `URL ?lang=` 优先级最高，方便实测 / 联调。
- `bridge.getLocale()` 取 App 内语言设置；没有设置时取手机系统语言。
- `navigator.language` 是原生未实现 `getLocale()` 时的兜底。

### 5. 环境信息

| 项 | 地址 |
|---|---|
| H5 站点 | `https://appin.site/nav/pxid-h5/` |
| 接口基地址 | `https://pxid-api.appin.site` |

---

## 🟠 卡点与易错点

1. **不要再给 H5 传 `getRegion()` 来决定内容**。H5 的内容地区完全由 `getLocale()` 映射，多传一个 region 只会造成口径不一致。
2. **大小写约定**：`getLocale()` 返回小写 `zh/en/pt`。H5 内部做了 `toLowerCase()` 容错，但请按约定传。
3. **系统 Locale 归一化**：手机系统可能返回 `zh-CN`、`zh-Hans`、`pt-BR`、`en-US` 等，Flutter 需要在注入前归一化为 `zh` / `en` / `pt`，不能原样丢给 H5。
4. **不实现 `getLocale()` 会怎样**：H5 退回读 `navigator.language`（WebView 里通常等于系统语言），但各机型表现不一致，**建议显式实现**。
5. **H5 浏览器预览态**（未注入真实桥）：mock 的 `getLocale()` 返回 `zh`，对应地区 `CN`。
6. **改系统语言后无需重启 App**：`App.vue` 监听 `visibilitychange`，切回前台自动执行 `initLocale()`。

---

## 🟡 需要 Flutter 提供什么

### 方案 A：URL 参数（推荐 · 零 JS 通道，最简单）

打开 H5 的 WebView 时，直接把语言拼在地址上：

```
https://appin.site/nav/pxid-h5/?lang=zh
```

- `lang`：`zh` / `en` / `pt`（取 App 内语言设置，无则取手机系统语言）

**优点**：不用写任何 JS 通道；H5 优先级最高，联调和实测都方便。  
**注意**：不要再带 `region=`，带了也会被忽略；地区由 `lang` 自动映射。

### 方案 B：实现桥方法

```js
window.PXIDBridge = {
  isNative: true,                                    // 必须带，否则 H5 认为是预览态
  getLocale: () => Promise.resolve('zh'),            // 'zh' | 'en' | 'pt'
  // ...其余桥方法
}
```

`getLocale()` 取值建议：

```
App 内语言设置（若有）  >  手机系统语言  >  兜底 'zh'
```

系统 Locale 归一化规则：

| 系统值示例 | 传给 H5 |
|---|---|
| `zh-CN` / `zh-Hans` / `zh-Hant` / `zh-TW` | `zh` |
| `pt-BR` / `pt-PT` | `pt` |
| `en-US` / `en-GB` 及其余一切 | `en` |

---

## 🟢 怎么做（H5 侧已落地的实现路径）

| 文件 | 职责 |
|---|---|
| `src/i18n/index.js` | `initLocale()` 按优先级定语言；`LOCALE_REGION` / `regionFromLocale()` 把语言映射为地区 |
| `src/views/DiscoverView.vue` | 无地区切换器；`currentRegion = computed(() => regionFromLocale(locale.value))`；内容请求带该 region |
| `src/views/ActivityCenterView.vue` | 同上，活动列表随语言变化自动重拉 |
| `src/views/FeaturedView.vue` | `onMounted` 先 `initLocale()`，商城按语言取对应店铺 |
| `src/views/ProductDetailView.vue` | `load()` 先 `initLocale()`，详情/加购按语言取对应店铺 |
| `src/views/VehicleDetailView.vue` | `load()` 先 `initLocale()` |
| `src/views/PublishView.vue` | 发布内容所属地区由当前语言映射 |
| `src/views/FeedDetailView.vue` | 相关推荐按当前语言映射的地区拉取 |
| `src/api/shop.js` | `getRegion()` 返回 `regionFromLocale(locale.value)`；下单/购物车带 region |
| `src/App.vue` | 监听 `visibilitychange`：切回前台自动执行 `initLocale()` |

**内容请求链路**（region 由语言映射，仅此而已）：

```
/feed?tab=recommend&region=CN&page=1&pageSize=15     → 帖子（中文时）
/activities?region=BR                                 → 热门活动（葡语时）
/mall-api/products?region=US                          → 商城商品/店铺（英文时）
```

---

## 🔵 最终效果与验收清单

| # | 场景 | 期望结果 |
|---|---|---|
| 1 | 手机系统=中文 | 界面**中文** + **中国内容** |
| 2 | 中国人去美国（手机语言不变） | 界面**中文** + **中国内容** ✅ 关键 |
| 3 | 在巴西把手机语言切成葡语 | 界面**葡语** + **巴西内容** ✅ 关键 |
| 4 | 手机系统=英文 | 界面**英文** + **全球内容(US)** |
| 5 | 手机系统切语言后切回 App 前台 | 界面和内容地区自动刷新，**无需重启 App** |
| 6 | 发现页、活动中心、精选页、商品详情页 | 均无独立的「全球/中国/巴西」地区切换器 |

### H5 预览实测链接（用 `?lang=` 模拟手机语言）

| 验证点 | 链接 |
|---|---|
| 中文 + 中国内容 | `https://appin.site/nav/pxid-h5/?lang=zh` |
| 英文 + 全球内容 | `https://appin.site/nav/pxid-h5/?lang=en` |
| 葡语 + 巴西内容 | `https://appin.site/nav/pxid-h5/?lang=pt` |

---

## 变更记录

| 日期 | 说明 |
|---|---|
| 2026-08-31 | 第一版：语言与地区解耦（语言管界面、地区管内容），提交 `f366c37` |
| 2026-08-31 | 定版修正：坤哥拍板「语言同时决定界面和内容地区」，移除发现页/活动中心独立地区切换器，删除 `REGION_LOCALE`，新增 `LOCALE_REGION` 映射；提交 `待补` |

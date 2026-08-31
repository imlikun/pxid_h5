# 语言切换对接文档（H5 ↔ Flutter）—— Flutter 侧需要做什么

> 定版：2026-08-31（坤哥拍板）  
> 适用：PXID ToC H5（内嵌 Flutter WebView）  
> 本文是**给 Flutter 同学看的契约**——讲清楚 H5 已经做了什么、你这边必须做什么、给什么值、怎么验收。

---

## 一句话结论

**界面语言 + 内容地区，都只由「手机/App 语言」一个东西决定。** Flutter 把这一个语言值喂给 H5，剩下的 H5 自己搞定（语言映射成地区、拉对应内容）。**你不用管地区，也不用实现地区切换器。**

| Flutter 喂给 H5 的语言 | H5 界面 | H5 自动拉的内容 |
|---|---|---|
| `zh` 中文 | 中文 | 中国内容（CN） |
| `pt` 葡萄牙语 | 葡语 | 巴西内容（BR） |
| `en` 英文 | 英文 | 全球内容（US） |

> 中国人去美国、手机语言没改 → 仍中文 + 中国内容。  
> 在巴西把手机语言切葡语 → 界面葡语 + 巴西内容。  
> 不存在「界面中文但看巴西内容」这种组合。

---

## 🔴 现状：H5 已经做了什么

1. H5 支持三语（`zh`/`en`/`pt`），文案集中在 `src/i18n/index.js`。
2. H5 内部写了「语言 → 地区」固定映射，内容请求自动带地区，无需 Flutter 参与：
   ```js
   // src/i18n/index.js
   export const LOCALE_REGION = { zh: 'CN', pt: 'BR', en: 'US' }
   export function regionFromLocale(loc) {
     return LOCALE_REGION[loc] || LOCALE_REGION[locale.value] || 'US'
   }
   ```
3. H5 取语言的优先级（**运行时主路径是 bridge，URL 仅联调**）：
   ```
   URL ?lang=  >  bridge.getLocale()  >  navigator.language（兜底）  >  zh
   ```
4. 发现页 / 活动中心 / 精选页 / 商品详情 / 车型详情 / 发布页 / 帖子详情，全部已按上述规则取地区并拉内容；**没有任何独立地区切换器**。
5. 改系统语言后切回 App 前台，H5 自动刷新，**无需重启 App**（监听 `visibilitychange`）。

---

## 🟠 卡点与易错点（Flutter 千万别踩）

1. **不要再给 H5 传 `getRegion()` 来决定内容**。H5 内容地区完全由语言映射；多传 region 只会口径不一致。（`getRegion()` 桥方法 H5 已不再用于内容，你留着做别的原生逻辑也行，但别指望它驱动 H5 内容。）
2. **系统 Locale 必须归一化再传**。手机系统返回的是 `zh-CN` / `pt-BR` / `en-US` 这种，H5 只要 `zh` / `en` / `pt` 三个小写值。不归一化会落空、掉到英文兜底。
3. **必须带 `isNative: true`**。不带的桥会被 H5 当成预览态（走 mock、显示底部 tab），不是你要的嵌入态。
4. **不实现 `getLocale()` 的后果**：H5 退回去读 `navigator.language`，WebView 里各机型表现不一致，内容地区可能错。建议显式实现。

---

## 🟡 需要 Flutter 提供什么（核心待办）

### P0 · 必须做

**1. 实现并注入 `window.PXIDBridge.getLocale()`**

在加载 H5 之前注入，返回 `'zh' | 'en' | 'pt'`（小写）。

**2. 取值优先级（Flutter 侧）**

```
App 内语言设置（若有）  >  手机系统语言  >  兜底 'zh'
```

**3. 系统 Locale 归一化规则（注入前必须做）**

| 系统值示例 | 传给 H5 |
|---|---|
| `zh-CN` / `zh-Hans` / `zh-Hant` / `zh-TW` | `zh` |
| `pt-BR` / `pt-PT` | `pt` |
| `en-US` / `en-GB` / 其余一切 | `en` |

**4. 注入时带 `isNative: true`**

### 不用做（澄清，避免多此一举）

- ❌ 不要实现「地区切换器」——地区跟着语言走，没有独立地区概念。
- ❌ 不要传 `region=CN/BR/US` 给 H5——H5 自己映射。
- ❌ 不需要为内容地区调任何接口——H5 已经在 `regionFromLocale()` 里解决。

### 可选 · 联调 / 预览

- H5 预览可用 `?lang=zh|en|pt` 强制指定语言，**不用接桥也能看三语效果**：
  - 中文：`https://appin.site/nav/pxid-h5/?lang=zh`
  - 英文：`https://appin.site/nav/pxid-h5/?lang=en`
  - 葡语：`https://appin.site/nav/pxid-h5/?lang=pt`

---

## 🟢 怎么做（Flutter 侧代码示例）

### Dart：归一化 + 注入桥

```dart
// 归一化系统/App 语言 → H5 三语之一
String normalizeLocale(String raw) {
  final l = raw.toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('pt')) return 'pt';
  return 'en'; // 其余一律英文兜底
}

// 取语言：App 设置优先，否则手机系统语言
String getH5Locale() {
  final appLang = AppSettings.language;            // 可能为 null
  final sysLang = Platform.localeName;             // 如 "zh-CN"
  return normalizeLocale(appLang ?? sysLang);
}

// 加载 H5 前注入（只列语言相关，其余桥方法照旧）
final locale = getH5Locale();
await webViewController.runJavascript('''
  window.PXIDBridge = window.PXIDBridge || {};
  window.PXIDBridge.isNative = true;
  window.PXIDBridge.getLocale = function () {
    return Promise.resolve('$locale');
  };
''');
```

> 简化写法：若 WebView 框架支持直接注入 `window.PXIDBridge` 对象（而非 runJavascript 拼字符串），把 `getLocale` 写成返回 `Future<String>` / `Promise<'zh'|'en'|'pt'>` 即可。关键是**返回归一化后的小写三语值**。

---

## 🔵 最终效果与验收清单

| # | 场景 | 期望 |
|---|---|---|
| 1 | 手机系统=中文 | 界面中文 + 中国内容 |
| 2 | 中国人去美国（语言不变） | 界面中文 + 中国内容 ✅ |
| 3 | 巴西把手机语言切葡语 | 界面葡语 + 巴西内容 ✅ |
| 4 | 手机系统=英文 | 界面英文 + 全球内容(US) |
| 5 | 改系统语言后切回 App 前台 | 自动刷新，**无需重启 App** |
| 6 | 发现/活动/精选/详情页 | 均无独立「全球/中国/巴西」切换器 |

**Flutter 联调自测**：改手机系统语言（或 App 内语言设置）→ 切到后台再回前台 → H5 界面语言和内容一起变。

---

## 变更记录

| 日期 | 说明 | 提交 |
|---|---|---|
| 2026-08-31 | 初版：语言与地区「解耦」（语言管界面、地区管内容） | `f366c37` |
| 2026-08-31 | 定版修正：坤哥拍板「语言同时决定界面和内容地区」，移除独立地区切换器、`REGION_LOCALE`，新增 `LOCALE_REGION` + `regionFromLocale()` | `0431601` |

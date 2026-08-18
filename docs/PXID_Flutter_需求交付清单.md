# PXID ToC App · Flutter 侧对接信息（必读）

> 读者：**Flutter 原生开发同学**
> 说明：迁移/开发由**我们（App 团队）**主导，你只需知道下面这些**必须知道的信息**，并配合交付 4 项内容即可。实现细节我们这边做。

---

## 一、分工（必知）

| 模块 | 归属 | 你要做的 |
| --- | --- | --- |
| 发现（推荐/广场/动态） | H5（我们） | 通过 JS Bridge 通信（见 INTEGRATION.md） |
| 精选（商城） | H5 + Shopify | 实现 `openCheckout` 结账桥（第 4 项） |
| 服务 | 待定（对比后定） | 做原生版供对比（第 2 项） |

## 二、必须知道的约定（必读，详见各自文档）

1. **JS Bridge**：WebView 加载 H5 前注入 `window.PXIDBridge`，`isNative: true` 标记。方法清单见 `INTEGRATION.md`。
2. **商城结账**：`openCheckout(lines)` 契约见 `PXID_Shopify_结账桥接_Flutter版.md`（cartCreate → checkoutUrl → WebView → return_to）。
3. **多国定位**：`getLocale()` 返回 `{locale,country,currency}`，结账按 `country` 路由到对应国店铺。
4. **服务模块**：实现范围见下方第 3 节（或参考仓库 `src/views/` 原 H5 页面）。

---

## 三、需交付的 4 项

1. **WebView 加载方式**：告知当前是本地打包还是线上 URL；若是本地，后续改为线上地址（最终域名我们定好后告知你）。
2. **服务模块原生版效果**：做出来截图/录屏给我们，对比后拍板用 H5 版还是原生版。
3. **JS Bridge 实现确认**：对照 `INTEGRATION.md` 逐项回复"已实现 / 未实现"。
4. **openCheckout 状态**：告知已完成 / 进行中 / 未开始（契约见 `PXID_Shopify_结账桥接_Flutter版.md`）。

## 四、边界

- **我们负责**：H5 三模块、后端、迁移部署、域名证书、热更新、Shopify 契约。
- **你负责**：上面 4 项；不写文档、不搭服务器、不碰 Shopify 店铺后台。

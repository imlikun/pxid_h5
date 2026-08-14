# PXID C端 App · 三板块 H5（发现 / 精选 / 服务）

底层 App 由 **Flutter** 构建，三个内容板块（发现 / 精选 / 服务）用 **Vue3 + Vite H5** 实现，通过 WebView 嵌入 Flutter。「购车」「我的」由原生 Flutter 提供，本工程不做。

> 本工程无重型 UI 库（零依赖组件，全部手写），mock 数据驱动，可直接在浏览器独立预览，也可嵌入原生。

---

## 1. 快速开始

```bash
npm install        # 装依赖（首次）
npm run dev        # 开发预览 → http://localhost:5173
npm run build      # 生产构建 → dist/
npm run preview    # 构建产物预览（默认 4173 端口）
```

独立预览（浏览器 / 手机浏览器）URL 带 `?embed=1` 时隐藏演示底部 tab 栏；不带则显示演示 tab 便于浏览。

**演示入口**
- 发现：`#/discover`（推荐 / 动态 / 广场 三 tab，含消息 `#/message`）
- 精选：`#/featured`（推荐 / 踏春装备 / Bikes 三 tab 商城）
- 服务：`#/service`（13 个子页全落地）

---

## 2. 已实现功能

### 发现
- 推荐 / 动态 / 广场 三 tab，车型筛选各自独立（推荐=全部 H10 M2 Z3、动态=最新 H10 M2 Z3、广场=P1-P6）
- Banner 用设计稿轮播图（`public/discover-banner.jpg`）
- 快捷入口：立即定制 / 官方公告 / 智能助手 / 积分兑换
- 卡片内容与作者（PXID 官方产品经理 / 一路向前）按设计稿对齐
- 广场：P1-P6 六车型展示 + 热门活动 2 条（封面按设计稿顺序）
- 消息中心：系统 / 服务 / 车辆 / 互动 四类

### 精选（商城）
- 首页三 tab（推荐 / 踏春装备 / Bikes）+ 热购榜单 + 限时直降
- 商品详情页：规格选择 / 数量步进 / 加入购物车 / 立即购买（bridge 原生支付）
- 购物车：勾选 / 全选 / 数量步进 / 合计
- 结算确认页：收货地址（原生地址管理）+ 商品清单 + 金额明细
- 支付成功页 + 我的订单列表（状态 tab / 再来一单 / 去支付）
- 完整链路：加购 → 购物车 → 结算 → 支付 → 订单

### 服务（13 子页）
道路救援（双 tab + 表单 + bridge 发起）、使用指南、新手视频、产品资料（P1 说明书）、车辆体检（6 项状态 + 远程体检）、意见反馈（在线客服）、三包政策（表格 + 服务范围 + 10 条不保修）、附近门店（搜索排序 + 地图导航/电话 bridge）、我的工单（5 状态 tab）、工单详情（4 进度节点 + 动态字段）、常见问题（12 条 Q+A + 搜索 + 问题筛选弹窗 3 组 12 标签）

---

## 3. 设计 Token（`src/styles/tokens.css`）

| Token | 值 | 用途 |
|---|---|---|
| `--brand` | `#2563EB` | 主品牌深蓝 |
| `--brand-light` | `#548EFF` | 浅蓝 |
| `--price` | `#e53935` | 价格红 |
| `--bg` / `--card` | `#EFEFEF` / `#ffffff` | 页面 / 卡片背景 |
| `--text` / `--text-sub` | `#333333` / `#666666` | 主 / 次文字 |

字体：系统栈（PingFang SC）；页面主体白底（三板块统一）；顶部 tab 18px、激活黑粗；卡片圆角 12px。

---

## 4. 目录结构

```
pxid_h5/
├─ index.html
├─ vite.config.js          # base './'（CDN/file:// 都能加载）
├─ package.json
├─ README.md               # 本文件
├─ INTEGRATION.md          # JS Bridge 契约（给 Flutter 原生侧）
├─ public/                 # 设计稿原图资源（banner / 卡片封面 / 车型图）
└─ src/
   ├─ main.js / App.vue
   ├─ bridge/index.js      # JS Bridge：getToken/navigateTo/requestPurchase/callPhone/openMap/openNative
   ├─ router/index.js      # hash 路由
   ├─ store/cart.js        # 购物车（勾选/合计）
   ├─ data/mock.js         # 全部 mock 数据（接 API 时整文件替换）
   ├─ styles/tokens.css    # 设计 token
   ├─ components/          # DemoTabBar / ProductCard / FeedCard / StoreCard / FaqItem / SectionHeader / QuickActions
   └─ views/
      ├─ DiscoverView / MessageView
      ├─ FeaturedView / ProductDetailView / CartView / CheckoutView / OrderListView / OrderSuccessView
      └─ ServiceView + 13 个服务子页
```

---

## 5. 数据层约定

所有页面数据集中在 `src/data/mock.js`（商品 / 工单 / FAQ / 门店 / 订单 / 车辆体检等）。接真实 API 时：
- 保持导出名不变，整体替换数据来源即可
- 页面层全部通过 computed / 组件 prop 消费，不感知数据源

---

## 6. 原生集成

见 `INTEGRATION.md`——Flutter 侧注入 `window.PXIDBridge`，H5 统一走 `src/bridge/index.js` 封装：
`getToken / navigateTo / requestPurchase / callPhone / openMap / openNative`。
独立预览时自动用 mock 实现，页面在浏览器里点得动、跑得通。

---

## 7. 双机协作（Windows ⇄ macOS）

代码仓库有 **两个远端**：

| remote | 地址 | 用途 |
|---|---|---|
| `origin` | `ssh://root@101.133.136.140/srv/sync/pxid_h5.git` | ECS 裸仓（双机同步主通道） |
| `gitlab` | `http://likun:<PAT>@47.100.82.63:8099/likun/pxid_h5.git` | 公司自建 GitLab（web 可看、备份） |

```bash
# 首次拉取（任意一个远端）
git clone ssh://root@101.133.136.140/srv/sync/pxid_h5.git
# 或
git clone http://git.pxidiot.com:8099/likun/pxid_h5.git
cd pxid_h5 && npm install && npm run dev

# 日常：改完推送（ECS 主通道 + GitLab 备份，一次推两个）
git add -A && git commit -m "说明"
git push origin master
git push gitlab master:main

# 换机接手前：先拉
git pull origin master
```

> ⚠️ 双远端**交替操作必须先 pull 再 push**，禁止 `push --force`。
> ⚠️ GitLab 走 HTTP+PAT（SSH 22 在部分网络被墙）；本地 `credential.helper` 已置空，token 直挂 remote URL。
> ⚠️ GitLab 默认分支为 `main`，本地为 `master`，推送用 `master:main` 显式映射。

备份三处冗余：本地 git 库 + 本地副本（`pxid_h5_backup_20260813` / `pxid_h5_backup_20260814`）+ ECS 裸仓 + GitLab。

---

## 8. 待办 / 下一步

- 订单详情页（订单列表「查看详情」按钮目前占位）
- FAQ 详情页完整 A 文案（列表 A 摘要按设计稿截断显示）
- 商品/卡片封面换设计稿真实图（目前商品图为 emoji 占位，部分 feed 封面用设计稿子目录原图）
- 附近门店 / FAQ 等按后续设计稿标注精调视觉

# PXID C端 App · 三板块 H5（发现 / 精选 / 服务）

底层 App 由 **Flutter** 构建，三个内容板块（发现 / 精选 / 服务）用 **Vue3 + Vite H5** 实现，通过 WebView 嵌入 Flutter。「购车」「我的」由原生 Flutter 提供，本工程不做。

> 本工程无重型 UI 库（零依赖组件，全部手写），mock 数据驱动，可直接在浏览器独立预览，也可嵌入原生。

> 🔴 **改代码前先读 [`AGENTS.md`](./AGENTS.md)** —— 命令、代码地图、桥契约、部署流程、红线与历史事故都在那里。
> 本文档是项目简介；`AGENTS.md` 是操作手册（与本文冲突时以 `AGENTS.md` + 代码为准）。
> Flutter 对接看 [`INTEGRATION.md`](./INTEGRATION.md)。

---

## 1. 快速开始

```bash
npm install        # 装依赖（首次）
npm run dev        # 开发预览 → http://localhost:5173
npm run build      # 生产构建 → dist/
npm run preview    # 构建产物预览（默认 4173 端口）
```

> ⚠️ **Windows 沙箱里 `npm run build` 会假死**（实测 13 分钟零输出）—— 必须直跑
> `node node_modules/vite/bin/vite.js build` 并把输出重定向到文件，详见 `AGENTS.md` §1。

独立预览（浏览器 / 手机浏览器）URL 带 `?embed=1` 时隐藏演示底部 tab 栏；不带则显示演示 tab 便于浏览。

**演示入口**
- 发现：`#/discover`（推荐 / 动态 / 广场 三 tab，含消息 `#/message`）
- 精选：`#/featured`（推荐 / 踏春装备 / Bikes 三 tab 商城）
- 服务：`#/service`（13 个子页全落地）

---

## 2. 已实现功能

### 发现
- 推荐 / 动态 / 广场 三 tab；车型筛选条统一用 12 个在售代号（P1–P9、F1/F2、G1，真源 `src/data/carModels.js`）
- 「我的车」chip：登录用户绑定了车型时插在「全部」之后，且**默认筛该车型**（库里没内容时自动回「全部」，不空屏）
- Banner 轮播、快捷入口（立即定制 → 车型页 `/vehicle/ant5`、官方公告、智能助手、积分兑换）
- 内容详情：点赞 / 收藏 / 评论 / 举报，列表→详情快照直出 + 微信式右进左出转场
- 官方公告（含召回强确认）、活动中心、互动消息
- 消息中心：系统 / 服务 / 车辆 / 互动 四类
- 下拉刷新 = 热更新（有新版整页重载，否则只刷数据）

### 精选（商城，Shopify 代理）
- 首页三 tab + `GET /featured-config` 运营配置（榜单 / 限时直降）
- 商品数据来自后端 `GET /mall-api/products`（Shopify 代理）；详情 `/mall-api/products/:handle`
- **下单链路**：加购 → 本地购物车 `/cart` → 确认订单 `/cart/checkout` → `POST /mall-api/checkout-v2`
  （后端建 Shopify 车 + 预填邮箱/地址/region）→ `bridge.openShopify(url)` 打开结账
- 订单列表 `/order/list` 走 `GET /mall-api/orders`（未认领需先 `POST /mall-api/orders/claim`）
- ⚠️ 订单**详情**与**退货申请**的后端接口尚未实现（前端本地降级兜着）

### 我的积分（`/points`）
- 积分余额 + 积分规则 + 玩转积分 banner + 积分好物列表（价格 / 积分 / 兑换）
- 发现页「积分兑换」、精选页「玩转积分」均跳转此页
- 兑换 / 规则 / banner 等原生动作走 `openNative('points/...')`

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

完整代码地图（含每个目录职责、后端路由/表、文档索引）见 **[`AGENTS.md`](./AGENTS.md) §2**。

```
pxid_h5/
├─ index.html
├─ vite.config.js          # base './'（WebView / 任意域名都能加载）
├─ AGENTS.md               # 🔴 开发代理/接手人操作手册（先读）
├─ INTEGRATION.md          # JS Bridge 契约（给 Flutter 原生侧）
├─ docs/                   # 契约 / 对接 / 规范类文档（25 份，索引见 AGENTS.md §5）
├─ public/                 # 设计稿原图资源
├─ server/                 # 自建后端（Node + better-sqlite3，pm2: pxid-feed）
└─ src/
   ├─ main.js / App.vue           # 入口 / 壳（keep-alive + 全局转场）
   ├─ bridge/                     # 原生桥（PXIDBridge + PXIDApp）、全屏通道、白名单
   ├─ router/                     # hash 路由（约 40 条）
   ├─ api/                        # feed（发现）/ shop（精选·Shopify 代理）/ growth / notifications
   ├─ store/                      # cart / feedCache / noticeStore / notificationStore / publish / ui
   ├─ utils/                      # auth / avatar / device / feedSnapshot / hotUpdate / videoPoster / time
   ├─ composables/                # usePageTransition / useSwipeBack
   ├─ data/carModels.js           # 车型唯一数据源（含 normalizeCarModel）
   ├─ i18n/                       # zh→CN / pt→BR / en→US
   ├─ styles/tokens.css           # 设计 token
   ├─ components/                 # TopBar / FeedCard / MomentCard / ProductCard / ModelPicker …
   └─ views/                      # 38 个页面（命名即路由）
```

---

## 5. 数据层约定

所有页面数据集中在 `src/data/mock.js`（商品 / 工单 / FAQ / 门店 / 订单 / 车辆体检等）。接真实 API 时：
- 保持导出名不变，整体替换数据来源即可
- 页面层全部通过 computed / 组件 prop 消费，不感知数据源

---

## 6. 原生集成

见 `INTEGRATION.md`——Flutter 侧注入 `window.PXIDBridge`，H5 统一走 `src/bridge/index.js` 封装：
`getToken / navigateTo / requestPurchase / callPhone / openMap / openNative / openShopify`。
独立预览时自动用 mock 实现，页面在浏览器里点得动、跑得通。

---

## 7. 多机协作（Windows ⇄ macOS）与远端

代码仓库有 **三个远端、各带 `master` + `main` 两个分支 = 提交后必须推 6 条 ref**：

| remote | 地址 | 角色 |
|---|---|---|
| `origin` | `ssh://root@101.133.136.140/srv/sync/pxid_h5.git` | **ECS 裸仓（唯一部署源）**，`deploy-pxid-h5.sh` 从这里 pull |
| `github` | `git@github.com:imlikun/pxid_h5.git` | 备份镜像 |
| `gitlab` | `http://<token>@47.100.82.63:8099/likun/pxid_h5.git` | 公司自建 GitLab（默认分支是 `main`） |

```bash
git push origin master && git push origin master:main
git push github master && git push github master:main
git -c credential.helper= push gitlab master:master
git -c credential.helper= push gitlab master:main
# 再核验六 ref：
git -c credential.helper= ls-remote origin | grep 'refs/heads/\(master\|main\)$'
```

> ⚠️ 只推 `master` 会让另外 3 个 ref 悄悄落后；**永远以 `ls-remote` 哈希为准**，不看 push 回显。
> ⚠️ `-c credential.helper=` 必加（本机 Git Credential Manager 在非交互环境会卡死 → exit 128 全空输出）。
> ⚠️ 换机接手前先 `git pull origin master`；**禁止 `push --force`**。
> ⚠️ 详细排障（分叉判定 / GIT_TRACE / 部署核验）见 `AGENTS.md` §1 与 skill `pxid-h5-3remote-sync`。

---

## 8. 待办 / 已知问题

见 **[`AGENTS.md`](./AGENTS.md) §9**（每次改动会同步更新，避免两处不一致）。要点：内容 carModel 标签缺失、
车型页冷加载 2.9~8s、缩略图未压、评论 DELETE 与订单详情/退货接口后端未实现、`CustomizeView` 零入口。

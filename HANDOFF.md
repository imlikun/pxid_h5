# pxid_h5 交接文档（H5 ↔ Flutter 协作 + 近期改动状态）

> 用途：跨会话 / 新开窗口时快速接手。最后更新：2026-08-27 16:52。

## 一、部署方式（最重要，别再搞错）

- **线上源 = `origin`，即 ECS 裸仓** `ssh://root@101.133.136.140/srv/sync/pxid_h5.git`
- 本地仓库目录：`D:/品向/pxid_h5`
- 上线两步：
  1. `git push origin master`
  2. ECS 上 `bash /root/deploy-pxid-h5.sh`（git pull → rm -rf dist → npm run build → 同步后端 → pm2 reload pxid-feed）
- **47.100.82.63 是 pxid.cn 的自建 GitLab，与 H5 无关**，不要往那推（glpat token 也已过期）。
- `github` remote 仅作代码备份，不触发部署。

## 二、今日已完成（2026-08-27）：快捷入口 2.5D 图标

- commit `f52a0aa`，已 push origin 并跑 deploy，**线上已生效（16:51）**。
- 范围：发现页 4 个 + 精选页 3 个，共 7 个快捷入口图标，从 `IconSvg` 单色线性 → 蓝调 2.5D 彩色 SVG。
  - 发现页 `discoverQuick`：scissors / megaphone / headset / gift
  - 精选页 `featuredQuick`：flame / sparkles / award
- 资产：`src/assets/icons/{flame,sparkles,award,scissors,megaphone,headset,gift}-3d.svg` + `index.js`（导出 `QUICK_ICON_SVG` 映射）。
- 主色 `#7c8cff→#3d7bff`，单层蓝投影，暖色（金/青/粉）点睛。
- 渲染：`QuickActions.vue` 与 `DiscoverView.vue` 优先 `<img>` 引 SVG，未命中映射回退 `IconSvg`（其它图标不动）。
- 本地预览：`src/assets/icons/preview.html`。

## 三、近期已完成的关键修复（都已上线，无需重做）

1. **顶栏非沉浸式**：`TopBar.vue` 完全去掉 `env(safe-area-inset-top)`，固定 48px，紧贴状态栏下方、不铺背景（与 Flutter 无关，Flutter 用 SafeArea 包 WebView）。
2. **评论框键盘遮挡**：`FeedDetailView.vue` 输入栏 bottom 用 `max(env(keyboard-inset-bottom), JS计算值)` + 180ms 兜底。
3. **广场车型补全 + 发动态选车**：`plazaShowcase` 与 `CAR_MODELS` 为两个独立数据源；广场 12 车型（F2/P2/P5/P1/G1/P3/F1/P4/P6/P7/P8/P9），点击直接进发布页预选该车型（`openNative('discover/publish?carModel=xxx')`，H5 兜底 `/publish?carModel=xxx`）。与精选 Shopify 无关。
4. **推荐/动态页车型筛选**：固定 12 车型列表（不再动态提取线上已发帖车型）。
5. **“我的车” chip**：用户有车且车型在列表内时，“全部”右侧第一个显示“我的车”。优先级 `getUserInfo().carModel` → localStorage `pxid_my_car_model` 回退（localStorage 仅作回退，非第一方案）。
6. **头像契约**：H5 统一 `avatar` 字段，`normalizeProfile` 兼容 avatarUrl/headImgUrl/portrait/photo 别名；`carModel` 兼容 myCar/vehicle/bindVehicle。
7. **后台官方帖头像**：`server/server.js` 新增可选 `avatar`/`nickname`（读 `OFFICIAL_AVATAR_URL` / `OFFICIAL_NICKNAME` env），不再写死空头像。

## 四、待 Flutter 侧配合（H5 已就绪，等 Flutter 接）

- [ ] 实现 `discover/publish` 原生发布器（方案 A，H5 不实现原生发布器）。
- [ ] `getUserInfo()` 真实返回 `carModel`（车型代号）和 `avatar`（URL）。
- [ ] 确认 getUserInfo 头像字段名已是 `avatar`，且发布器请求 body 用 `avatar` 传头像（后端已对齐 `avatar`）。
- [ ] 提供官方 Logo 图片 URL，配 ECS 环境变量 `OFFICIAL_AVATAR_URL`（后端已支持，待值）。
- **已验证现状**：ECS 库 38 条动态 0 条带 `avatar`，后端存返链路 OK，确认 Flutter 尚未真正传 `avatar`。

## 五、关键约定（避免重复踩坑）

- H5 × Flutter 桥：`window.PXIDBridge`、`openNative`、`getUserInfo`、`navigateTo`。
- 真机发帖走 `openNative('discover/publish?carModel=xxx')`；H5 兜底 `/publish?carModel=xxx`。
- 改动前先读对应代码定位根因，再动手（坤哥拍板纪律：🔴读 → 🟠找 → 🟡提 → 🟢解）。
- pre-commit hook 校验：TopBar 须含 `position: sticky`；DiscoverView 保留汉字防御性过滤标记（勿删）。
- 后端服务：ECS `101.133.136.140`，pxid-feed 端口 8700，库 `/root/pxid-feed-server/feed.db`。

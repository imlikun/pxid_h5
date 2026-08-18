# PXID ToC App · 迁移 / 服务模块交接 / 热更新对接文档

> 读者：**Flutter 原生开发同学**
> 目的：本文对齐三件事：① H5 三个模块（发现/精选/服务）迁移到公司服务器需要的环境；② 服务模块已由原生接管，H5 侧已屏蔽；③ 三个模块的热更新方案。请按本文执行。
> 关联文档：`PXID_ToC_后端接口规范.md`（后端契约）、`PXID_Shopify_结账桥接_Flutter版.md`（商城结账）、`INTEGRATION.md`（JS Bridge 契约）。

---

## 0. 现状与分工（先看）

| 模块 | 归属 | 说明 |
| --- | --- | --- |
| 发现（推荐/广场/动态） | **H5（我们）** | 列表/详情为 H5；**发帖/动态归我们**（后端 `pxid-feed-server` 保留，迁公司服务器后换域名） |
| 精选（商城） | H5 + Shopify | H5 展示 + 结账编排（`openCheckout` 原生实现），数据来自 Shopify（见 Codex 契约） |
| 服务 | **待定** | **先看 Flutter 原生实现效果，再决定用 H5 的还是原生的**（当前 H5 实现保留，暂不屏蔽） |

---

## 1. 迁移到公司服务器（环境清单）

### 1.1 H5 三个模块（发现/精选/服务）
H5 是 **Vue3 + Vite 构建的纯静态站**，构建产物 `dist/` 只需 **任意静态文件服务器** 即可托管：

| 项 | 要求 |
| --- | --- |
| 静态服务器 | Nginx / Caddy / 对象存储 CDN 均可（无需 Node 运行时） |
| HTTPS | 必需（App WebView 强制 https，且 Service Worker/地理位置依赖） |
| 域名 | 如 `h5.pxid.com`（需可公网访问、证书） |
| 部署方式 | 上传 `dist/` 到站点根目录即可，构建命令：`npm install && npm run build` |

> 注意：H5 使用 hash 路由（`#/`），静态托管无需 rewrite 规则。

### 1.3 链接关系（谁连谁，务必对齐）

```
[App WebView] ──加载──> H5 静态站（如 https://h5.pxid.com/）
     │
     ├─ H5 内页面跳转/数据 ──> 后端接口（如 https://api.pxid.com/pxid/v1）
     │
     └─ 商城结账 ──> bridge.openCheckout() → 原生 → Shopify 店铺
```

**需要你确认/填写的三个地址**（H5 侧是常量，改一处即可，见下方）：
1. **H5 域名**：`https://h5.pxid.com/`（Flutter 加载这个 URL 的 `index.html`，或打 zip 走本地+远程）
2. **后端 API 域名**：`https://api.pxid.com/pxid/v1`（H5 调 `GET/POST /feed` 等）
3. **发帖后端域名**：`https://pxid-api.appin.site`（当前临时，迁公司服务器后换成公司的，如 `https://api.pxid.com`）

**H5 侧地址常量位置**（迁到公司后改这两处即可）：
- `src/api/feed.js` → `const FEED_API = 'https://...'`（发帖/动态后端）
- 其余接口按 `PXID_ToC_后端接口规范.md` §1 Base URL 约定

### 1.4 迁移前复核清单（2026-08-18 已过一遍，务必逐项做）

| # | 检查项 | 现状/动作 | 迁移时 |
| --- | --- | --- | --- |
| 1 | **H5 资源路径** | `index.html` 用 `./assets/xxx`（相对路径）+ hash 路由（`#/`） | ✅ 任意子路径/域名都能跑，**无需 rewrite 规则** |
| 2 | **后端 CORS** | 已放行 `*`（非白名单也回 `*`） | ✅ 新域名直接通，**无需改** |
| 3 | **FEED_API 硬编码** | `src/api/feed.js` 写死 `https://pxid-api.appin.site` | ⚠️ **必须改成公司后端域名**（如 `https://api.pxid.com`），改完 `npm run build` |
| 4 | **后端数据库** | SQLite `feed.db`（WAL 模式，含 -shm/-wal 文件） | ⚠️ **三件套一起拷**（feed.db + feed.db-shm + feed.db-wal），漏了 -wal 会丢最近数据 |
| 5 | **后端环境** | Node ≥18 + pm2 + better-sqlite3 | ⚠️ 公司服务器需装：`node`、`pm2`、`npm install better-sqlite3`（**必须原生编译**，装系统 build-essential/gcc） |
| 6 | **HTTPS 证书** | 现用 Let's Encrypt（acme.sh HTTP-01） | ⚠️ 新域名需重新签（DNS 先解析到公司服务器 + 80 端口外网可达），流程同 `pxid-api.appin.site` |
| 7 | **nginx 反代** | 后端 8700 端口，nginx 反代 `/` | ⚠️ 公司服务器复制该 vhost 配置，改 server_name + 证书路径 |
| 8 | **图片资源** | mock 图是相对路径（`unsplash/...`）随 dist 走 | ✅ 无需处理 |
| 9 | **Shopify 商城** | `shop.js` 直连 `marsantsx.com`（CORS 已验证 `*`） | ✅ 与迁移无关，保持直连 |
| 10 | **发帖 bridge** | H5 发帖走 `openNative('discover/publish')`（原生接管） | ✅ 无需改；预览态 mock 兜底保留 |
| 11 | **环境未知项** | 公司服务器 OS/是否宝塔/有无 Nginx/Node | ⚠️ 先跑 §5 排查清单，环境就绪前**不要动线上** |
| 12 | **回滚预案** | 迁移期间线上 H5 不动（仍 appin.site） | ✅ 新域名验证通过后再切 Flutter 加载地址；失败随时回退 |

### 1.2 后端服务（如有，按需）
| 项 | 要求 |
| --- | --- |
| Node.js | ≥ 18（当前开发用 20） |
| 进程守护 | pm2（`pm2 start server.js --name pxid-feed`） |
| 数据库 | SQLite（better-sqlite3，单文件 `feed.db`，零运维） |
| 反代 | Nginx 反代到 Node 端口 |
| 域名 | 如 `api.pxid.com`，HTTPS |

> 若公司服务器已有 Nginx + Node 环境，H5 与后端可直接部署；若只有静态空间，H5 可用，后端需另配一台或同一台开 Node。

---

## 2. 服务模块交接（状态：待定，先对比再决定）

### 2.1 当前决定（2026-08-18）
**先看 Flutter 原生实现的样子，再决定服务模块用 H5 的还是原生的。** 当前 H5 服务实现**保留不屏蔽**（ServiceView 原样可用）。

### 2.2 对比维度（等 Flutter 原生版出来对比）
| 维度 | H5 版（现有） | Flutter 原生版（待提供） |
| --- | --- | --- |
| 视觉一致性 | 与发现/精选统一（tokens.css） | 需对齐同一规范 |
| 功能完整性 | 6 入口 + 门店 + 常见问题 + 各子页 | 待 Flutter 确认 |
| 数据接口 | 后端规范 §7 | 同一套接口 |
| 更新成本 | 热更新即改（方案 B） | 需发版 |

### 2.3 若最终选原生
- H5 `ServiceView.vue` 改为占位页（本次已备好，未启用）。
- 服务子路由 `/service/*` 文件保留但无入口。
- 原生实现清单：道路救援、使用指南（视频/说明书）、车辆体检、意见反馈、三包政策、附近门店、我的工单/详情、常见问题/筛选/详情，接口按后端规范 §7。

---

## 3. 热更新方案（三个模块 H5 资源）

### 3.1 需求
发现/精选/服务三个模块的资源需要**不发版 App 也能更新**（改文案、修 bug、加活动页）。

### 3.2 现状
H5 已确认是**打包进 App 本地**（Flutter 加载本地资源），这导致每次改 H5 都要重新发版。

### 3.3 推荐方案（改动最小、稳定）：本地兜底 + 远程覆盖

**思路**：App 内置一版 `dist/` 作为兜底；启动时从公司服务器拉 `version.json`，若线上版本号 > 本地缓存版本，下载新 `dist.zip` 解压覆盖到 App 缓存目录，WebView 加载缓存目录（拿不到网时回退内置包）。

**需要 Flutter 做**：
1. **WebView 加载源改为「缓存目录优先，内置资源兜底」**：
   - 首次启动：加载内置 `assets/h5/`；
   - 有远程新包：下载 → 解压到 `应用文档目录/h5_cache/` → 下次启动加载缓存目录；
   - 网络失败：继续用当前已有（内置或缓存）。
2. **版本比对**：启动时 GET `https://h5.pxid.com/version.json`，响应：
   ```json
   { "version": 12, "url": "https://h5.pxid.com/dist.zip", "md5": "..." }
   ```
   与本地缓存版本号比较，`version > 本地` 才下载。
3. **下载与校验**：下载 `dist.zip`（H5 构建产物 zip 打包），校验 MD5 一致后解压覆盖缓存目录；失败不切换、保留旧版。
4. **缓存目录结构**：`h5_cache/<version>/index.html`（版本目录隔离，便于回退/清理）。

**公司服务器侧（发布流程）**：
1. `npm run build` 产出 `dist/`；
2. 打 zip：`cd dist && zip -r ../dist.zip .`；
3. 更新 `version.json`（版本号 +1，填 zip 的 MD5）；
4. 上传 `dist.zip` + `version.json` 到站点目录（可配 CDN）。

### 3.4 备选方案（更省事但能力弱）
- **方案 B：改加载方式为线上 URL**——WebView 直接加载 `https://h5.pxid.com/`，天然热更新，无需版本管理；缺点：弱网下加载慢、完全依赖网络（若产品可接受，推荐此方案，改动仅一行 URL）。
- **方案 C：App 热更新框架**（如 mPaaS/自有 RN 热更）——与本项目纯 Web 不符，不推荐。

### 3.5 热更新推送流程（谁出包、谁上传、App 怎么拿）

**发布链路（每次改 H5 后走一遍）：**
```
① 出包（开发/我这边）：npm run build → dist/
② 打 zip：cd dist && zip -r ../dist.zip .
③ 算 MD5：md5sum dist.zip
④ 更新 version.json：{ "version": 12, "url": "https://h5.pxid.com/dist.zip", "md5": "..." }（version 每次 +1）
⑤ 上传：dist.zip + version.json 推到公司服务器站点根目录（可套 CDN）
⑥ App 端（Flutter）：启动时 GET version.json → 版本号 > 本地缓存 → 下载 zip → 校验 MD5 → 解压覆盖 → 下次 WebView 加载新包
```

**App 端拿到新包后什么时候生效：**
- 方案 A（本地+远程）：本次启动**只下载不切换**（避免加载中闪断），**下次启动 WebView 加载缓存目录**即新版本；也可做"下载完立即 reload"（体验即时但要多写一步）。
- 方案 B（线上 URL）：发布即生效（用户重进页面/下拉刷新就是新版），无推送概念。

**失败兜底：**
- 下载失败/MD5 不符 → 不切换，继续用内置包或旧缓存；不阻塞启动。
- version.json 拉不到（弱网）→ 直接用现有缓存，下次再试。

**发布工具（可选）**：可以把 ①②③④⑤ 打包成一个 `deploy.sh` 脚本放仓库根目录，我这边已按这个流程出包；Flutter 只负责 ⑥ App 端逻辑。

### 3.6 推荐结论（已定案 2026-08-18）
**选方案 B（线上 URL 加载）**：WebView 直接加载 `https://h5.pxid.com/`，发布即生效、零版本管理。H5 侧无需任何改动（本身无版本概念）。

---

## 4. 本次 H5 变更摘要

- `ServiceView.vue`：改为「服务模块已由原生接管」占位页。
- 服务子路由页面文件保留但无入口。
- 发现页/精选页不受影响。

## 5. 待你确认 / 待办

1. **服务模块**：等 Flutter 原生版效果出来，按 §2.2 对比后拍板用谁的。
2. **迁移环境**：先探公司服务器（另一台 ECS）有什么——跑一遍下面排查清单反馈结果，再定装什么、迁什么：
   ```bash
   # 公司服务器上执行
   cat /etc/os-release | head -2        # 系统版本
   which nginx node npm pm2 mysql redis 2>/dev/null   # 已装环境
   nginx -v 2>/dev/null; node -v 2>/dev/null          # 版本
   ls /www/wwwroot/ 2>/dev/null          # 宝塔站点目录
   ls /etc/nginx/conf.d/ 2>/dev/null | head            # nginx 配置
   ```
3. **域名/HTTPS**：H5 域名（如 h5.pxid.com）、后端域名（如 api.pxid.com）是否已解析到公司服务器、有没有证书。
4. **发帖后端**：pxid-feed-server 迁公司服务器后，`src/api/feed.js` 的 `FEED_API` 换成新域名即可（H5 侧就这一处）。

---

## 6. 给 Flutter 兄弟的需求交付清单（我们主导，他按单交付）

> 迁移/部署由**我们（App 团队）**主导执行；Flutter 不写文档、不主导，只需**按下面清单交付 4 样东西**。

### 6.1 交付清单（按优先级）

| # | 要什么 | 格式/标准 | 验收方式 | 给谁 |
| --- | --- | --- | --- | --- |
| 1 | **WebView 加载方式确认** | 告知当前加载的是本地打包还是线上 URL；若是本地，改一行指向 `https://h5.pxid.com/`（域名以最终确认为准） | 浏览器打开该 URL 能看到三个模块首页 | 坤哥 |
| 2 | **服务模块原生版效果**（供对比） | 按 §2.3 清单做 6 入口 + 子页，视觉对齐 tokens.css | 截图/录屏给坤哥，按 §2.2 对比后拍板用谁的 | 坤哥 |
| 3 | **JS Bridge 方法清单确认** | 已实现的方法对照 `INTEGRATION.md` 勾选：getToken / getLocale / navigateTo / openNative / openShopify / openCheckout / callPhone / openMap | 逐个回"已实现/未实现"即可 | 坤哥 |
| 4 | **商城结账 openCheckout 状态** | 是否已按 `PXID_Shopify_结账桥接_Flutter版.md` §1 实现 cartCreate → checkoutUrl → WebView → return_to | 回"已完成/进行中/未开始" | 坤哥 |

### 6.2 明确的边界（防止扯皮）
- **我们负责**：H5 三个模块开发/更新、后端（发帖 pxid-feed-server）、迁移部署、域名证书、热更新方案、与 Shopify 契约。
- **Flutter 负责**：上表 4 项交付物；其余不参与。
- **不需要 Flutter 做的**：不写迁移文档、不搭服务器、不碰 Shopify 店铺配置（那是对接文档另给 Shopify 兄弟）。

### 6.3 交付时间建议
- #1（加载方式）与 #3（bridge 清单）：**本周内**答复，阻塞迁移排期。
- #2（服务模块对比）：**按他节奏**，不阻塞其他模块。
- #4（openCheckout）：**与商城联调并行**。

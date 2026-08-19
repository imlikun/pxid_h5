# PXID H5 项目进度总览

> 用途：换会话/接手时快速对齐。读完这份即可继续开发，不必翻历史。
> 最后更新：2026-08-19，最新 commit `e162bed`（动态详情页下拉刷新）。

---

## 1. 项目定位

- **是什么**：PXID（江苏品向智造电助力车 OEM/ODM）ToC App 的 **H5 模块**，嵌入 Flutter App 的 WebView 内运行。
- **当前承载的功能**：
  - 发现页（社区动态三 tab：推荐 / 动态 / 广场）
  - 发布页（发动态 + 上传图片 + 关联车型）
  - 动态详情页（内容 / 点赞 / 评论）
  - 消息页（铃铛入口，桩页）
  - 精选页（`#/featured`，独立推荐流，结构同发现但内容不同）
- **技术栈**：Vue3 + Vite，hash 路由（`base: './'`），纯移动端 H5，无 SSR。
- **仓库目录**：`pxid_h5`（本地 `d:\WorkBuddy\2026-08-13-11-34-45\pxid_h5\`）。

---

## 2. 环境与部署（必读）

| 项 | 值 |
|---|---|
| 线上地址 | `https://appin.site/nav/pxid-h5/` |
| 后端 API 基地址 | `https://pxid-api.appin.site` |
| 构建命令 | `node node_modules/vite/bin/vite.js build`（用托管 node：`C:\Users\Kun.li\.workbuddy\binaries\node\versions\22.22.2\node.exe`） |
| 部署命令 | 见下方 |
| App 加载源 | **已解决**（之前 hy3 会话把 WebView 切到线上地址，热更新部署后 App 内直接生效。**不要再提"Trae 切地址 + 清缓存"**） |

**部署（务必 `-C dist .`，否则铺到子目录）：**
```bash
cd pxid_h5
rm -rf dist
node node_modules/vite/bin/vite.js build
tar czf - -C dist . | ssh -o BatchMode=yes root@101.133.136.140 \
  "rm -rf /www/wwwroot/appin.site/nav/pxid-h5 && \
   mkdir -p /www/wwwroot/appin.site/nav/pxid-h5 && \
   tar xzf - -C /www/wwwroot/appin.site/nav/pxid-h5 && \
   chown -R www:www /www/wwwroot/appin.site/nav/pxid-h5"
```

**双 remote（都要 push，fast-forward）：**
- `origin` = `ssh://root@101.133.136.140/srv/sync/pxid_h5.git`，分支 `master`（**ECS 权威部署源**）
- `gitlab` = `git@47.100.82.63:likun/pxid_h5.git`，分支 `master`（镜像）
- 提交后用：`git push origin master` + `git push gitlab master:master`

> ⚠️ **分叉坑**：gitlab 的 `main` 分支与 ECS `master` 完全分叉（跨分叉合并会丢/混代码），**只维护 `master`，`main` 保留不动，待用户裁决**。外部同事 clone 文档指向 `main`，他们拿到的是非线上版本。

---

## 3. 后端架构边界（极易混淆，务必看清）

这个项目有 **三个独立 owner**，别混：

1. **社区 feed 后端 = 八戒（我们）自己搭的** ✅
   - 服务名 `pxid-feed-server`（Node + better-sqlite3，SQLite `feed.db`）
   - 上线 `https://pxid-api.appin.site`（FEED_API）
   - 接口（契约见 `docs/PXID_ToC_后端接口规范.md` §3）：
     - `GET /feed?tab=recommend|dynamic|plaza`
     - `POST /feed`（发帖，author 由后端按 token 注入）
     - `GET /feed/{id}`（详情）
     - `POST /feed/{id}/like`
     - `POST /feed/{id}/comment` / `GET /feed/{id}/comments`
   - **已实测**：评论写库 + 跨端可读（round-trip 验证通过，2026-08-19）。DELETE 评论接口**未实现**（要清只能 SSH 进 SQLite 删）。

2. **Java 同事后端** = 正式 H5 数据后端 + Shopify 代理 + 结账编排 + webhook 接收（另一套，与 feed server 无关）。

3. **Shopify** = 独立店铺（另一兄弟用 Codex 写），多国每国一个店。H5 只做浏览/列表/自有详情/加购/确认订单 → 点"去支付"跳 Java `POST /shopify/checkout` → Flutter WebView 打开 Shopify 结账。

---

## 4. 已完成功能（进度）

| 功能 | 说明 | commit |
|---|---|---|
| 车型体系统一 | 提取 11 个在售车型（电摩 P5/P8/P7、电助力 P6/P5/P4/P2、电动滑板车 F2/F1/P1/P3），统一数据源 `src/data/carModels.js`，发现 chips / 发布选择 / 广场展示共用；同名 P5 用系列前缀区分 | `c1e3a22` |
| 车型简化为代号 | label 去掉"电摩/电助力/滑板车"前缀，按字母序 F1 F2 P1 P2 P3 P4 P5 P5 P6 P7 P8 | `cade831` |
| 车型选择 UI | 先露出默认项 + 4~5 款 chip（一键选中），超出进「更多」底部弹层（`ModelPicker.vue`，单行横滚适配手机）；发现/发布一致 | `9b763a4`→`2e18cdd` |
| 发布图片上传 | file input → canvas 压缩 → base64（≤1MB 单张 / ≤9 张 / 可删），经 `POST /feed` 的 `images` 字段 | `c1e3a22` |
| 精选下拉刷新 + topbar 对齐 | 精选加下拉刷新（与发现一致）；topbar 去 sticky、padding 14/16/8、active `#000`，动作图标统一 24×24 | `5366b76`/`6ad35a0`/`cade831` |
| 下拉刷新 = 热更新 | `src/utils/hotUpdate.js`：doRefresh 时对比线上 `index.html` 的 JS 包 hash，有新版（样式/逻辑）则 `location.reload()` 整页重载，否则只刷数据；发现/精选/详情三页接入 | `5c165d9` |
| 评论跨端可见 | 详情页加 `fetchComments`，打开时 + 发完评论后都从后端取最新列表（失败回落本地 seed） | `ac1485a` |
| 动态详情页下拉刷新 | 复用发现页手势，仅刷评论+点赞数（有新版仍整页 reload）；指示器在 sticky 顶栏下方 | `e162bed` |
| 排序图标移除 | 发现页筛选栏右侧排序小标去掉 | `2e18cdd` |

---

## 5. 关键文件清单

| 文件 | 作用 |
|---|---|
| `src/data/carModels.js` | 11 车型统一数据源（CAR_MODELS / CAR_MODEL_LABELS / 按系列分组） |
| `src/data/mock.js` | mock 动态流 / 筛选 / 广场展示（已接入 carModels） |
| `src/components/ModelPicker.vue` | 车型 chip + 更多 底部弹层（通用） |
| `src/components/MomentCard.vue` / `FeedCard.vue` | 动态卡片（图片 base64 直渲，标签 `#车型`） |
| `src/views/DiscoverView.vue` | 发现页（三 tab + 车型筛选 + 下拉刷新 + 热更新） |
| `src/views/FeaturedView.vue` | 精选页（下拉刷新 + topbar 对齐） |
| `src/views/PublishView.vue` | 发布页（图片上传 + 车型选择） |
| `src/views/FeedDetailView.vue` | 动态详情（评论列表 + 下拉刷新） |
| `src/api/feed.js` | feed 数据层（FEED_API=pxid-api.appin.site，含 fetchComments/commentFeed） |
| `src/utils/hotUpdate.js` | 热更新检测（对比线上 JS hash） |
| `src/store/publish.js` | 本地发布存储（localStorage 兜底） |

---

## 6. 坤哥的硬性要求（接手必看）

- **组件化铁律**：TopBar / TabBar / Card / 筛选条等跨页通用件必须抽组件复用，**不许每页各写一份导致小差异**。改之前先 `ls src/components/` 看有没有可复用。
- **回复风格**：结论 + 3 条以内要点，别堆模板/多级标题/大段说明。
- **别把负担推回给用户**：东西他给的就存好、维护好；需要他额外记忆/操作的设计一律重新想。
- **移动端适配**：坤哥手机 vivo x300pro（宽屏），chip 必须单行横滚不换行、字号留余量。
- **积分/费用**：截图类操作贵（Playwright 起无头 Chromium ≈100 积分/张），需渲染先报量；日常对话 token 消耗是基线。

---

## 7. 遗留 / 待办

- 广场 11 款车封面是占位图（`plaza_*.jpg` / `feed_*.jpg`），待 Shopify 真实商品图替换。
- **Shopify 对接阻塞（Codex 兄弟侧）**：Storefront Token 未确认、约定 Collection/Metafield 缺失、return_to 需改 Checkout Kit——H5 暂无需改，等补齐联调。
- 评论 DELETE 接口后端未实现（测试数据只能 SSH 进 SQLite 删）。
- gitlab `main` 与 ECS `master` 分叉，勿自行合并（见 §2）。

---

## 8. 接手三步

1. 改代码 → `node node_modules/vite/bin/vite.js build` → 部署 ECS（§2 命令）。
2. `git add` 相关文件 → `git commit` → `git push origin master` + `git push gitlab master:master`。
3. 手机浏览器或 App 内下拉刷新验证（热更新已接，样式改动下拉即见）。

> 验证后端在线：`curl https://pxid-api.appin.site/feed/1/comments` 应返回 `{"code":0,"data":{"list":[...]}}`。

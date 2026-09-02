# 按用户 ID 取公开资料 — Flutter / ToC 接口需求（给北帆）

> 目的：根治「个人主页顶部头像与列表作者头像不一致」等系统性资料失真。
> 根因一句话：**H5 没有"按用户 ID 取他人资料"的真源接口可用，被迫自建 `user_profiles` 影子表，该表与真源（ToC/Flutter）无实时同步、永远滞后**。

## 🔴 现状（事实）
- H5 动态列表头像来源：后端 `rowToFeed` → `resolveProfile` 查本地 `user_profiles` 表（pxid-feed-server 内 SQLite）。
- 资料真源：ToC 后端 / Flutter App。
- 当前可用接口：
  - 桥 `getUserInfo()` —— **无参**，只返当前登录用户（`INTEGRATION.md` §1.2）。
  - ToC `GET /user/me` —— 只返当前登录用户（ToC 规范 §2）。
  - 两者**都不支持按 ID 取他人资料**。
- H5 进任意用户主页时，路由 `#/user/<id>` 已持有作者 ID，但无对应真源查询能力。

## 🟠 问题 / 卡点
- 本地 `user_profiles` 与真源无实时同步机制，App 改头像只动真源 → 该表不变。
- 顶部头像：前端直接读 Flutter 实时值 → 正确；列表头像：读影子表 → 旧值。同页两个头像对不上。
- 评论、通知、他人主页头像同源失真，**这是资料模型缺陷，不是单个账号、不是前端缓存**。

## 🟡 需要北帆 / ToC 提供
能「按用户 ID 取公开资料（头像 / 昵称 / 车型）」的能力——两个方案二选一或都做（推荐先 A 止血、B 根治）。

## 🟢 怎么做（契约细节）

### 方案 A — 桥层（前端止血，H5 自己就能立刻见效）
桥新增方法（风格对齐 `getUserInfo`）：

| 方法 | 签名 | 优先级 | 调用场景 | Flutter 职责 |
| --- | --- | --- | --- | --- |
| `getUserInfoById` | `(userId: string) => Promise<{nickname?: string, avatar?: string, carModel?: string} \| null>` | P0 | 动态列表 / 评论 / 通知 / 他人主页，按作者 ID 取实时资料覆盖后端影子值 | 按 `userId` 去 ToC 真源取该用户公开资料；查不到返 `null`；**`avatar` 必须 https 完整 URL**（同 `getUserInfo` 约定，禁止 http 明文） |

前端用法：拿到列表后，对每个 `memberUserId` 调 `getUserInfoById` 覆盖 `item.avatar/item.author`。

### 方案 B — ToC 后端层（根治，推荐最终态）
ToC 新增公开接口：

```
GET /user/{memberUserId}
→ 200 { memberUserId, nickname, avatar, carModel }
→ 404 用户不存在
```
- 公开或受限 token 均可，返回该用户公开资料。
- H5 后端 `resolveProfile` 改为：**优先按作者 `member_user_id` 调此接口取实时值（带 5min 缓存）**，拿不到才回退 `feeds` 快照 / 空态。**彻底废弃 `user_profiles` 作为头像来源**。

## 🔵 最终效果 / 验收
- 任意用户在 App 改头像 → 进自己/他人主页、动态列表、评论、通知，头像全程一致，零滞后。
- 验收清单：真机改头像后，以上各处头像**立即**同步；不再出现「顶部新、列表旧」。
- 联调通过后，H5 删除 `user_profiles` 影子表依赖，资料唯一真源收敛到 ToC。

---
*提出方：八戒（H5 侧）｜日期：2026-09-01｜待北帆确认方案 A/B 取舍与排期*

// ============================================================
// PXID ToC 发帖后端服务（论坛完全体 + 运营后台 v1.2）
// ------------------------------------------------------------
// 技术栈：Node.js + Express + SQLite（better-sqlite3，零运维单文件库）
// 用户侧接口：docs/PXID_ToC_后端接口规范.md §3（GET/POST /feed、详情、点赞、评论）
// 运营侧接口：/admin/* 需 Bearer ADMIN_TOKEN
//   - 官方发帖 / 编辑 / 软删 / 置顶 / 上下架 / 定时发布
//   - Banner 配置 CRUD、广场四宫格跳转配置 CRUD
// 部署：ECS pm2 常驻，Nginx 反代 /api/feed 与 /admin/*
// ============================================================

const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const Database = require('better-sqlite3')
const multer = require('multer')
const sanitizeHtml = require('sanitize-html')
const moderation = require('./moderation')

// 加载 .env / .env.local（若项目安装 dotenv；未装则静默跳过，env 仍可由系统/pm2 注入）
// 路径按 server.js 所在目录显式解析（server/ 上级 = 项目根），避免因 CWD 不同读不到凭证
const _envRoot = path.join(__dirname, '..')
try {
  require('dotenv').config({ path: path.join(_envRoot, '.env') })
  require('dotenv').config({ path: path.join(_envRoot, '.env.local') })
} catch (_) {}

const app = express()
app.use(express.json({ limit: '5mb', verify: (req, res, buf) => { if (req.path && (req.path.indexOf('/mall-api/webhook') === 0 || req.path.indexOf('/ban-sync/from-toc') === 0)) req.rawBody = buf } }))

// ---- 安全加固：信任反代，取真实客户端 IP 供限流/审计 ----
app.set('trust proxy', true)

// ---- CORS：仅反射自家 H5 域名；未知来源不回退 *（原生 WebView 不受 CORS 限制）----
app.use((req, res, next) => {
  const origin = req.headers.origin || ''
  const allow = /^https?:\/\/(.*\.)?appin\.site$/.test(origin) || /^https?:\/\/preview(-[a-z0-9]+)?\.appin\.site$/.test(origin)
  if (allow) res.setHeader('Access-Control-Allow-Origin', origin)
  // 非允许来源：不设置 CORS 头（不回退 *），浏览器同源策略即拦截跨域读取
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  // 基础安全响应头
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ---- 限流（内存滑动窗口，单实例足够；多实例可换 Redis）----
const rlBuckets = new Map()
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) || req.ip || req.socket.remoteAddress || 'unknown'
    const key = ip + '|' + req.method + '|' + req.path
    const now = Date.now()
    const rec = rlBuckets.get(key)
    if (!rec || now - rec.start > windowMs) {
      rlBuckets.set(key, { start: now, count: 1 })
      return next()
    }
    rec.count++
    if (rec.count > max) return res.status(429).json(err(429, '请求过于频繁，请稍后再试'))
    next()
  }
}
// 敏感写接口按路径定制阈值（其余 POST/PUT/DELETE 走默认）
function pickLimit(path, method) {
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE') return null
  if (path === '/auth/token') return rateLimit(60 * 1000, 10)
  if (path.endsWith('/report')) return rateLimit(60 * 1000, 10)
  if (path === '/media/upload') return rateLimit(60 * 1000, 30)
  if (path === '/feed') return rateLimit(60 * 1000, 30)
  if (path === '/follow') return rateLimit(60 * 1000, 60)
  return rateLimit(60 * 1000, 120)
}
app.use((req, res, next) => {
  const lim = pickLimit(req.path, req.method)
  if (!lim) return next()
  lim(req, res, next)
})

// ---- 数据库 ----
const db = new Database(path.join(__dirname, 'feed.db'))
db.pragma('journal_mode = WAL')

// feeds 原结构（兼容旧库）
db.exec(`
CREATE TABLE IF NOT EXISTS feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL DEFAULT '骑友',
  device_id TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  car_model TEXT NOT NULL DEFAULT '',
  likes INTEGER NOT NULL DEFAULT 0,
  lat REAL,
  lng REAL,
  mentions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  nickname TEXT NOT NULL DEFAULT '骑友',
  avatar TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`)

// ---- 字段迁移（feeds 加运营字段，兼容旧数据，幂等）----
const feedCols = db.prepare('PRAGMA table_info(feeds)').all().map((c) => c.name)
function addCol(name, def) {
  if (!feedCols.includes(name)) db.exec(`ALTER TABLE feeds ADD COLUMN ${name} ${def}`)
}
addCol('kind', "TEXT NOT NULL DEFAULT 'user'") // user | official
addCol('status', "TEXT NOT NULL DEFAULT 'published'") // published | offline | scheduled | deleted
addCol('pinned', 'INTEGER NOT NULL DEFAULT 0') // 0/1 置顶
addCol('scheduled_at', 'TEXT') // 可空，未来时间=定时发布
addCol('updated_at', 'TEXT')
addCol('operator', "TEXT NOT NULL DEFAULT ''") // 操作人（审计）
addCol('cover', "TEXT NOT NULL DEFAULT ''") // 封面图 URL
addCol('region_code', "TEXT NOT NULL DEFAULT 'US'") // 地区（CN/BR/US，US 为全球公共池，对齐 ToC）
addCol('lat', 'REAL') // 发布定位纬度（附近 LBS 用）
addCol('lng', 'REAL') // 发布定位经度
addCol('mentions', "TEXT NOT NULL DEFAULT '[]'") // @话题：被提及用户昵称数组 JSON
addCol('video_url', "TEXT NOT NULL DEFAULT ''") // 视频 objectKey（统一 storage 层：local=uploads/xxx.mp4，oss=media/xxx.mp4）
addCol('cover_url', "TEXT NOT NULL DEFAULT ''") // 视频封面 objectKey
addCol('member_user_id', "TEXT NOT NULL DEFAULT ''") // ToC 真身份（通知路由/自检维度；演示态为空）

// ---- 精选（Shopify）订单回流映射表 ----
db.exec(`
CREATE TABLE IF NOT EXISTS d_mall_order_map (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',
  total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  fulfillment TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`)

// ---- 运营配置表 ----
db.exec(`
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'on',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plaza_grid (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'on',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'on',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_device TEXT NOT NULL,
  followee_device TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(follower_device, followee_device)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  reporter_device TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  handled_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comment_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  parent_comment_id INTEGER NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  reply_to TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  engine TEXT NOT NULL DEFAULT '',      -- local / aliyun
  result TEXT NOT NULL DEFAULT '',      -- pass / block
  detail TEXT NOT NULL DEFAULT '',      -- 命中词 / 阿里云标签
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS banned_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  operator TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS banned (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL DEFAULT '',
  member_user_id TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',  -- active / lifted
  lifted_at TEXT,
  created_at TEXT NOT NULL
);

-- 活动模块扩表（厂商活动全流程：报名/核销/分享/奖品）
CREATE TABLE IF NOT EXISTS activity_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  bike_model TEXT NOT NULL DEFAULT '',
  checkin_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'joined',   -- joined / cancelled
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  signup_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  operator_device TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'scan',     -- scan / geo / manual
  lat REAL, lng REAL,
  checked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT '',        -- wechat / moments / poster
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  prize TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / sent
  created_at TEXT NOT NULL
);
`)

// ---- 互动消息（点赞/评论/关注/系统）通知表 ----
db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL DEFAULT '',     -- 接收人（被点赞/评论/关注者）
  type TEXT NOT NULL DEFAULT 'system',    -- like | comment | follow | system
  actor_device TEXT NOT NULL DEFAULT '',  -- 触发人 deviceId（系统消息可为空）
  actor_name TEXT NOT NULL DEFAULT '',
  actor_avatar TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT '',   -- feed | activity | user
  target_id TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,        -- 0/1
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_device ON notifications(device_id, id DESC);
`)
// 真身份通知适配：接收者支持 member_user_id（ToC 维度），与 device_id 并存；兼容已上线旧库
try { db.exec("ALTER TABLE notifications ADD COLUMN member_user_id TEXT NOT NULL DEFAULT ''") } catch (_) {}
try { db.exec("CREATE INDEX IF NOT EXISTS idx_notif_member ON notifications(member_user_id, id DESC)") } catch (_) {}

// 启动种子：演示互动消息（device_id='__demo__' 对所有登录用户可见，便于先看效果）
;(function seedDemoNotifications() {
  try {
    const cnt = db.prepare("SELECT COUNT(*) c FROM notifications WHERE device_id='__demo__'").get().c
    if (cnt > 0) return
    const rows = [
      ['like', 'd_lily', 'Lily', '', 'feed', '12', '赞了你的动态', '刚刚骑了一段超棒的路线！'],
      ['comment', 'd_max', 'Max', '', 'feed', '12', '评论了你的动态', '这车看着真帅，求链接~'],
      ['follow', 'd_nora', 'Nora', '', 'user', '', '关注了你', ''],
      ['system', '', 'PXID 官方', '', 'system', '', '欢迎加入 PXID 社区', '完成签到可领取新人积分礼包'],
    ]
    const ins = db.prepare('INSERT INTO notifications (device_id, type, actor_device, actor_name, actor_avatar, target_type, target_id, content, read, created_at) VALUES (?,?,?,?,?,?,?,?,0,?)')
    rows.forEach((r, i) => ins.run('__demo__', r[0], r[1], r[2], r[3], r[4], r[5], r[6] + (r[7] ? '：' + r[7] : ''), fmtAgo(i)))
  } catch (e) {
    console.error('[pxid-feed] seed demo notifications failed:', e.message || e)
  }
})()
function fmtAgo(min) {
  const d = new Date(Date.now() - min * 60000)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

// ---- 活动表字段迁移（幂等，兼容旧库）----
const actCols = db.prepare('PRAGMA table_info(activities)').all().map((c) => c.name)
function addActCol(name, def) {
  if (!actCols.includes(name)) db.exec(`ALTER TABLE activities ADD COLUMN ${name} ${def}`)
}
addActCol('type', "TEXT NOT NULL DEFAULT 'offline'")        // online / offline / hybrid
addActCol('location', "TEXT NOT NULL DEFAULT ''")
addActCol('store_id', "TEXT NOT NULL DEFAULT ''")
addActCol('quota', 'INTEGER NOT NULL DEFAULT 0')            // 0=不限
addActCol('signup_count', 'INTEGER NOT NULL DEFAULT 0')
addActCol('prize_desc', "TEXT NOT NULL DEFAULT ''")
addActCol('share_poster', "TEXT NOT NULL DEFAULT ''")
addActCol('checkin_code', "TEXT NOT NULL DEFAULT ''")
addActCol('tags', "TEXT NOT NULL DEFAULT '[]'")
addActCol('region_code', "TEXT NOT NULL DEFAULT 'US'")  // 地区（CN/BR/US，US 为全球公共池，对齐 ToC）

const now = () => new Date().toISOString()
// 上传文件返回的 URL 前缀（ECS 上 nginx 反代后需与实际域名一致）
const API_BASE = process.env.API_BASE || 'https://pxid-api.appin.site'

// 安全解析 JSON 数组：兼容历史逗号串（如 "Tokyo,F2,urban"），避免单行脏数据拖垮整页 feed
function safeJsonArr(s) {
  if (!s) return []
  if (Array.isArray(s)) return s
  if (typeof s !== 'string') return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : [String(s)]
  } catch (e) {
    return s.split(',').map(x => x.trim()).filter(Boolean)
  }
}
function rowToFeed(r) {
  return {
    id: r.id,
    deviceId: r.device_id || '',
    memberUserId: r.member_user_id || '',
    kind: r.kind || 'user',
    itemType: 'moment',
    author: r.nickname,
    avatar: r.avatar,
    title: (r.content || '').slice(0, 20) || '我的动态',
    content: r.content,
    images: safeJsonArr(r.images),
    tags: safeJsonArr(r.tags),
    carModel: r.car_model,
    cover: (function(){ const c=r.cover||'', imgs=safeJsonArr(r.images); return c||(imgs.length?imgs[0]:''); })(),
    likes: r.likes,
    isLiked: false,
    comments: db.prepare('SELECT COUNT(*) c FROM comments WHERE feed_id=?').get(r.id).c,
    createdAt: r.created_at,
    time: r.created_at,
    followed: false,
    focusCar: r.car_model,
    status: r.status,
    pinned: !!r.pinned,
    scheduledAt: r.scheduled_at || '',
    updatedAt: r.updated_at || '',
    operator: r.operator || '',
    regionCode: r.region_code || 'US',
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    mentions: safeJsonArr(r.mentions).map((m) => String(m)),
    videoUrl: r.video_url || '',
    videoCover: r.cover_url || '',
  }
}

function rowToActivity(r) {
  return {
    id: r.id,
    title: r.title,
    cover: r.cover,
    url: r.url,
    content: r.content,
    type: r.type || 'offline',
    location: r.location || '',
    storeId: r.store_id || '',
    quota: r.quota || 0,
    signupCount: r.signup_count || 0,
    prizeDesc: r.prize_desc || '',
    sharePoster: r.share_poster || '',
    checkinCode: r.checkin_code || '',
    tags: (() => { try { return JSON.parse(r.tags || '[]') } catch (e) { return [] } })(),
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    sort: r.sort || 0,
    status: r.status || 'on',
    region_code: r.region_code || 'US',
    createdAt: r.created_at || ''
  }
}

// ---- 统一响应体 ----
const ok = (data) => ({ code: 0, message: '', data })
const err = (code, message) => ({ code, message, data: null })

// ---- 定时发布调度：每分钟把到点的 scheduled 转 published ----
setInterval(() => {
  const t = now()
  try {
    const due = db
      .prepare("UPDATE feeds SET status='published', updated_at=? WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?")
      .run(t, t)
    if (due.changes) console.log(`[pxid-feed] ${due.changes} 条定时帖已自动上架`)
  } catch (e) {
    /* 忽略 */
  }
}, 60 * 1000)

// ============================================================
// 用户侧接口（§3）
// ============================================================

// ---- Token 签发（H5 预览/mock 模式用；真机由 ToC Flutter 用同一 secret 直接签发）----
// 安全约束（R1 + P0-1 根因修复）：
//   - 禁止客户端自报 email（R1）：email 是订单/身份归属键，允许自报 = 可替任意 email 签 token 绕过订单鉴权
//   - 禁止客户端自报 deviceId（P0-1）：deviceId 是活动/订单的身份键，旧逻辑接受客户端自报 →
//     攻击者可自签任意受害者 deviceId 的合法 token → 击穿 R2（/activities/me 枚举他人报名/核销码）、P0-3/P0-4
//     → 现改为**服务端生成** deviceId，客户端不可选，token 内 deviceId 不可枚举他人
//   - 真机（Flutter）deviceId 由原生侧持有（可信），不经由本端点；本端点仅服务 H5 匿名预览
//   - 限频：同一 IP 每分钟最多 30 次（deviceId 已不可信，不再作为限频维度；trust proxy 未开启，req.ip 为代理 IP）
app.post('/auth/token', (req, res) => {
  if (!USER_TOKEN_SECRET) {
    return res.status(500).json(err(500, '服务端未配置 USER_TOKEN_SECRET（fail-closed）'))
  }
  // 安全：deviceId 由服务端生成，客户端不可自报（P0-1 根因修复）
  const deviceId = 'd_' + crypto.randomBytes(16).toString('hex')
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || ''
  const minute = Math.floor(Date.now() / 60000)
  const key = 'tok:' + ip
  // 惰性过期：先清理上一分钟的旧桶，避免无限增长（替代原 _tokenRate.size>500 全局 clear，防止限频被一次性重置）
  for (const [k, b] of _tokenRate) if (b.window !== minute) _tokenRate.delete(k)
  const bucket = _tokenRate.get(key)
  if (bucket && bucket.window === minute && bucket.n >= 30) {
    return res.status(429).json(err(429, '签发太频繁，请稍后再试'))
  }
  if (!bucket || bucket.window !== minute) {
    _tokenRate.set(key, { window: minute, n: 1 })
  } else {
    bucket.n++
  }
  try {
    const token = issueUserToken({
      deviceId,
      // 7 天有效期；H5 预览/mock 模式足够，真机 token 由 Flutter 控制过期时间
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
    // 返回 deviceId 供需要服务端身份标识时使用（H5 发帖/报名后端均从 token 取，前端无需额外处理）
    res.json(ok({ token, deviceId, expiresIn: 7 * 24 * 60 * 60 }))
  } catch (e) {
    console.error('[pxid-feed] issue token failed:', e.message || e)
    res.status(500).json(err(500, '签发 token 失败'))
  }
})

// ---- 动态流 ----
app.get('/feed', (req, res) => {
  const { tab = 'dynamic', carModel, page = 1, pageSize = 20, offset, followerDevice, region, near, radius = 50 } = req.query
  const cm = carModel && carModel !== '全部' && carModel !== '最新' ? carModel : ''
  // 地区过滤：CN/BR/US，US 为全球公共池；请求某区时显示该区 + US 帖（三区均可见全球内容）
  const reg = String(region || '').toUpperCase()
  const regFiltered = ['CN', 'BR', 'US'].includes(reg) ? reg : ''
  const nowT = now()
  let w, args
  if (tab === 'dynamic' && followerDevice) {
    // 关注流：官方帖 + 我关注的人的帖子（kind='official' 始终可见）
    w = `WHERE status='published' AND (scheduled_at IS NULL OR scheduled_at <= ?) AND (kind='official' OR device_id IN (SELECT followee_device FROM follows WHERE follower_device=?))`
    args = [nowT, String(followerDevice)]
    if (cm) { w += ' AND car_model = ?'; args.push(cm) }
  } else {
    w = `WHERE status='published' AND (scheduled_at IS NULL OR scheduled_at <= ?)`
    args = [nowT]
    if (cm) { w += ' AND car_model = ?'; args.push(cm) }
  }
  if (regFiltered) { w += " AND region_code IN (?, 'US')"; args.push(regFiltered) }
  // 附近 LBS：near=lat,lng（半径 radius km，默认 50）。SQLite 无三角函数，JS 算距离，数据量小内存筛
  let nearLat = null, nearLng = null
  const nearRad = Math.max(0.1, Number(radius) || 50)
  if (near && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(String(near))) {
    const p = String(near).split(',').map(Number)
    nearLat = p[0]; nearLng = p[1]
  }
  if (nearLat != null) {
    const cand = db.prepare(`SELECT * FROM feeds ${w}`).all(...args)
    const R = 6371, rad = (d) => (d * Math.PI) / 180
    const withDist = cand
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => {
        const dLat = rad(r.lat - nearLat), dLng = rad(r.lng - nearLng)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(nearLat)) * Math.cos(rad(r.lat)) * Math.sin(dLng / 2) ** 2
        return { r, d: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) }
      })
      .filter((x) => x.d <= nearRad)
      .sort((a, b) => a.d - b.d)
    const ps = Math.min(50, Math.max(1, parseInt(pageSize) || 20))
    const off = offset !== undefined ? Math.max(0, parseInt(offset) || 0) : (Math.max(1, parseInt(page) || 1) - 1) * ps
    const rows = withDist.slice(off, off + ps).map((x) => x.r)
    return res.json(ok({ total: withDist.length, list: rows.map(rowToFeed), tab, near: true }))
  }
  const total = db.prepare(`SELECT COUNT(*) c FROM feeds ${w}`).get(...args).c
  const ps = Math.min(50, Math.max(1, parseInt(pageSize) || 20))
  // 分页：前端动态流用 offset，其余用 page；二者兼容
  const off = offset !== undefined ? Math.max(0, parseInt(offset) || 0) : (Math.max(1, parseInt(page) || 1) - 1) * ps
  // 推荐：当前地区优先 → 置顶 → 官方帖 → 最新
  const orderBy = tab === 'recommend'
    ? `(CASE WHEN region_code='${regFiltered}' THEN 0 ELSE 1 END), pinned DESC, (CASE WHEN kind='official' THEN 1 ELSE 0 END) DESC, id DESC`
    : 'id DESC'
  const rows = db
    .prepare(`SELECT * FROM feeds ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...args, ps, off)
  res.json(ok({ total, list: rows.map(rowToFeed), tab }))
})

// ---- 活跃用户（@话题选人用；返回最近发帖去重的 deviceId/nickname/avatar）----
app.get('/feed/users', (req, res) => {
  const { region } = req.query
  const reg = ['CN', 'BR', 'US'].includes(String(region || '').toUpperCase()) ? String(region).toUpperCase() : ''
  let w = `WHERE status='published'`
  const args = []
  if (reg) { w += " AND region_code IN (?, 'US')"; args.push(reg) }
  const rows = db.prepare(`SELECT device_id, nickname, avatar FROM feeds ${w} ORDER BY id DESC LIMIT 300`).all(...args)
  const seen = new Set()
  const list = []
  for (const r of rows) {
    if (!r.device_id || seen.has(r.device_id)) continue
    seen.add(r.device_id)
    list.push({ deviceId: r.device_id, nickname: String(r.nickname || '骑友'), avatar: r.avatar || '' })
    if (list.length >= 30) break
  }
  res.json(ok({ list }))
})

// ---- 发帖（用户侧，kind=user）----
app.post('/feed', requireAuth, (req, res) => {
  const { content, images = [], carModel = '', tags = [], nickname = '骑友', avatar = '', region = 'US', lat, lng, mentions = [], video = '', cover = '' } = req.body || {}
  // 安全：deviceId 以 token 内可信值为准（P0-1/P1-4），未配 USER_TOKEN_SECRET 时降级用 body 传值
  const deviceId = (USER_TOKEN_SECRET && req.user && req.user.deviceId) || String(req.body.deviceId || '')
  const memberUserId = (req.user && req.user.memberUserId) || ''
  const text = String(content || '').trim()
  if (!text) return res.json(err(1, '内容不能为空'))
  if (text.length > 1000) return res.json(err(1, '内容不能超过 1000 字'))
  // 内容安全①：本地词库同步拦截（内容+标签+昵称联合检测，命中即拒绝发布）
  const mc = moderation.checkText(text + ' ' + (tags || []).join(' ') + ' ' + String(nickname || ''))
  if (!mc.pass) {
    moderation.logLocalBlock(db, 0, text, mc.words)
    return res.json(err(1, '内容包含违禁词「' + mc.words.slice(0, 5).join('、') + '」，请修改后发布'))
  }
  const reg = ['CN', 'BR', 'US'].includes(String(region).toUpperCase()) ? String(region).toUpperCase() : 'US'
  const info = db
    .prepare(
      `INSERT INTO feeds (nickname, device_id, member_user_id, avatar, content, images, tags, car_model, region_code, lat, lng, mentions, video_url, cover_url, created_at, kind, status, operator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'published', '')`
    )
    .run(
      String(nickname).slice(0, 20),
      String(deviceId || ''),
      String(memberUserId || ''),
      String(avatar || ''),
      text,
      JSON.stringify((images || []).slice(0, 9)),
      JSON.stringify((tags || []).slice(0, 5)),
      String(carModel || ''),
      reg,
      lat != null && lat !== '' ? Number(lat) : null,
      lng != null && lng !== '' ? Number(lng) : null,
      JSON.stringify(Array.isArray(mentions) ? mentions.slice(0, 20) : []),
      String(video || ''),
      String(cover || ''),
      now()
    )
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(info.lastInsertRowid)
  // 内容安全②：阿里云异步复核（配置 AK 后生效；命中高危自动下架）
  moderation.reviewFeed(row, db)
  // 视频异步转码（增强，可选）：有 ffmpeg 才转，失败静默，不影响发布
  if (video) transcodeVideoIfAvailable(row.id, video)
  res.json(ok(rowToFeed(row)))
})

// ---- 详情 ----
app.get('/feed/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  res.json(ok(rowToFeed(row)))
})

// ---- 点赞（切换）----
app.post('/feed/:id/like', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  const deviceId = (req.user && req.user.deviceId) || ''
  const memberUserId = (req.user && req.user.memberUserId) || ''
  const { liked = true, nickname = '', avatar = '' } = req.body || {}
  const likes = row.likes + (liked ? 1 : -1)
  db.prepare('UPDATE feeds SET likes=? WHERE id=?').run(Math.max(0, likes), row.id)
  // 互动消息：点赞通知作者（不通知自己；自检双维度：device 演示态 / memberUserId ToC 态）
  // 修复：ToC 生产模式下 deviceId 恒为空串，旧逻辑 row.device_id !== deviceId 恒真 → 自己赞自己也通知
  const isSelf = (row.device_id && deviceId && row.device_id === deviceId) || (row.member_user_id && memberUserId && row.member_user_id === memberUserId)
  if (liked && !isSelf && (row.device_id || row.member_user_id)) {
    emitNotification({ deviceId: row.device_id, memberUserId: row.member_user_id, type: 'like', actorDevice: deviceId, actorName: String(nickname || ''), actorAvatar: String(avatar || ''), targetType: 'feed', targetId: row.id, content: '赞了你的动态' })
  }
  res.json(ok({ isLiked: !!liked, likes: Math.max(0, likes) }))
})

// ---- 评论 ----
app.post('/feed/:id/comment', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  const { content, nickname = '骑友', avatar = '', parentCommentId = 0, replyTo = '' } = req.body || {}
  const text = String(content || '').trim()
  if (!text) return res.json(err(1, '评论内容不能为空'))
  // 内容安全①：本地词库同步拦截（评论同样「有违禁词发不出」）
  const mc = moderation.checkText(text + ' ' + String(nickname || ''))
  if (!mc.pass) {
    moderation.logLocalBlock(db, row.id, text, mc.words)
    return res.json(err(1, '评论包含违禁词「' + mc.words.slice(0, 5).join('、') + '」，请修改后发送'))
  }
  // 楼中楼：回复某条一级评论 → 写 comment_replies
  if (parentCommentId) {
    const info = db
      .prepare(`INSERT INTO comment_replies (feed_id, parent_comment_id, nickname, avatar, content, reply_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(row.id, Number(parentCommentId) || 0, String(nickname).slice(0, 20), String(avatar || ''), text.slice(0, 500), String(replyTo || '').slice(0, 20), now())
    const c = db.prepare('SELECT * FROM comment_replies WHERE id=?').get(info.lastInsertRowid)
    res.json(ok({ id: c.id, author: c.nickname, avatar: c.avatar, content: c.content, createdAt: c.created_at, time: c.created_at }))
    return
  }
  const info = db
    .prepare(`INSERT INTO comments (feed_id, nickname, avatar, content, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(row.id, String(nickname).slice(0, 20), String(avatar || ''), text.slice(0, 500), now())
  const c = db.prepare('SELECT * FROM comments WHERE id=?').get(info.lastInsertRowid)
  const deviceId = (req.user && req.user.deviceId) || ''
  const memberUserId = (req.user && req.user.memberUserId) || ''
  // 互动消息：评论通知作者（不通知自己；自检双维度：device 演示态 / memberUserId ToC 态）
  const isSelf = (row.device_id && deviceId && row.device_id === deviceId) || (row.member_user_id && memberUserId && row.member_user_id === memberUserId)
  if (!isSelf && (row.device_id || row.member_user_id)) {
    emitNotification({ deviceId: row.device_id, memberUserId: row.member_user_id, type: 'comment', actorDevice: deviceId, actorName: String(nickname || ''), actorAvatar: String(avatar || ''), targetType: 'feed', targetId: row.id, content: '评论了你的动态：' + text.slice(0, 40) })
  }
  res.json(ok({ id: c.id, author: c.nickname, avatar: c.avatar, content: c.content, createdAt: c.created_at, time: c.created_at }))
})

app.get('/feed/:id/comments', (req, res) => {
  const rows = db.prepare('SELECT * FROM comments WHERE feed_id=? ORDER BY id ASC').all(req.params.id)
  const replyRows = db.prepare('SELECT * FROM comment_replies WHERE feed_id=? ORDER BY id ASC').all(req.params.id)
  const replyMap = {}
  replyRows.forEach((r) => {
    ;(replyMap[r.parent_comment_id] = replyMap[r.parent_comment_id] || []).push(r)
  })
  res.json(ok({
    list: rows.map((c) => {
      const replies = (replyMap[c.id] || []).map((r) => ({
        id: r.id,
        author: r.nickname,
        avatar: r.avatar,
        content: r.content,
        replyTo: r.reply_to,
        createdAt: r.created_at,
        time: r.created_at,
        likes: 0,
        isLiked: false,
      }))
      return { id: c.id, author: c.nickname, avatar: c.avatar, content: c.content, createdAt: c.created_at, time: c.created_at, replies }
    }),
  }))
})

// ============================================================
// 互动消息（通知）接口
// ============================================================
// 辅助：写入一条通知（永不抛错，避免影响主业务）
function emitNotification({ deviceId = '', memberUserId = '', type, actorDevice = '', actorName = '', actorAvatar = '', targetType = '', targetId = '', content = '' }) {
  try {
    if (!deviceId && !memberUserId) return
    db.prepare(
      'INSERT INTO notifications (device_id, member_user_id, type, actor_device, actor_name, actor_avatar, target_type, target_id, content, read, created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?)'
    ).run(String(deviceId || ''), String(memberUserId || ''), type, actorDevice, actorName, actorAvatar, targetType, String(targetId || ''), String(content || ''), now())
  } catch (e) {
    console.error('[pxid-feed] emitNotification failed:', e.message || e)
  }
}

// 可见通知范围：真身份(member_user_id) + 演示态(device_id) + 全局演示(__demo__)
function visibleNotifClause(memberUserId, device) {
  const parts = []
  const args = []
  if (memberUserId) { parts.push('member_user_id = ?'); args.push(memberUserId) }
  if (device) { parts.push('device_id = ?'); args.push(device) }
  parts.push("device_id = '__demo__'")
  return { clause: parts.join(' OR '), args }
}

// 通知列表
app.get('/notifications', requireAuth, (req, res) => {
  const memberUserId = req.user && req.user.memberUserId
  const device = req.user && req.user.deviceId
  if (!memberUserId && !device) return res.json(err(401, '未授权'))
  const vc = visibleNotifClause(memberUserId, device)
  const rows = db
    .prepare(`SELECT * FROM notifications WHERE ${vc.clause} ORDER BY id DESC LIMIT 100`)
    .all(...vc.args)
  res.json(ok({ list: rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorName: r.actor_name,
    actorAvatar: r.actor_avatar,
    targetType: r.target_type,
    targetId: r.target_id,
    content: r.content,
    read: !!r.read,
    createdAt: r.created_at,
    demo: r.device_id === '__demo__',
  })) }))
})

// 未读计数
app.get('/notifications/unread-count', requireAuth, (req, res) => {
  const memberUserId = req.user && req.user.memberUserId
  const device = req.user && req.user.deviceId
  if (!memberUserId && !device) return res.json(err(401, '未授权'))
  const vc = visibleNotifClause(memberUserId, device)
  const row = db.prepare(`SELECT COUNT(*) c FROM notifications WHERE (${vc.clause}) AND read=0`).get(...vc.args)
  res.json(ok({ count: row.c }))
})

// 标记单条已读（仅自己的，演示数据不标记）
app.post('/notifications/:id/read', requireAuth, (req, res) => {
  const memberUserId = req.user && req.user.memberUserId
  const device = req.user && req.user.deviceId
  if (!memberUserId && !device) return res.json(err(401, '未授权'))
  db.prepare("UPDATE notifications SET read=1 WHERE id=? AND (device_id=? OR member_user_id=?)").run(req.params.id, String(device || ''), String(memberUserId || ''))
  res.json(ok({}))
})

// 全部已读
app.post('/notifications/read-all', requireAuth, (req, res) => {
  const memberUserId = req.user && req.user.memberUserId
  const device = req.user && req.user.deviceId
  if (!memberUserId && !device) return res.json(err(401, '未授权'))
  db.prepare("UPDATE notifications SET read=1 WHERE (device_id=? OR member_user_id=?)").run(String(device || ''), String(memberUserId || ''))
  res.json(ok({}))
})

// ============================================================
// 社区成长体系（签到 / 积分 / 勋章 / 用户组）— 演示阶段以 device_id 锚定
// 真实用户(device_id)优先；无数据时回退 __demo__ 演示态，所有人预览可见完整效果
// ============================================================
const GROUPS = [
  { key: 'g1', min: 0,    name_zh: '新晋骑手', name_en: 'Rookie Rider',  name_pt: 'Iniciante' },
  { key: 'g2', min: 200,  name_zh: '活跃骑手', name_en: 'Active Rider',  name_pt: 'Ciclista Ativo' },
  { key: 'g3', min: 800,  name_zh: '资深骑手', name_en: 'Senior Rider',  name_pt: 'Ciclista Sênior' },
  { key: 'g4', min: 2000, name_zh: '骑行达人', name_en: 'Riding Pro',    name_pt: 'Profissional' },
  { key: 'g5', min: 5000, name_zh: '城市领队', name_en: 'City Captain',  name_pt: 'Capitão' },
]
const MEDAL_DEFS = [
  { code: 'newbie',       icon: '🌟', sort: 1, name_zh: '新人报到', name_en: 'Newcomer',        name_pt: 'Iniciante',       desc_zh: '完成首次签到',   desc_en: 'First check-in',       desc_pt: 'Primeiro check-in' },
  { code: 'streak7',      icon: '🔥', sort: 2, name_zh: '七日不断', name_en: '7-Day Streak',    name_pt: '7 Dias Seguidos', desc_zh: '连续签到满 7 天', desc_en: '7-day sign-in streak', desc_pt: '7 dias consecutivos' },
  { code: 'first_post',   icon: '✍️', sort: 3, name_zh: '首发动态', name_en: 'First Post',       name_pt: 'Primeira Post',   desc_zh: '发布第一条动态', desc_en: 'Publish first post',   desc_pt: 'Publicar primeiro post' },
  { code: 'hundred_likes',icon: '❤️', sort: 4, name_zh: '百赞达成', name_en: '100 Likes',        name_pt: '100 Curtidas',     desc_zh: '动态累计获赞 100', desc_en: '100 likes earned',      desc_pt: '100 curtidas' },
  { code: 'event_master', icon: '🏁', sort: 5, name_zh: '活动达人', name_en: 'Event Pro',        name_pt: 'Mestre de Evento', desc_zh: '参加 3 场活动',   desc_en: 'Join 3 events',        desc_pt: 'Participar de 3 eventos' },
  { code: 'top_reviewer', icon: '🏆', sort: 6, name_zh: '金牌评审', name_en: 'Top Reviewer',     name_pt: 'Top Avaliador',    desc_zh: '完成 10 次评价',  desc_en: '10 reviews done',       desc_pt: '10 avaliações' },
]
function ymd(ts) {
  const d = new Date(ts || Date.now())
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
db.exec(`
CREATE TABLE IF NOT EXISTS growth_points (
  device_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS growth_point_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  delta INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS growth_signins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  sign_date TEXT NOT NULL,
  continuous_days INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(device_id, sign_date)
);
CREATE TABLE IF NOT EXISTS growth_medals (
  code TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL, name_en TEXT NOT NULL, name_pt TEXT NOT NULL,
  desc_zh TEXT NOT NULL, desc_en TEXT NOT NULL, desc_pt TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS growth_user_medals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  medal_code TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  UNIQUE(device_id, medal_code)
);
`)
// 启动种子：勋章定义 + __demo__ 演示数据（幂等）
;(function seedGrowth() {
  try {
    const upsMedal = db.prepare('INSERT OR IGNORE INTO growth_medals (code,name_zh,name_en,name_pt,desc_zh,desc_en,desc_pt,icon,sort) VALUES (?,?,?,?,?,?,?,?,?)')
    MEDAL_DEFS.forEach((m) => upsMedal.run(m.code, m.name_zh, m.name_en, m.name_pt, m.desc_zh, m.desc_en, m.desc_pt, m.icon, m.sort))
    if (!db.prepare("SELECT 1 FROM growth_points WHERE device_id='__demo__'").get()) {
      db.prepare('INSERT INTO growth_points (device_id,balance,updated_at) VALUES (?,?,?)').run('__demo__', 1280, now())
      const contSeq = [1, 2, 3] // 前天1、昨天2、今天3（连续3天）
      ;[2, 1, 0].forEach((off, i) => {
        const d = ymd(Date.now() - off * 86400000)
        db.prepare('INSERT OR IGNORE INTO growth_signins (device_id,sign_date,continuous_days,points,created_at) VALUES (?,?,?,?,?)').run('__demo__', d, contSeq[i], 5, now())
      })
      const upsUm = db.prepare('INSERT OR IGNORE INTO growth_user_medals (device_id,medal_code,earned_at) VALUES (?,?,?)')
      upsUm.run('__demo__', 'newbie', now())
      upsUm.run('__demo__', 'first_post', now())
    }
  } catch (e) {
    console.error('[pxid-feed] seed growth failed:', e.message || e)
  }
})()
function levelOf(balance) {
  let cur = GROUPS[0]
  let idx = 0
  GROUPS.forEach((g, i) => { if (balance >= g.min) { cur = g; idx = i } })
  return { ...cur, index: idx }
}
function getBalance(device) {
  const r = db.prepare('SELECT balance FROM growth_points WHERE device_id=?').get(device)
  return r ? r.balance : 0
}
function addPoints(device, delta, reason) {
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO growth_points (device_id,balance,updated_at) VALUES (?,?,?) ON CONFLICT(device_id) DO UPDATE SET balance=balance+?, updated_at=?').run(device, delta, now(), delta, now())
    db.prepare('INSERT INTO growth_point_logs (device_id,delta,reason,created_at) VALUES (?,?,?,?)').run(device, delta, reason, now())
  })
  tx()
}
function effectiveDevice(deviceId) {
  const has = db.prepare('SELECT 1 FROM growth_points WHERE device_id=?').get(deviceId)
    || db.prepare('SELECT 1 FROM growth_signins WHERE device_id=?').get(deviceId)
    || db.prepare('SELECT 1 FROM growth_user_medals WHERE device_id=?').get(deviceId)
  return has ? deviceId : '__demo__'
}
function buildProfile(deviceId) {
  const eff = effectiveDevice(deviceId)
  const isDemo = eff === '__demo__'
  const pts = db.prepare('SELECT balance FROM growth_points WHERE device_id=?').get(eff)
  const last = db.prepare('SELECT * FROM growth_signins WHERE device_id=? ORDER BY sign_date DESC LIMIT 1').get(eff)
  const owned = db.prepare('SELECT medal_code FROM growth_user_medals WHERE device_id=?').all(eff).map((r) => r.medal_code)
  const balance = pts ? pts.balance : 0
  const today = ymd()
  const continuousDays = last ? last.continuous_days : 0
  const lastSignDate = last ? last.sign_date : ''
  const signedToday = lastSignDate === today
  const g = levelOf(balance)
  const [yy, mm] = today.split('-')
  const monthSigns = db.prepare('SELECT sign_date FROM growth_signins WHERE device_id=? AND sign_date LIKE ?').all(eff, `${yy}-${mm}-%`).map((r) => r.sign_date.slice(8))
  return {
    isDemo,
    balance,
    continuousDays,
    lastSignDate,
    signedToday,
    levelKey: g.key,
    levelIndex: g.index,
    level: { zh: g.name_zh, en: g.name_en, pt: g.name_pt },
    groups: GROUPS.map((x) => ({ key: x.key, min: x.min, name: { zh: x.name_zh, en: x.name_en, pt: x.name_pt } })),
    medals: owned,
    monthSigns,
  }
}
// 成长主页聚合
app.get('/growth/profile', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  res.json(ok(buildProfile(device)))
})
// 签到（幂等：今天已签返回 already）
app.post('/growth/signin', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  const today = ymd()
  const exist = db.prepare('SELECT * FROM growth_signins WHERE device_id=? AND sign_date=?').get(device, today)
  if (exist) return res.json(ok({ signedToday: true, already: true, continuousDays: exist.continuous_days, balance: getBalance(device), todayPoints: 0 }))
  const last = db.prepare('SELECT * FROM growth_signins WHERE device_id=? ORDER BY sign_date DESC LIMIT 1').get(device)
  let cont = 1
  if (last && last.sign_date === ymd(Date.now() - 86400000)) cont = last.continuous_days + 1
  const base = 5
  const bonus = cont % 7 === 0 ? 15 : 0 // 每满 7 天额外 +15
  const pts = base + bonus
  addPoints(device, pts, 'signin')
  db.prepare('INSERT INTO growth_signins (device_id,sign_date,continuous_days,points,created_at) VALUES (?,?,?,?,?)').run(device, today, cont, pts, now())
  res.json(ok({ signedToday: true, already: false, continuousDays: cont, todayPoints: pts, balance: getBalance(device) }))
})
// 勋章墙（全量 + 是否已获得）
app.get('/growth/medals', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  const eff = effectiveDevice(device)
  const owned = new Set(db.prepare('SELECT medal_code FROM growth_user_medals WHERE device_id=?').all(eff).map((r) => r.medal_code))
  const list = MEDAL_DEFS.map((m) => ({
    code: m.code, icon: m.icon, sort: m.sort, owned: owned.has(m.code),
    name: { zh: m.name_zh, en: m.name_en, pt: m.name_pt },
    desc: { zh: m.desc_zh, en: m.desc_en, pt: m.desc_pt },
  }))
  res.json(ok({ isDemo: eff === '__demo__', list }))
})

// ============================================================
// 积分商城（自家后端闭环 2026-08-26）
//   points_products 商品表（status='on' 上架、stock 库存）
//   points_exchanges 兑换记录表（pending 待发货，运营后台改 status + tracking_no 发货）
// ============================================================

// 1) 商品列表 + 当前余额
app.get('/growth/points-products', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  const eff = effectiveDevice(device)
  const rows = db.prepare("SELECT id,name,cover,tags,price,points,stock,description FROM points_products WHERE status='on' ORDER BY sort,id").all()
  const list = rows.map((r) => ({
    ...r,
    tags: r.tags ? String(r.tags).split(',').map((s) => s.trim()).filter(Boolean) : [],
  }))
  res.json(ok({ balance: getBalance(eff), list }))
})

// 2) 兑换（事务：扣积分 + 减库存 + 写记录；积分不足/库存不足返回明确错误）
app.post('/growth/points-exchange', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  const { productId, shippingName, shippingPhone, shippingAddress, note } = req.body || {}
  if (!productId) return res.json(err(400, '缺少商品'))
  if (!shippingName || !shippingPhone || !shippingAddress) return res.json(err(400, '请填写完整收货信息'))
  const eff = effectiveDevice(device)
  const product = db.prepare("SELECT * FROM points_products WHERE id=? AND status='on'").get(productId)
  if (!product) return res.json(err(404, '商品不存在或已下架'))
  if (product.stock <= 0) return res.json(err(400, '库存不足'))
  const balance = getBalance(eff)
  if (balance < product.points) return res.json(err(400, '积分不足，还差 ' + (product.points - balance) + ' 分'))
  const tx = db.transaction(() => {
    // 扣积分（事务内直接 SQL，不调 addPoints 避免嵌套事务）
    db.prepare('INSERT INTO growth_points (device_id,balance,updated_at) VALUES (?,?,?) ON CONFLICT(device_id) DO UPDATE SET balance=balance+?, updated_at=?')
      .run(eff, -product.points, now(), -product.points, now())
    db.prepare('INSERT INTO growth_point_logs (device_id,delta,reason,created_at) VALUES (?,?,?,?)')
      .run(eff, -product.points, 'exchange:' + product.id, now())
    // 减库存（防超卖：stock>0 才扣，0 行影响即失败回滚）
    const upd = db.prepare('UPDATE points_products SET stock=stock-1 WHERE id=? AND stock>0').run(productId)
    if (upd.changes === 0) throw new Error('库存不足')
    // 写兑换记录（pending 待发货）
    const info = db.prepare(`INSERT INTO points_exchanges
      (device_id,product_id,product_name,cover,points_cost,status,shipping_name,shipping_phone,shipping_address,note,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(eff, product.id, product.name, product.cover || '', product.points, 'pending',
        shippingName, shippingPhone, shippingAddress, note || '', now(), now())
    return info.lastInsertRowid
  })
  let id
  try {
    id = tx()
  } catch (e) {
    return res.json(err(400, e && e.message === '库存不足' ? '库存不足' : '兑换失败，请重试'))
  }
  res.json(ok({ exchangeId: id, balance: getBalance(eff) }))
})

// 3) 我的兑换记录（最近 50 条）
app.get('/growth/points-exchanges', requireAuth, (req, res) => {
  const device = (req.user && (req.user.memberUserId || req.user.deviceId)) || ''
  if (!device) return res.json(err(401, '未授权'))
  const eff = effectiveDevice(device)
  const list = db.prepare('SELECT id,product_id,product_name,cover,points_cost,status,tracking_no,created_at FROM points_exchanges WHERE device_id=? ORDER BY id DESC LIMIT 50').all(eff)
  res.json(ok({ list }))
})

// ============================================================
// 运营侧接口（/admin/* 需 Bearer ADMIN_TOKEN）
// ============================================================

const ADMIN_TOKEN = process.env.ADMIN_TOKEN
function requireAdmin(req, res, next) {
  // fail-closed：未配置 env ADMIN_TOKEN 时拒绝所有运营写接口，绝不回退到硬编码明文
  if (!ADMIN_TOKEN) return res.status(500).json(err(500, '服务端未配置 ADMIN_TOKEN（fail-closed）'))
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (t !== ADMIN_TOKEN) return res.status(401).json(err(401, '未授权：缺少有效 Admin Token'))
  next()
}

// ============================================================
// 用户侧 Token 签发与校验（HMAC-SHA256 过渡方案）
// ------------------------------------------------------------
// 设计：
//   - USER_TOKEN_SECRET 由服务端持有，用于签发/校验用户 token
//   - 真机由 ToC Flutter 用同一 secret 签发 JWT/HMAC token，通过 bridge.getToken() 注入 H5
//   - H5 预览/mock 模式通过 POST /auth/token 向后端申请匿名 token
//   - 未配置 USER_TOKEN_SECRET 时回退到旧行为（仅检查 token 非空），但会在首条请求打 warning
// Token 格式：base64url(payload).base64url(hmac)
// ============================================================

const USER_TOKEN_SECRET = process.env.USER_TOKEN_SECRET || ''
let _tokenFallbackWarned = false

// ---- ToC 受限 token 双凭证体系配置（SEC-01，待 ToC 交付凭证后启用）----
// 全部走 process.env（系统/pm2 注入，不写死）。交付 ToC 凭证后填值即生效，无需改代码。
// ToC 受限 token 双凭证体系（SEC-01，按「平台D×ToC 对接规范 V1.1」§5.0.1 HMAC 实现）
// 全部走 process.env（系统/pm2 注入，不写死）。交付 ToC 凭证后填值即生效，无需改代码。
// 接口地址支持两种配置：① 直接给完整 URL（TOC_USERINFO_URL 等）；② 给 TOC_BASE_URL，path 按规范固定拼。
const TOC_BASE_URL = process.env.TOC_BASE_URL || ''                     // ToC 网关地址（如 https://toc.appin.site）
const TOC_CLIENT_ID = process.env.TOC_CLIENT_ID || 'pxid_discover'      // ToC 分配的 client_id（规范固定值）
const TOC_CLIENT_SECRET = process.env.TOC_CLIENT_SECRET || ''           // ToC 分配的 client_secret（仅服务端环境变量，不上线/不进日志）
const TOC_USERINFO_URL = process.env.TOC_USERINFO_URL || (TOC_BASE_URL + '/toc-api/open/discover/userinfo')     // §5.2 受限 token → 换可信 memberUserId
const TOC_EXCHANGE_URL = process.env.TOC_EXCHANGE_URL || (TOC_BASE_URL + '/toc-api/auth/exchange-token')        // §5.1 App 换发（D 不直接调，仅知晓形态）
const TOC_BANSYNC_URL = process.env.TOC_BANSYNC_URL || (TOC_BASE_URL + '/toc-api/open/discover/ban-sync')       // §5.6 D→ToC 封禁通知
const TOC_BANSYNC_SECRET = process.env.TOC_BANSYNC_SECRET || ''         // D↔ToC 共享的 ban-sync HMAC 密钥（与 X-Discover 同构）

// ---- §5.0.1 HMAC 签名/验签（平台自证，secret 不上线、不可逆）----
// 待签串 = timestamp + "\n" + nonce + "\n" + body（body 原始请求体字符串，UTF-8）
// 四头：X-Discover-Client-Id / X-Discover-Timestamp / X-Discover-Nonce / X-Discover-Signature
function discoverSign(bodyStr) {
  const ts = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')   // 32hex 对齐ToC
  const sig = crypto.createHmac('sha256', TOC_CLIENT_SECRET).update(ts + '\n' + nonce + '\n' + bodyStr).digest('hex')
  return {
    'X-Discover-Client-Id': TOC_CLIENT_ID,
    'X-Discover-Timestamp': ts,
    'X-Discover-Nonce': nonce,
    'X-Discover-Signature': sig
  }
}
function verifyDiscoverSignature(rawBody, headers, secret) {
  const ts = headers['x-discover-timestamp'] || headers['X-Discover-Timestamp']
  const nonce = headers['x-discover-nonce'] || headers['X-Discover-Nonce']
  const sig = headers['x-discover-signature'] || headers['X-Discover-Signature']
  if (!ts || !nonce || !sig) return false
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10))
  if (isNaN(age) || age > 300) return false   // 容差 ±300s
  const expected = crypto.createHmac('sha256', secret).update(ts + '\n' + nonce + '\n' + rawBody).digest('hex')
  const a = Buffer.from(String(sig)), b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// requireAuth 缓存（§6.3：本地缓存 userinfo 结果，读 5min / banned 写 60s）
const _userinfoCache = new Map()
function cacheUserinfo(token, data) { _userinfoCache.set(token, { data, cachedAt: Date.now() }) }
function getCachedUserinfo(token) {
  const c = _userinfoCache.get(token)
  if (!c) return null
  const ttl = (c.data && c.data.banned) ? 60000 : 300000
  if (Date.now() - c.cachedAt > ttl) { _userinfoCache.delete(token); return null }
  return c.data
}
// /auth/token 限频桶：key = `tok:${deviceId}:${ip}`，值 = { window(分钟), n(次数) }
const _tokenRate = new Map()

function b64url(buf) {
  return buf.toString('base64url')
}

function unb64url(str) {
  return Buffer.from(str, 'base64url')
}

function issueUserToken(payload) {
  if (!USER_TOKEN_SECRET) throw new Error('服务端未配置 USER_TOKEN_SECRET')
  const pl = JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })
  const sig = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(pl).digest()
  return b64url(Buffer.from(pl)) + '.' + b64url(sig)
}

function verifyUserToken(token) {
  if (!USER_TOKEN_SECRET) return null
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [plB64, sigB64] = token.split('.')
  if (!plB64 || !sigB64) return null
  const pl = unb64url(plB64).toString('utf8')
  const sig = unb64url(sigB64)
  const calc = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(pl).digest()
  // 长度不一致时 timingSafeEqual 会抛异常（畸形签名 → 500），先比长度再比内容
  if (sig.length !== calc.length || !crypto.timingSafeEqual(calc, sig)) return null
  try {
    const payload = JSON.parse(pl)
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch (e) {
    return null
  }
}

// 用户侧写接口鉴权
//   - 已配置 USER_TOKEN_SECRET：校验 HMAC token 真伪并解析出 req.user
//   - 未配置：回退旧行为（仅检查 token 非空），打印 warning，待 ToC 提供 JWT 公钥后切 JWT
// 封禁检查：token 验证通过后，按 member_user_id（生产维度）或 device_id（演示态兜底）查 banned 表，命中即 403
function isBannedDevice(deviceId) {
  if (!deviceId) return false
  try {
    return !!db.prepare("SELECT 1 FROM banned WHERE device_id=? AND status='active'").get(String(deviceId))
  } catch (e) { return false }
}
function isBannedMember(memberUserId) {
  if (!memberUserId) return false
  try {
    return !!db.prepare("SELECT 1 FROM banned WHERE member_user_id=? AND status='active'").get(String(memberUserId))
  } catch (e) { return false }
}

// 用户侧写接口鉴权（SEC-01：受限 token + memberUserId 双凭证体系）
//   优先级：
//     1) 生产路径：配置 TOC_USERINFO_URL 时，用受限 token 调 ToC userinfo 换可信 memberUserId
//     2) 演示态：未配 ToC 但配了 USER_TOKEN_SECRET 时，走自签 HMAC 校验
//     3) 最松兜底：两者都未配时，仅检查 token 非空（保持现状，不破演示态）
//   封禁维度：member_user_id 优先，回退 device_id
async function requireAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!t) return res.status(401).json(err(401, '未授权：需要登录后操作'))

  let user = null

  // 1) 生产路径（§5.2 + §5.8）：受限 token → HMAC 签名调 ToC userinfo 换可信 memberUserId
  if (TOC_USERINFO_URL && TOC_CLIENT_ID && TOC_CLIENT_SECRET) {
    try {
      const cached = getCachedUserinfo(t)
      let u
      if (cached) {
        u = cached
      } else {
        const bodyStr = JSON.stringify({ accessToken: t })
        const signHeaders = discoverSign(bodyStr)
        const r = await fetch(TOC_USERINFO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...signHeaders },
          body: bodyStr
        })
        if (r.status === 401) return res.status(401).json(err(401, '未授权：Token 无效或已过期'))
        if (!r.ok) throw new Error('userinfo HTTP ' + r.status)
        const j = await r.json().catch(() => ({}))
        u = j.data || j   // 规范返回 { code, data:{ memberUserId, banned, ... } }
        u.memberUserId = u.memberUserId || u.member_user_id || ''
        cacheUserinfo(t, u)
      }
      user = { memberUserId: u.memberUserId || '', deviceId: '', toc: true, banned: !!u.banned, raw: u }
    } catch (e) {
      // ToC 临时不可达 → 落到下方兜底，不中断请求（避免单点故障阻断整个发现页）
      console.warn('[pxid-feed] ToC userinfo 校验失败，回退演示态:', e.message)
    }
  }

  // 2) 演示态兜底：自签 HMAC（Flutter 用同一 secret 签发的 token）
  if (!user && USER_TOKEN_SECRET) {
    const payload = verifyUserToken(t)
    if (payload) user = { memberUserId: payload.memberUserId || '', deviceId: payload.deviceId || '', raw: payload }
  }

  // 3) 最松兜底：两者都未配时，仅检查 token 非空（保持现状，不破演示态）
  if (!user && !TOC_USERINFO_URL && !USER_TOKEN_SECRET) {
    user = { deviceId: String((req.body && req.body.deviceId) || (req.query && req.query.deviceId) || ''), anonymous: true }
    if (!_tokenFallbackWarned) {
      console.warn('[pxid-feed] 未配置 ToC/USER_TOKEN_SECRET，requireAuth 仅检查 token 非空（过渡降级）')
      _tokenFallbackWarned = true
    }
  }

  if (!user) return res.status(401).json(err(401, '未授权：Token 校验失败'))

  req.user = user

  // 封禁检查：① ToC userinfo 返回的 banned 直接拦截（§5.2）；② 本地 banned 表 member_user_id 优先、回退 device_id
  if (user.toc && user.banned) {
    return res.status(403).json(err(403, '账号已被封禁，无法进行该操作'))
  }
  if (user.memberUserId && isBannedMember(user.memberUserId)) {
    return res.status(403).json(err(403, '账号已被封禁，无法进行该操作'))
  }
  if (user.deviceId && isBannedDevice(user.deviceId)) {
    return res.status(403).json(err(403, '账号已被封禁，无法进行该操作'))
  }
  next()
}

// ============================================================
// ToC → D 封禁同步（SEC-01 方向1：ToC 推送封禁到 D）
//   契约：POST /ban-sync/from-toc
//     - 头：X-Toc-Signature = HMAC-SHA256(rawBody, TOC_BANSYNC_SECRET)，hex
//     - 体：{ memberUserId, deviceId, reason, action: 'ban' | 'lift' }
//   - 未配置 TOC_BANSYNC_SECRET 时返回 500（fail-closed，不裸奔）
// ============================================================
app.post('/ban-sync/from-toc', (req, res) => {
  if (!TOC_BANSYNC_SECRET) return res.status(500).json(err(500, '服务端未配置 TOC_BANSYNC_SECRET（fail-closed）'))
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}))
  if (!verifyDiscoverSignature(rawBody, req.headers, TOC_BANSYNC_SECRET)) {
    return res.status(401).json(err(401, '签名校验失败（X-Discover-Signature 缺失或超时/不匹配）'))
  }
  // 规范 §5.6 请求体：member_user_id / device_id / reason / status(active|lifted)
  const { member_user_id = '', device_id = '', reason = '', status = 'active' } = req.body || {}
  const mu = String(member_user_id).trim(), dv = String(device_id).trim()
  if (!mu && !dv) return res.json(err(1, 'member_user_id 与 device_id 至少填一个'))
  if (status === 'lifted' || status === 'lift') {
    db.prepare("UPDATE banned SET status='lifted', lifted_at=?, operator='ToC' WHERE (member_user_id=? OR device_id=?) AND status='active'")
      .run(now(), mu, dv)
  } else {
    db.prepare("INSERT OR IGNORE INTO banned (device_id, member_user_id, reason, operator, status, created_at) VALUES (?,?,?,?,?,?)")
      .run(dv, mu, String(reason).slice(0, 200), 'ToC', 'active', now())
  }
  res.json(ok({ code: 0 }))
})

// ============================================================
// D → ToC 封禁同步（SEC-01 方向2：D 本地封禁后通知 ToC 强踢）
//   未配置 TOC_BANSYNC_URL / TOC_CLIENT_SECRET 时 warn 跳过（不阻断运营操作）
// ============================================================
function notifyTocBan(memberUserId, deviceId, reason) {
  if (!TOC_BANSYNC_URL || !TOC_CLIENT_ID || !TOC_CLIENT_SECRET) {
    console.warn('[pxid-feed] ToC 反向 ban-sync 未配置（TOC_BANSYNC_URL/TOC_CLIENT_ID/TOC_CLIENT_SECRET），跳过通知')
    return
  }
  // 规范 §5.6：body { device_id, member_user_id, reason, status, banned_at, expire_at }
  const bodyStr = JSON.stringify({
    device_id: String(deviceId || ''),
    member_user_id: String(memberUserId || ''),
    reason: String(reason || ''),
    status: 'active',
    banned_at: new Date().toISOString(),
    expire_at: null
  })
  const signHeaders = discoverSign(bodyStr)
  fetch(TOC_BANSYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...signHeaders },
    body: bodyStr
  }).catch((e) => console.error('[pxid-feed] ToC 反向 ban-sync 通知失败:', e.message))
}

// ---- 图片上传（运营后台 + 用户发帖共用，multipart）----
const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// 图片真实类型检测（magic bytes），防 mimetype/扩展名伪造托管任意文件（如 x.html）
const IMG_MAGIC = [
  { ext: 'jpg',  test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png',  test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { ext: 'webp', test: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
]
function detectImageType(buf) {
  for (const m of IMG_MAGIC) if (m.test(buf)) return m.ext
  return null
}
// multer 落盘后逐文件校验 magic bytes，通过则 rename 成真实扩展名；任一不合法则清理全部并返回 null
function verifyAndRenameUploads(files) {
  const out = []
  for (const f of files || []) {
    let fd = null
    try {
      fd = fs.openSync(f.path, 'r')
      const head = Buffer.alloc(12)
      fs.readSync(fd, head, 0, 12, 0)
      fs.closeSync(fd)
      fd = null
      const ext = detectImageType(head)
      if (!ext) {
        try { fs.unlinkSync(f.path) } catch (_) {}
        for (const o of out) { try { fs.unlinkSync(o.path) } catch (_) {} }
        return null
      }
      const base = f.filename.replace(/\.tmp$/, '')
      const newName = base + '.' + ext
      const newPath = path.join(path.dirname(f.path), newName)
      fs.renameSync(f.path, newPath)
      out.push({ ...f, filename: newName, path: newPath })
    } catch (e) {
      if (fd) { try { fs.closeSync(fd) } catch (_) {} }
      try { fs.unlinkSync(f.path) } catch (_) {}
      for (const o of out) { try { fs.unlinkSync(o.path) } catch (_) {} }
      return null
    }
  }
  return out
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      // 先写 .tmp，落盘后按 magic bytes 检测结果 rename 成真实扩展名（verifyAndRenameUploads）
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      cb(null, name + '.tmp')
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
  fileFilter: (req, file, cb) => {
    // 双重白名单：mimetype + 原始扩展名，均须为 jpg/png/webp（去掉 gif，与增补方案 §9.1#4 一致）
    const mimeOk = /^image\/(jpeg|png|webp)$/.test(file.mimetype)
    const extOk = /\.(jpe?g|png|webp)$/i.test(file.originalname)
    cb(mimeOk && extOk ? null : new Error('仅允许 jpg/png/webp 图片'))
  },
})
// 静态服务上传文件（无需鉴权，URL 本身不可猜；文件经 magic bytes 校验后才落到 /uploads）
app.use('/uploads', express.static(UPLOAD_DIR))
app.post('/admin/upload', requireAdmin, upload.array('images', 9), (req, res) => {
  if (!req.files || !req.files.length) return res.json(err(1, '未收到图片'))
  const files = verifyAndRenameUploads(req.files)
  if (!files) return res.status(400).json(err(400, '文件内容不是合法图片（仅支持 jpg/png/webp）'))
  const urls = files.map((f) => API_BASE + '/uploads/' + f.filename)
  res.json(ok({ urls, count: urls.length }))
})
// 用户侧发帖图片上传（requireAuth + 同一 multer 白名单 + magic bytes 校验；静态服务 /uploads 无需鉴权，文件名不可猜）
app.post('/feed/upload', requireAuth, upload.array('images', 9), (req, res) => {
  if (!req.files || !req.files.length) return res.json(err(1, '未收到图片'))
  const files = verifyAndRenameUploads(req.files)
  if (!files) return res.status(400).json(err(400, '文件内容不是合法图片（仅支持 jpg/png/webp）'))
  const urls = files.map((f) => API_BASE + '/uploads/' + f.filename)
  res.json(ok({ urls, count: urls.length }))
})

// ---- 统一媒体上传（图片/视频，storage 抽象层 local 实现）----
// 视频 magic bytes：mp4/mov=ftyp box；webm=EBML 头 0x1A45DFA3
function detectVideoType(head) {
  if (head.length >= 12 && head.indexOf(Buffer.from('ftyp')) >= 0) return 'mp4'
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'webm'
  return ''
}
// 落盘后校验 magic bytes，图片/视频均支持；通过则 rename 真实扩展名，返回 {filename,type} 否则清理返回 null
function verifyMediaUpload(file) {
  let fd = null
  try {
    fd = fs.openSync(file.path, 'r')
    const head = Buffer.alloc(12)
    fs.readSync(fd, head, 0, 12, 0)
    fs.closeSync(fd); fd = null
    const imgExt = detectImageType(head)
    const vidExt = imgExt ? '' : detectVideoType(head)
    if (!imgExt && !vidExt) { try { fs.unlinkSync(file.path) } catch (_) {} return null }
    const ext = imgExt || vidExt
    const newName = file.filename.replace(/\.tmp$/, '') + '.' + ext
    const newPath = path.join(path.dirname(file.path), newName)
    fs.renameSync(file.path, newPath)
    return { filename: newName, path: newPath, type: imgExt ? 'image' : 'video' }
  } catch (e) {
    if (fd) { try { fs.closeSync(fd) } catch (_) {} }
    try { fs.unlinkSync(file.path) } catch (_) {}
    return null
  }
}
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.tmp'),
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/.test(file.mimetype)
    cb(ok ? null : new Error('仅支持 jpg/png/webp 图片与 mp4/webm 视频'))
  },
})
app.post('/media/upload', requireAuth, mediaUpload.single('file'), (req, res) => {
  if (!req.file) return res.json(err(1, '未收到文件'))
  const v = verifyMediaUpload(req.file)
  if (!v) return res.status(400).json(err(400, '文件内容不合法（仅支持图片/视频）'))
  const key = 'uploads/' + v.filename
  res.json(ok({ objectKey: key, url: API_BASE + '/' + key, type: v.type }))
})
// OSS 模式 STS 签发（迁移阶段骨架；本地盘模式前端走 /media/upload，不调此接口）
app.get('/media/sts', requireAuth, (req, res) => {
  res.json(err(501, '当前为本地存储模式，请使用 /media/upload 直传'))
})
// 视频异步转码（增强，可选）：系统有 ffmpeg 才执行，失败静默；转 720p + 抽封面回写
function transcodeVideoIfAvailable(feedId, srcKey) {
  let cp
  try { cp = require('child_process') } catch (_) { return }
  try { cp.execSync('which ffmpeg', { stdio: 'ignore' }) } catch (_) { return }
  setImmediate(() => {
    try {
      const src = path.join(UPLOAD_DIR, path.basename(srcKey))
      if (!fs.existsSync(src)) return
      const dir = path.join(UPLOAD_DIR, 'transcoded')
      fs.mkdirSync(dir, { recursive: true })
      const outMp4 = path.join(dir, feedId + '-720.mp4')
      const outCover = path.join(dir, feedId + '-cover.jpg')
      const enc = cp.spawn('ffmpeg', ['-y', '-i', src, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', outMp4])
      enc.on('close', (code) => {
        if (code === 0) {
          db.prepare('UPDATE feeds SET video_url=? WHERE id=?').run('uploads/transcoded/' + feedId + '-720.mp4', feedId)
          const cov = cp.spawn('ffmpeg', ['-y', '-i', src, '-ss', '0.1', '-vframes', '1', outCover])
          cov.on('close', () => {
            const row = db.prepare('SELECT cover_url FROM feeds WHERE id=?').get(feedId)
            if (row && !row.cover_url) db.prepare('UPDATE feeds SET cover_url=? WHERE id=?').run('uploads/transcoded/' + feedId + '-cover.jpg', feedId)
          })
        }
      })
    } catch (_) {}
  })
}

// 管理列表（含全部状态：published/offline/scheduled/deleted）
app.get('/admin/feed', requireAdmin, (req, res) => {
  const { status, kind, keyword, region, sort = 'pinned', from, to, page = 1, pageSize = 20 } = req.query
  const where = []
  const args = []
  if (status && status !== 'all') { where.push('status = ?'); args.push(status) }
  if (kind && kind !== 'all') { where.push('kind = ?'); args.push(kind) }
  if (keyword) { where.push('(content LIKE ? OR nickname LIKE ?)'); args.push('%' + keyword + '%', '%' + keyword + '%') }
  if (region && region !== 'all') { where.push('region_code = ?'); args.push(String(region).toUpperCase()) }
  if (from) { where.push('DATE(created_at) >= ?'); args.push(from) }
  if (to) { where.push('DATE(created_at) <= ?'); args.push(to) }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const total = db.prepare(`SELECT COUNT(*) c FROM feeds ${w}`).get(...args).c
  const p = Math.max(1, parseInt(page) || 1)
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
  // 排序白名单（防注入）；默认：置顶优先 > 更新时间倒序
  const sortMap = {
    pinned: 'pinned DESC, updated_at DESC',
    update: 'updated_at DESC',
    created: 'created_at DESC',
    likes: 'likes DESC',
  }
  const orderBy = sortMap[sort] || 'pinned DESC, updated_at DESC'
  const rows = db.prepare(`SELECT * FROM feeds ${w} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...args, ps, (p - 1) * ps)
  res.json(ok({ total, page: p, pageSize: ps, list: rows.map(rowToFeed) }))
})

// 官方发帖（运营发布，kind=official）
app.post('/admin/feed', requireAdmin, (req, res) => {
  const { content, images = [], carModel = '', tags = [], scheduledAt, operator = 'admin' } = req.body || {}
  const text = String(content || '').trim()
  if (!text) return res.json(err(1, '内容不能为空'))
  if (text.length > 1000) return res.json(err(1, '内容不能超过 1000 字'))
  const st = scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? 'scheduled' : 'published'
  const info = db
    .prepare(
      `INSERT INTO feeds (nickname, device_id, avatar, content, images, tags, car_model, created_at, kind, status, pinned, scheduled_at, updated_at, operator)
       VALUES (?, '', '', ?, ?, ?, ?, ?, 'official', ?, 0, ?, ?, ?)`
    )
    .run(
      'PXID 官方',
      text,
      JSON.stringify((images || []).slice(0, 9)),
      JSON.stringify((tags || []).slice(0, 5)),
      String(carModel || ''),
      now(),
      st,
      scheduledAt || null,
      now(),
      String(operator || 'admin').slice(0, 30)
    )
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(info.lastInsertRowid)
  res.json(ok(rowToFeed(row)))
})

// 编辑（官方帖/用户帖均可）
app.put('/admin/feed/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  const { content, images, carModel, tags, cover, operator = 'admin' } = req.body || {}
  const sets = []
  const args = []
  if (content !== undefined) { sets.push('content = ?'); args.push(String(content).slice(0, 1000)) }
  if (images !== undefined) { sets.push('images = ?'); args.push(JSON.stringify(images.slice(0, 9))) }
  if (carModel !== undefined) { sets.push('car_model = ?'); args.push(String(carModel)) }
  if (tags !== undefined) { sets.push('tags = ?'); args.push(JSON.stringify(tags.slice(0, 5))) }
  if (cover !== undefined) { sets.push('cover = ?'); args.push(String(cover).slice(0, 500)) }
  if (!sets.length) return res.json(err(1, '无可更新字段'))
  sets.push('updated_at = ?'); args.push(now())
  sets.push('operator = ?'); args.push(String(operator || 'admin').slice(0, 30))
  args.push(row.id)
  db.prepare(`UPDATE feeds SET ${sets.join(', ')} WHERE id=?`).run(...args)
  const nrow = db.prepare('SELECT * FROM feeds WHERE id=?').get(row.id)
  res.json(ok(rowToFeed(nrow)))
})

// 软删（status=deleted，可恢复）
app.delete('/admin/feed/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  db.prepare("UPDATE feeds SET status='deleted', updated_at=?, operator=? WHERE id=?").run(now(), 'admin', row.id)
  res.json(ok({ id: row.id, status: 'deleted' }))
})

// 置顶切换
app.put('/admin/feed/:id/pin', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  const pinned = row.pinned ? 0 : 1
  db.prepare('UPDATE feeds SET pinned=?, updated_at=? WHERE id=?').run(pinned, now(), row.id)
  res.json(ok({ id: row.id, pinned: !!pinned }))
})

// 上架 / 下架（撤回）
app.put('/admin/feed/:id/status', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  const { status } = req.body || {}
  if (!['published', 'offline'].includes(status)) return res.json(err(1, 'status 仅支持 published/offline'))
  db.prepare('UPDATE feeds SET status=?, updated_at=? WHERE id=?').run(status, now(), row.id)
  res.json(ok({ id: row.id, status }))
})

// ---- Banner 配置 CRUD ----
app.get('/banners', (req, res) => {
  const rows = db.prepare("SELECT * FROM banners WHERE status='on' ORDER BY sort ASC, id DESC").all()
  res.json(ok({ list: rows }))
})
app.get('/admin/banners', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM banners ORDER BY sort ASC, id DESC').all()
  res.json(ok({ list: rows }))
})
app.post('/admin/banners', requireAdmin, (req, res) => {
  const { title = '', image = '', url = '', sort = 0 } = req.body || {}
  const info = db.prepare('INSERT INTO banners (title, image, url, sort, status, created_at) VALUES (?,?,?,?,\'on\',?)').run(title, image, url, parseInt(sort) || 0, now())
  res.json(ok(db.prepare('SELECT * FROM banners WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/admin/banners/:id', requireAdmin, (req, res) => {
  const { title, image, url, sort, status } = req.body || {}
  const sets = []; const args = []
  if (title !== undefined) { sets.push('title = ?'); args.push(title) }
  if (image !== undefined) { sets.push('image = ?'); args.push(image) }
  if (url !== undefined) { sets.push('url = ?'); args.push(url) }
  if (sort !== undefined) { sets.push('sort = ?'); args.push(parseInt(sort) || 0) }
  if (status !== undefined) { sets.push('status = ?'); args.push(status) }
  if (!sets.length) return res.json(err(1, '无可更新字段'))
  args.push(req.params.id)
  db.prepare(`UPDATE banners SET ${sets.join(', ')} WHERE id=?`).run(...args)
  res.json(ok(db.prepare('SELECT * FROM banners WHERE id=?').get(req.params.id)))
})
app.delete('/admin/banners/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM banners WHERE id=?').run(req.params.id)
  res.json(ok({ id: req.params.id }))
})

// ---- 广场四宫格跳转配置 CRUD ----
app.get('/plaza-grid', (req, res) => {
  const rows = db.prepare("SELECT * FROM plaza_grid WHERE status='on' ORDER BY sort ASC, id DESC").all()
  res.json(ok({ list: rows }))
})
app.get('/admin/plaza-grid', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM plaza_grid ORDER BY sort ASC, id DESC').all()
  res.json(ok({ list: rows }))
})
app.post('/admin/plaza-grid', requireAdmin, (req, res) => {
  const { title = '', icon = '', url = '', sort = 0 } = req.body || {}
  const info = db.prepare('INSERT INTO plaza_grid (title, icon, url, sort, status, created_at) VALUES (?,?,?,?,\'on\',?)').run(title, icon, url, parseInt(sort) || 0, now())
  res.json(ok(db.prepare('SELECT * FROM plaza_grid WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/admin/plaza-grid/:id', requireAdmin, (req, res) => {
  const { title, icon, url, sort, status } = req.body || {}
  const sets = []; const args = []
  if (title !== undefined) { sets.push('title = ?'); args.push(title) }
  if (icon !== undefined) { sets.push('icon = ?'); args.push(icon) }
  if (url !== undefined) { sets.push('url = ?'); args.push(url) }
  if (sort !== undefined) { sets.push('sort = ?'); args.push(parseInt(sort) || 0) }
  if (status !== undefined) { sets.push('status = ?'); args.push(status) }
  if (!sets.length) return res.json(err(1, '无可更新字段'))
  args.push(req.params.id)
  db.prepare(`UPDATE plaza_grid SET ${sets.join(', ')} WHERE id=?`).run(...args)
  res.json(ok(db.prepare('SELECT * FROM plaza_grid WHERE id=?').get(req.params.id)))
})
app.delete('/admin/plaza-grid/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM plaza_grid WHERE id=?').run(req.params.id)
  res.json(ok({ id: req.params.id }))
})

// ---- 广场热门活动（只读；运营可配基础活动，完整报名/有奖/数据看板见活动模块）----
app.get('/activities', (req, res) => {
  const { region } = req.query
  const reg = String(region || '').toUpperCase()
  // 地区过滤：CN/BR/US，US 为全球公共池（与 feed 语义一致）
  let w = "WHERE status='on'"
  const args = []
  if (['CN', 'BR', 'US'].includes(reg)) {
    w += " AND region_code IN (?, 'US')"
    args.push(reg)
  }
  const rows = db.prepare(`SELECT * FROM activities ${w} ORDER BY sort ASC, id DESC`).all(...args)
  res.json(ok({ list: rows.map(rowToActivity) }))
})
app.get('/admin/activities', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM activities ORDER BY sort ASC, id DESC').all()
  res.json(ok({ list: rows.map(rowToActivity) }))
})
app.post('/admin/activities', requireAdmin, (req, res) => {
  const { title = '', cover = '', url = '', content = '', start_date = '', end_date = '', type = 'offline', location = '', store_id = '', quota = 0, prize_desc = '', share_poster = '', checkin_code = '', tags = [], sort = 0, region = 'US', region_code = '' } = req.body || {}
  const reg = ['CN', 'BR', 'US'].includes(String(region_code || region).toUpperCase()) ? String(region_code || region).toUpperCase() : 'US'
  const info = db.prepare(`INSERT INTO activities (title, cover, url, content, start_date, end_date, type, location, store_id, quota, prize_desc, share_poster, checkin_code, tags, sort, region_code, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'on',?)`).run(title, cover, url, content, start_date, end_date, type, location, store_id, parseInt(quota) || 0, prize_desc, share_poster, checkin_code, JSON.stringify(tags || []), parseInt(sort) || 0, reg, now())
  res.json(ok(db.prepare('SELECT * FROM activities WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/admin/activities/:id', requireAdmin, (req, res) => {
  const { title, cover, url, content, start_date, end_date, type, location, store_id, quota, prize_desc, share_poster, checkin_code, tags, sort, status, region, region_code } = req.body || {}
  const sets = []; const args = []
  if (title !== undefined) { sets.push('title = ?'); args.push(title) }
  if (cover !== undefined) { sets.push('cover = ?'); args.push(cover) }
  if (url !== undefined) { sets.push('url = ?'); args.push(url) }
  if (content !== undefined) { sets.push('content = ?'); args.push(content) }
  if (start_date !== undefined) { sets.push('start_date = ?'); args.push(start_date) }
  if (end_date !== undefined) { sets.push('end_date = ?'); args.push(end_date) }
  if (type !== undefined) { sets.push('type = ?'); args.push(type) }
  if (location !== undefined) { sets.push('location = ?'); args.push(location) }
  if (store_id !== undefined) { sets.push('store_id = ?'); args.push(store_id) }
  if (quota !== undefined) { sets.push('quota = ?'); args.push(parseInt(quota) || 0) }
  if (prize_desc !== undefined) { sets.push('prize_desc = ?'); args.push(prize_desc) }
  if (share_poster !== undefined) { sets.push('share_poster = ?'); args.push(share_poster) }
  if (checkin_code !== undefined) { sets.push('checkin_code = ?'); args.push(checkin_code) }
  if (tags !== undefined) { sets.push('tags = ?'); args.push(JSON.stringify(tags)) }
  if (sort !== undefined) { sets.push('sort = ?'); args.push(parseInt(sort) || 0) }
  if (status !== undefined) { sets.push('status = ?'); args.push(status) }
  const reg = region_code !== undefined ? region_code : region
  if (reg !== undefined) { sets.push('region_code = ?'); args.push(['CN', 'BR', 'US'].includes(String(reg).toUpperCase()) ? String(reg).toUpperCase() : 'US') }
  if (!sets.length) return res.json(err(1, '无可更新字段'))
  args.push(req.params.id)
  db.prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id=?`).run(...args)
  res.json(ok(db.prepare('SELECT * FROM activities WHERE id=?').get(req.params.id)))
})
app.delete('/admin/activities/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM activities WHERE id=?').run(req.params.id)
  res.json(ok({ id: req.params.id }))
})

// ============================================================
// 活动模块完整接口（厂商活动全流程）
// ============================================================
function doCheckin(activityId, code, operator, method, lat, lng) {
  const act = db.prepare('SELECT * FROM activities WHERE id=?').get(activityId)
  if (!act || act.status !== 'on') return err(404, '活动不存在或已下架')
  const sup = db.prepare('SELECT * FROM activity_signups WHERE activity_id=? AND checkin_code=?').get(activityId, code)
  if (!sup) return err(1, '核销码无效')
  if (sup.status !== 'joined') return err(1, '该报名已取消')
  const done = db.prepare('SELECT 1 FROM activity_checkins WHERE signup_id=?').get(sup.id)
  if (done) return err(1, '已核销')
  db.prepare(`INSERT INTO activity_checkins (activity_id, signup_id, device_id, operator_device, code, method, lat, lng, checked_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(activityId, sup.id, sup.device_id, String(operator || ''), code, method || 'scan', lat || null, lng || null, now())
  return ok({ ok: true, name: sup.name, bikeModel: sup.bike_model })
}

// 我的全部活动（user 侧：按 deviceId 列出所有报名 + 关联活动 + 核销状态）
// 注意：必须声明在 /activities/:id 之前，否则 'me' 会被 :id 参数吞掉
// R2：加 requireAuth；配 secret 时强制用 token 内 deviceId（防枚举他人报名/核销码），未配时降级 query + warning
app.get('/activities/me', requireAuth, (req, res) => {
  const deviceId = (USER_TOKEN_SECRET && req.user && req.user.deviceId) || String(req.query.deviceId || '')
  if (!deviceId) {
    if (USER_TOKEN_SECRET) return res.status(401).json(err(401, '未授权：Token 缺少设备信息'))
    return res.json(err(1, '缺少 deviceId'))
  }
  if (!USER_TOKEN_SECRET && !_tokenFallbackWarned) {
    console.warn('[pxid-feed] USER_TOKEN_SECRET 未配置，/activities/me 使用 query.deviceId（过渡降级）')
    _tokenFallbackWarned = true
  }
  const rows = db.prepare(`
    SELECT s.id AS sid, s.status AS sstatus, s.name AS sname, s.bike_model, s.checkin_code, s.created_at AS screated,
           a.id AS aid, a.title, a.cover, a.content, a.start_date, a.end_date, a.type, a.location, a.quota,
           a.signup_count, a.prize_desc, a.tags, a.status AS astatus, a.url,
           (SELECT 1 FROM activity_checkins WHERE signup_id=s.id) AS checked,
           (SELECT checked_at FROM activity_checkins WHERE signup_id=s.id) AS checked_at
    FROM activity_signups s JOIN activities a ON a.id=s.activity_id
    WHERE s.device_id=? ORDER BY s.id DESC`).all(String(deviceId))
  const list = rows.map((r) => ({
    id: r.sid,
    status: r.sstatus,
    name: r.sname,
    bikeModel: r.bike_model,
    checkinCode: r.checkin_code,
    signedUpAt: r.screated,
    checked: !!r.checked,
    checkedAt: r.checked_at || '',
    activity: rowToActivity({
      id: r.aid, title: r.title, cover: r.cover, content: r.content, url: r.url,
      start_date: r.start_date, end_date: r.end_date, type: r.type, location: r.location,
      quota: r.quota, signup_count: r.signup_count, prize_desc: r.prize_desc, tags: r.tags, status: r.astatus,
    }),
  }))
  res.json(ok({ list }))
})

// 活动详情
app.get('/activities/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM activities WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '活动不存在'))
  const signup = db.prepare("SELECT COUNT(*) c FROM activity_signups WHERE activity_id=? AND status='joined'").get(row.id).c
  res.json(ok({ ...rowToActivity(row), signupCount: signup }))
})

// 报名
app.post('/activities/:id/signup', requireAuth, (req, res) => {
  const { name = '', phone = '', bikeModel = '' } = req.body || {}
  // 安全：报名 deviceId 强制用 token 内可信值（P0-4），未配 USER_TOKEN_SECRET 时降级用 body 传值
  const deviceId = (USER_TOKEN_SECRET && req.user && req.user.deviceId) || String(req.body.deviceId || '')
  if (!deviceId) return res.json(err(1, '缺少 deviceId'))
  const act = db.prepare('SELECT * FROM activities WHERE id=?').get(req.params.id)
  if (!act || act.status !== 'on') return res.json(err(404, '活动不存在或已下架'))
  const quota = act.quota || 0
  if (quota > 0) {
    const c = db.prepare("SELECT COUNT(*) c FROM activity_signups WHERE activity_id=? AND status='joined'").get(act.id).c
    if (c >= quota) return res.json(err(1, '名额已满'))
  }
  const dup = db.prepare('SELECT 1 FROM activity_signups WHERE activity_id=? AND device_id=? AND status=?').get(act.id, deviceId, 'joined')
  if (dup) return res.json(err(1, '已报名'))
  const code = 'ACT-' + act.id + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  const info = db.prepare(`INSERT INTO activity_signups (activity_id, device_id, name, phone, bike_model, checkin_code, status, created_at) VALUES (?,?,?,?,?,?,'joined',?)`).run(act.id, deviceId, String(name).slice(0,20), String(phone).slice(0,20), String(bikeModel||''), code, now())
  db.prepare("UPDATE activities SET signup_count = (SELECT COUNT(*) FROM activity_signups WHERE activity_id=? AND status='joined') WHERE id=?").run(act.id, act.id)
  const row = db.prepare('SELECT * FROM activity_signups WHERE id=?').get(info.lastInsertRowid)
  res.json(ok({ id: row.id, name: row.name, bikeModel: row.bike_model, checkinCode: row.checkin_code }))
})

// 取消报名
app.delete('/activities/:id/signup', requireAuth, (req, res) => {
  // 安全：取消报名 deviceId 强制 token 内可信值（P0-3），未配 USER_TOKEN_SECRET 时降级用 query 传值
  const deviceId = (USER_TOKEN_SECRET && req.user && req.user.deviceId) || String(req.query.deviceId || '')
  if (!deviceId) return res.json(err(1, '缺少 deviceId'))
  db.prepare("UPDATE activity_signups SET status='cancelled' WHERE activity_id=? AND device_id=? AND status='joined'").run(req.params.id, deviceId)
  db.prepare("UPDATE activities SET signup_count = (SELECT COUNT(*) FROM activity_signups WHERE activity_id=? AND status='joined') WHERE id=?").run(req.params.id, req.params.id)
  res.json(ok({ cancelled: true }))
})

// 我的报名（含核销码）——R2：加 requireAuth，配 secret 时强制用 token 内 deviceId
app.get('/activities/:id/signup/me', requireAuth, (req, res) => {
  const deviceId = (USER_TOKEN_SECRET && req.user && req.user.deviceId) || String(req.query.deviceId || '')
  if (!deviceId) {
    if (USER_TOKEN_SECRET) return res.status(401).json(err(401, '未授权：Token 缺少设备信息'))
    return res.json(err(1, '缺少 deviceId'))
  }
  if (!USER_TOKEN_SECRET && !_tokenFallbackWarned) {
    console.warn('[pxid-feed] USER_TOKEN_SECRET 未配置，/activities/:id/signup/me 使用 query.deviceId（过渡降级）')
    _tokenFallbackWarned = true
  }
  const row = db.prepare("SELECT * FROM activity_signups WHERE activity_id=? AND device_id=? AND status='joined'").get(req.params.id, deviceId)
  res.json(ok({ signedUp: !!row, signup: row ? { id: row.id, name: row.name, bikeModel: row.bike_model, checkinCode: row.checkin_code } : null }))
})

// 核销（组织方手机扫码 / 后台录码，公开端靠 code 鉴权）
app.post('/activities/:id/checkin', requireAuth, (req, res) => {
  const { code = '', operatorDevice = '', lat, lng, method = 'scan' } = req.body || {}
  res.json(doCheckin(req.params.id, code, operatorDevice, method, lat, lng))
})

// 分享
app.post('/activities/:id/share', requireAuth, (req, res) => {
  const { deviceId = '', channel = '' } = req.body || {}
  if (!deviceId) return res.json(err(1, '缺少 deviceId'))
  db.prepare('INSERT INTO activity_shares (activity_id, device_id, channel, created_at) VALUES (?,?,?,?)').run(req.params.id, deviceId, String(channel||''), now())
  res.json(ok({ shared: true }))
})

// 活动统计
app.get('/activities/:id/stats', (req, res) => {
  const a = req.params.id
  const signup = db.prepare("SELECT COUNT(*) c FROM activity_signups WHERE activity_id=? AND status='joined'").get(a).c
  const checkin = db.prepare('SELECT COUNT(*) c FROM activity_checkins WHERE activity_id=?').get(a).c
  const share = db.prepare('SELECT COUNT(*) c FROM activity_shares WHERE activity_id=?').get(a).c
  const posts = db.prepare("SELECT COUNT(*) c FROM feeds WHERE status='published' AND tags LIKE ?").get('%act{'+a+'}%').c
  res.json(ok({ signup, checkin, share, posts, rate: signup ? Math.round(checkin/signup*100) : 0 }))
})

// ---- 活动管理接口 ----
// 单活动统计（admin 版，运营后台看板弹窗用）
app.get('/admin/activities/:id/stats', requireAdmin, (req, res) => {
  const a = req.params.id
  const signup = db.prepare("SELECT COUNT(*) c FROM activity_signups WHERE activity_id=? AND status='joined'").get(a).c
  const checkin = db.prepare('SELECT COUNT(*) c FROM activity_checkins WHERE activity_id=?').get(a).c
  const share = db.prepare('SELECT COUNT(*) c FROM activity_shares WHERE activity_id=?').get(a).c
  const posts = db.prepare("SELECT COUNT(*) c FROM feeds WHERE status='published' AND tags LIKE ?").get('%act{' + a + '}%').c
  res.json(ok({ signup, checkin, share, posts, rate: signup ? Math.round(checkin / signup * 100) : 0 }))
})
app.get('/admin/activities/:id/signups', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT s.*, (SELECT 1 FROM activity_checkins WHERE signup_id=s.id) AS checked FROM activity_signups s WHERE s.activity_id=? ORDER BY s.id DESC').all(req.params.id)
  res.json(ok({ list: rows }))
})
app.post('/admin/activities/:id/checkin', requireAdmin, (req, res) => {
  const { code = '', lat, lng } = req.body || {}
  res.json(doCheckin(req.params.id, code, 'admin', 'manual', lat, lng))
})
app.get('/admin/activities/:id/prizes', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM activity_prizes WHERE activity_id=? ORDER BY id DESC').all(req.params.id)
  res.json(ok({ list: rows }))
})
app.post('/admin/activities/:id/prizes', requireAdmin, (req, res) => {
  const { deviceId, prize } = req.body || {}
  if (!deviceId) return res.json(err(1, '缺少 deviceId'))
  const info = db.prepare("INSERT INTO activity_prizes (activity_id, device_id, prize, status, created_at) VALUES (?,?,?,'pending',?)").run(req.params.id, deviceId, String(prize||''), now())
  res.json(ok(db.prepare('SELECT * FROM activity_prizes WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/admin/activities/:id/prizes/:pid', requireAdmin, (req, res) => {
  const { status = 'sent' } = req.body || {}
  db.prepare('UPDATE activity_prizes SET status=? WHERE id=?').run(status, req.params.pid)
  res.json(ok({ id: req.params.pid, status }))
})
app.get('/admin/activities-stats', requireAdmin, (req, res) => {
  const acts = db.prepare('SELECT id,title FROM activities ORDER BY id DESC').all()
  const list = acts.map((a) => {
    const signup = db.prepare("SELECT COUNT(*) c FROM activity_signups WHERE activity_id=? AND status='joined'").get(a.id).c
    const checkin = db.prepare('SELECT COUNT(*) c FROM activity_checkins WHERE activity_id=?').get(a.id).c
    const share = db.prepare('SELECT COUNT(*) c FROM activity_shares WHERE activity_id=?').get(a.id).c
    return { id: a.id, title: a.title, signup, checkin, share, rate: signup ? Math.round(checkin/signup*100) : 0 }
  })
  res.json(ok({ list }))
})

// ---- 关注 / 取关（动态关注流）----
app.post('/follow', requireAuth, (req, res) => {
  const { followerDevice, followeeDevice, followeeMemberUserId } = req.body || {}
  if (!followerDevice || !followeeDevice) return res.json(err(1, '缺少 followerDevice / followeeDevice'))
  if (followerDevice === followeeDevice) return res.json(err(1, '不能关注自己'))
  db.prepare('INSERT OR IGNORE INTO follows (follower_device, followee_device, created_at) VALUES (?,?,?)').run(followerDevice, followeeDevice, now())
  // 互动消息：关注通知被关注者（真身份优先 memberUserId，演示态回退 device）
  emitNotification({
    deviceId: followeeDevice,
    memberUserId: followeeMemberUserId || '',
    type: 'follow',
    actorDevice: String(followerDevice || ''),
    actorName: String((req.user && req.user.raw && req.user.raw.nickname) || ''),
    targetType: 'user',
    targetId: '',
    content: '关注了你',
  })
  res.json(ok({ following: true }))
})
app.delete('/follow', requireAuth, (req, res) => {
  const { followerDevice, followeeDevice } = req.query
  if (!followerDevice || !followeeDevice) return res.json(err(1, '缺少 followerDevice / followeeDevice'))
  db.prepare('DELETE FROM follows WHERE follower_device=? AND followee_device=?').run(followerDevice, followeeDevice)
  res.json(ok({ following: false }))
})
app.get('/follow/list', (req, res) => {
  const { device } = req.query
  if (!device) return res.json(err(1, '缺少 device'))
  const rows = db.prepare('SELECT followee_device FROM follows WHERE follower_device=?').all(device)
  res.json(ok({ list: rows.map((r) => r.followee_device) }))
})
app.get('/follow/check', (req, res) => {
  const { follower, followee } = req.query
  if (!follower || !followee) return res.json(err(1, '缺少 follower / followee'))
  const row = db.prepare('SELECT 1 FROM follows WHERE follower_device=? AND followee_device=?').get(follower, followee)
  res.json(ok({ following: !!row }))
})

// ---- 举报（UGC 内容安全闭环）----
app.post('/feed/:id/report', requireAuth, (req, res) => {
  const { reason = '', reporterDevice = '' } = req.body || {}
  const row = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '动态不存在'))
  if (row.status !== 'published') return res.json(err(1, '该内容不可举报'))
  // 举报滥用限频：同一设备 10 分钟内最多 10 次举报（全站，不止同帖）
  if (reporterDevice) {
    const rptCnt = db.prepare('SELECT COUNT(*) c FROM reports WHERE reporter_device=? AND created_at >= ?').get(String(reporterDevice), new Date(Date.now() - 10 * 60 * 1000).toISOString())
    if (rptCnt.c >= 10) return res.json(err(1, '举报过于频繁，请稍后再试'))
  }
  // 同人同帖防重复
  const dup = db.prepare('SELECT 1 FROM reports WHERE feed_id=? AND reporter_device=? AND status=?').get(row.id, reporterDevice, 'pending')
  if (dup) return res.json(err(1, '已举报，处理中'))
  db.prepare('INSERT INTO reports (feed_id, reason, reporter_device, status, created_at) VALUES (?,?,?,?,?)').run(row.id, String(reason).slice(0, 100), String(reporterDevice || ''), 'pending', now())
  res.json(ok({ reported: true }))
})

// ---- 运营：举报处理 ----
app.get('/admin/reports', requireAdmin, (req, res) => {
  const { status = 'pending' } = req.query
  const w = status && status !== 'all' ? 'WHERE r.status = ?' : ''
  const args = status && status !== 'all' ? [status] : []
  const rows = db.prepare(`
    SELECT r.*, f.nickname, f.content, f.car_model, f.status AS feed_status
    FROM reports r LEFT JOIN feeds f ON f.id = r.feed_id
    ${w} ORDER BY r.id DESC
  `).all(...args)
  res.json(ok({ list: rows }))
})
app.put('/admin/reports/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM reports WHERE id=?').get(req.params.id)
  if (!row) return res.json(err(404, '举报不存在'))
  const { status = 'handled', action } = req.body || {}
  // action=offline 时下架对应帖
  if (action === 'offline') {
    db.prepare("UPDATE feeds SET status='offline', updated_at=? WHERE id=?").run(now(), row.feed_id)
  }
  db.prepare('UPDATE reports SET status=?, handled_at=? WHERE id=?').run(status, now(), row.id)
  res.json(ok({ id: row.id, status, action: action || null }))
})

// ---- 运营：内容审核记录（moderation_logs 审计链）----
app.get('/admin/moderation-logs', requireAdmin, (req, res) => {
  const { engine = 'all', result = 'all', pageSize = 50, page = 1 } = req.query
  const w = []; const args = []
  if (engine && engine !== 'all') { w.push('engine = ?'); args.push(engine) }
  if (result && result !== 'all') { w.push('result = ?'); args.push(result) }
  const where = w.length ? 'WHERE ' + w.join(' AND ') : ''
  const total = db.prepare(`SELECT COUNT(*) c FROM moderation_logs ${where}`).get(...args).c
  const size = Math.min(parseInt(pageSize) || 50, 200)
  const offset = ((parseInt(page) || 1) - 1) * size
  const list = db.prepare(`SELECT * FROM moderation_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, size, offset)
  res.json(ok({ list, total, page: parseInt(page) || 1, pageSize: size }))
})

// ---- 运营：违禁词管理（banned_words 表，增删即生效）----
app.get('/admin/banned-words', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM banned_words ORDER BY id DESC').all()
  res.json(ok({ list: rows, builtin: moderation.CUSTOM_WORDS }))
})
app.post('/admin/banned-words', requireAdmin, (req, res) => {
  const { word = '', operator = 'admin' } = req.body || {}
  const w = String(word).trim()
  if (!w) return res.json(err(1, '词不能为空'))
  try {
    db.prepare('INSERT OR IGNORE INTO banned_words (word, operator, created_at) VALUES (?,?,?)').run(w, String(operator).slice(0, 30), now())
  } catch (e) { return res.json(err(1, '添加失败：' + e.message)) }
  moderation.reload(db) // 重建词库，立即生效
  res.json(ok({ word: w }))
})
app.delete('/admin/banned-words/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM banned_words WHERE id=?').run(req.params.id)
  moderation.reload(db)
  res.json(ok({ id: req.params.id }))
})

// ---- 运营：封禁管理（device_id 维度生效；member_user_id 待 SEC-01 收口后联动）----
app.get('/admin/banned', requireAdmin, (req, res) => {
  const { status = 'active' } = req.query
  const rows = db.prepare('SELECT * FROM banned WHERE status=? ORDER BY id DESC').all(['active', 'lifted'].includes(status) ? status : 'active')
  res.json(ok({ list: rows }))
})
app.post('/admin/banned', requireAdmin, (req, res) => {
  const { deviceId = '', memberUserId = '', reason = '', operator = 'admin' } = req.body || {}
  if (!String(deviceId).trim() && !String(memberUserId).trim()) return res.json(err(1, 'deviceId 与 memberUserId 至少填一个'))
  const info = db.prepare('INSERT INTO banned (device_id, member_user_id, reason, operator, status, created_at) VALUES (?,?,?,?,?,?)')
    .run(String(deviceId).trim(), String(memberUserId).trim(), String(reason).slice(0, 200), String(operator).slice(0, 30), 'active', now())
  // SEC-01 方向2：通知 ToC 强踢（未配置则跳过，不阻断运营操作）
  notifyTocBan(memberUserId, deviceId, reason)
  res.json(ok(db.prepare('SELECT * FROM banned WHERE id=?').get(info.lastInsertRowid)))
})
app.put('/admin/banned/:id', requireAdmin, (req, res) => {
  const { status = 'lifted', operator = 'admin' } = req.body || {}
  if (!['active', 'lifted'].includes(status)) return res.json(err(1, '状态不合法'))
  db.prepare('UPDATE banned SET status=?, lifted_at=?, operator=? WHERE id=?').run(status, status === 'lifted' ? now() : null, String(operator).slice(0, 30), req.params.id)
  res.json(ok({ id: req.params.id, status }))
})

// ============================================================
// 精选（Shopify）模块 —— 混合方案
//   M-MVP0：前端首页聚合 + 商品卡 WebView 开 Shopify 店；
//           后端仅做配置下发 + 订单回流（Webhook）。
//   M-MVP1：前端调 /mall-api/products 服务端代拉聚合；Multipass 归户。
//   store domain / token 仅服务端持有，前端经 /mall-api/config 拿 domain 拼 WebView URL。
// ============================================================
// 多店路由：每个国家独立 Shopify 店，按用户 region 切换（2026-08-19 坤哥拍板）
//   US = 第一个（marsantsx.com）；后续国家开店后在此加映射项即可，前端零改。
//   环境变量按 region 覆盖：SHOPIFY_STORE__US / SHOPIFY_STORE__CN ...；缺省回退 US。
const REGION_STORES = {
  US: {
    store: process.env.SHOPIFY_STORE__US || process.env.SHOPIFY_STORE || 'www.marsantsx.com',
    currency: process.env.SHOPIFY_CURRENCY__US || process.env.SHOPIFY_CURRENCY || 'USD',
    storefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN__US || process.env.SHOPIFY_STOREFRONT_TOKEN || '',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET__US || process.env.SHOPIFY_WEBHOOK_SECRET || '',
  },
  // CN: { store: process.env.SHOPIFY_STORE__CN || 'pxid.myshopify.com', currency: 'CNY', storefrontToken:'', webhookSecret:'' }, // TODO 真实中国店
  // DE: { store: process.env.SHOPIFY_STORE__DE || 'pxid-de.myshopify.com', currency: 'EUR', storefrontToken:'', webhookSecret:'' }, // TODO 真实德国店
}
const DEFAULT_REGION = 'US'
const SUPPORTED_REGIONS = Object.keys(REGION_STORES)

// 解析 region：非法/缺失 → 回退默认；前端可传 ?region= 或 header x-region
function resolveRegion(region) {
  const r = (region || '').toString().toUpperCase()
  return REGION_STORES[r] ? r : DEFAULT_REGION
}
// 按 Shopify webhook 的 shop_domain 反查 region（多店订单回流）
function resolveRegionByShopDomain(shopDomain) {
  if (!shopDomain) return DEFAULT_REGION
  const sd = String(shopDomain).toLowerCase().replace(/\.myshopify\.com$/, '')
  for (const r of SUPPORTED_REGIONS) {
    const s = REGION_STORES[r].store.toLowerCase().replace(/^www\./, '').replace(/\.myshopify\.com$/, '')
    if (sd === s || String(shopDomain).toLowerCase().includes(s)) return r
  }
  return DEFAULT_REGION
}
function getStoreConfig(region) {
  return REGION_STORES[resolveRegion(region)]
}

// tags 兼容：Shopify 列表接口返回数组，单品接口返回逗号字符串，统一成数组
function toTags(p) {
  if (Array.isArray(p.tags)) return p.tags
  if (typeof p.tags === 'string' && p.tags) return p.tags.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

// 服务端归一化（与前端 api/shop.js 字段对齐，供 M-MVP1 聚合源）
function normalizeProduct(p, store, currency) {
  const v0 = (p.variants && p.variants[0]) || {}
  const imgs = (p.images || []).map((i) => i.src).filter(Boolean)
  const type = (p.product_type || '').toLowerCase()
  const tagsArr = toTags(p)
  const tags = tagsArr.join(' ').toLowerCase()
  const collection = /bike|ebike|scooter|electric/.test(type + ' ' + tags) ? 'spring' : 'p1parts'
  const desc = stripUnsafe(p.body_html || '')
  var _fbDesc = (desc && desc.length > 30) ? desc : generateFallbackDescription(p);
  // tagline：取描述首句（去标签后截断）
  const tagline = desc
    ? desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
    : ''
  return {
    id: String(p.id),
    handle: p.handle,
    name: p.title,
    price: Number(v0.price) || 0,
    origin: v0.compare_at_price ? Number(v0.compare_at_price) : null,
    currency,
    vendor: p.vendor || '',
    cover: imgs[0] || (p.featured_image && p.featured_image.src) || '',
    images: imgs,
    tag: tagsArr[0] || p.product_type || '',
    tags: tagsArr,
    collection,
    shopUrl: `https://${store}/products/${p.handle}`,
    description: _fbDesc,
    tagline,
    sellingPoints: extractSellingPoints(p),
    specs: extractSpecs(p),
    options: (p.options || []).map((o) => ({ name: o.name, values: o.values || [] })),
    variants: (p.variants || []).map((v) => ({
      id: String(v.id),
      title: v.title,
      price: Number(v.price) || 0,
      available: v.available !== false,
      sku: v.sku || '',
    })),
  }
}

// 单品详情归一化：在 normalizeProduct 基础上补充 body_html 描述 / vendor / options
// 服务端 HTML 清洗（替代原 stripUnsafe 正则——有绕过路径 SEC-03）
// 仅保留安全排版标签；剥离 script/style/iframe/object/embed 及所有事件属性；
// 默认拦截 javascript: 等危险协议链接；危险标签直接丢弃（保留内部文本），避免 v-html 注入
function stripUnsafe(html) {
  if (!html) return ''
  return sanitizeHtml(String(html), {
    allowedTags: [
      'p', 'br', 'b', 'i', 'strong', 'em', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
      'a', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  })
}
// Fallback description generator - injected into server.js
// When Shopify body_html is empty, generate structured HTML from product data
function generateFallbackDescription(p) {
  var title = (p.title || "").trim();
  var vendor = (p.vendor || "").trim();
  var type = (p.product_type || "").toLowerCase();
  var sp = extractSellingPoints(p);
  var specs = extractSpecs(p);
  var opts = (p.options || []).filter(function(o) { return o.name && o.name !== "Title" && (o.values || []).length; });
  var scene = "", feature = "";
  if (/kick.*scooter|8 inch/.test(type + " " + title)) {
    scene = "city commute, campus travel, last-mile connection";
    feature = "Folding design fits in car trunk or subway, easy to carry anywhere";
  } else if (/ebike|electric.*bike|fat.*tire|pedal/.test(type + " " + title)) {
    scene = "outdoor riding, mountain trails, long-distance travel";
    feature = "Multi-level assist with professional shock absorption for any terrain";
  } else if (/scooter|three.*wheel/.test(type + " " + title) && !/kick/.test(type)) {
    scene = "city transport, leisure rides, short trips";
    feature = "Powerful motor with large capacity battery for car-like driving experience";
  } else {
    scene = "original parts, perfect fit for all PXID models";
    feature = "Same production craft and quality standards as original equipment";
  }
  var html = "<p><strong>" + esc(title) + "</strong>";
  if (vendor) html += " by <strong>" + esc(vendor) + "</strong>";
  html += " - " + feature + "</p>\n";
  if (sp.length) {
    html += "<h3>Key Highlights</h3>\n<ul>";
    sp.forEach(function(s) { html += "<li>" + esc(s) + "</li>"; });
    html += "</ul>\n";
  }
  if (specs.length) {
    html += "<h3>Specifications</h3>\n<table><tbody>";
    specs.forEach(function(s) { html += "<tr><th>" + esc(s.label) + "</th><td>" + esc(String(s.value)) + "</td></tr>"; });
    html += "</tbody></table>\n";
  }
  if (opts.length) {
    html += "<h3>Options</h3>\n<ul>";
    opts.forEach(function(o) { html += "<li><strong>" + esc(o.name) + ":</strong> " + o.values.map(function(v) { return esc(v); }).join(" / ") + "</li>"; });
    html += "</ul>\n";
  }
  html += "<p><em>Best for: " + scene + ".</em></p>";
  return html;
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
// 从 body_html 提取卖点（<li>/<strong> 列表）；空则按车型生成兜底卖点
function extractSellingPoints(p) {
  const html = p.body_html || ''
  const out = []
  if (html) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let m
    while ((m = liRe.exec(html)) && out.length < 6) {
      const t = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
      if (t) out.push(t)
    }
    if (out.length < 3) {
      const sRe = /<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi
      while ((m = sRe.exec(html)) && out.length < 6) {
        const t = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        if (t && t.length <= 40) out.push(t)
      }
    }
  }
  if (out.length === 0) {
    const type = ((p.product_type || '') + ' ' + (p.title || '')).toLowerCase()
    if (/kick.*scooter|滑板车|8 inch|便携/.test(type)) {
      out.push('一键折叠，轻松携带', '续航持久，满足日常通勤', '加宽踏板，骑行更稳')
    } else if (/ebike|electric.*bike|电助力|fat.*tire|pedal.*assist/.test(type)) {
      out.push('多档助力，续航可达 80km+', '爬坡有力，应对复杂地形', '可拆卸电池，充电灵活')
    } else if (/scooter|电动.*车|three.*wheel|三轮/.test(type) && !/kick/.test(type)) {
      out.push('动力充沛，城市畅行', '大容量电池，长续航出行', '舒适座驾，减震出色')
    } else if (/bike|ebike|scooter|electric/.test(type)) {
      out.push('强劲动力，续航持久', '轻量化车身，便携出行', '原厂品质，质保无忧')
    } else {
      out.push('原厂正品，品质保障', '即装即用，易于维护', '专属售后，无忧退换')
    }
  }
  return out.slice(0, 6)
}
// 规格参数：从 options 提取真实规格 + 品牌/类型基础项
function extractSpecs(p) {
  const specs = []
  const opts = (p.options || []).filter(
    (o) => o.name && o.name !== 'Title' && (o.values || []).length && !(o.values.length === 1 && o.values[0] === 'Default Title')
  )
  opts.forEach((o) => specs.push({ label: o.name, value: o.values.join(' / ') }))
  if (p.vendor) specs.unshift({ label: '品牌', value: p.vendor })
  if (p.product_type) specs.push({ label: '类型', value: p.product_type })
  return specs
}
function normalizeProductDetail(p, store, currency) {
  const v0 = (p.variants && p.variants[0]) || {}
  const imgs = (p.images || []).map((i) => i.src).filter(Boolean)
  const type = (p.product_type || '').toLowerCase()
  const tagsArr = toTags(p)
  const tags = tagsArr.join(' ').toLowerCase()
  const collection = /bike|ebike|scooter|electric/.test(type + ' ' + tags) ? 'spring' : 'p1parts'
  return {
    id: String(p.id),
    handle: p.handle,
    name: p.title,
    description: (function(){var d=stripUnsafe(p.body_html||'');return(d&&d.length>30)?d:generateFallbackDescription(p);})(),
    vendor: p.vendor || '',
    price: Number(v0.price) || 0,
    origin: v0.compare_at_price ? Number(v0.compare_at_price) : null,
    currency,
    cover: imgs[0] || (p.featured_image && p.featured_image.src) || '',
    images: imgs,
    tag: tagsArr[0] || p.product_type || '',
    tags: tagsArr,
    collection,
    shopUrl: `https://${store}/products/${p.handle}`,
    options: (p.options || []).map((o) => ({ name: o.name, values: o.values || [] })),
    variants: (p.variants || []).map((v) => ({
      id: String(v.id),
      title: v.title,
      price: Number(v.price) || 0,
      available: v.available !== false,
      sku: v.sku || '',
    })),
    tagline: (() => {
      const txt = (p.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return txt ? txt.slice(0, 60) : ''
    })(),
    sellingPoints: extractSellingPoints(p),
    specs: extractSpecs(p),
  }
}

// 单品详情：服务端代拉 Shopify 公开 /products/{handle}.json（含 body_html 描述/图廊/规格）
//   按 ?region= / x-region 选对应国家店；缺失回退 US。用于 H5 精选详情页真拉 Shopify 内容。
app.get('/mall-api/products/:handle', async (req, res) => {
  const region = resolveRegion(req.query.region || req.headers['x-region'])
  const cfg = getStoreConfig(region)
  const handle = req.params.handle
  try {
    const r = await fetch(`https://${cfg.store}/products/${handle}.json`)
    if (!r.ok) {
      if (r.status === 404) return res.json(ok({ product: null, region, store: cfg.store, error: 'not_found' }))
      throw new Error('HTTP ' + r.status)
    }
    const data = await r.json()
    const p = data.product
    if (!p) return res.json(ok({ product: null, region, store: cfg.store, error: 'not_found' }))
    res.json(ok({ product: normalizeProductDetail(p, cfg.store, cfg.currency), region, store: cfg.store }))
  } catch (e) {
    res.json(ok({ product: null, region, store: cfg.store, error: String(e.message || e) }))
  }
})

// 配置下发（不含 token）；支持 ?region= 或 header x-region，非法/缺失回退 US
app.get('/mall-api/config', (req, res) => {
  const region = resolveRegion(req.query.region || req.headers['x-region'])
  const cfg = getStoreConfig(region)
  res.json(ok({ region, store: cfg.store, currency: cfg.currency }))
})

// 商品列表（服务端代拉 Shopify 公开 products.json，M-MVP1 聚合源；M-MVP0 也可复用）
//   按 ?region= / x-region 选对应国家店；缺失回退 US
app.get('/mall-api/products', async (req, res) => {
  const region = resolveRegion(req.query.region || req.headers['x-region'])
  const cfg = getStoreConfig(region)
  try {
    const r = await fetch(`https://${cfg.store}/products.json?limit=250`)
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const data = await r.json()
    const list = (data.products || []).map((p) => normalizeProduct(p, cfg.store, cfg.currency))
    res.json(ok({ list, region, store: cfg.store }))
  } catch (e) {
    res.json(ok({ list: [], region, store: cfg.store, error: String(e.message || e) }))
  }
})


// ---- 结算接口：前端「立即购买」调用，后端按 region 拼 Shopify cart permalink（M-MVP0 走游客结账）
//   入参：{ variantId, qty, region }  region 缺省 US
//   返回：{ url, store, region, currency }
//   M-MVP1 升级点：改调 Storefront Cart API 建车返回 checkout url（需 storefrontToken，当前 permalink 零依赖即可跑通 guest checkout）
app.post('/mall-api/checkout', (req, res) => {
  try {
    const body = req.body || {}
    const variantId = String(body.variantId || '').trim()
    if (!variantId) return res.status(400).json(err(400, 'variantId required'))
    const region = resolveRegion(body.region || req.headers['x-region'])
    const cfg = getStoreConfig(region)
    const qty = Math.max(1, parseInt(body.qty || '1', 10) || 1)
    const url = 'https://' + cfg.store + '/cart/' + variantId + ':' + qty
    res.json(ok({ url: url, store: cfg.store, region: region, currency: cfg.currency }))
  } catch (e) {
    res.status(500).json(err(500, String(e.message || e)))
  }
})

// 中文省名 → ISO 3166-2 省码；中文国名 → ISO 3166-1 alpha-2（兜底，避免 Flutter 误传中文被 Shopify 拒）
const PROVINCE_CN2CODE = { '北京':'BJ','天津':'TJ','河北':'HE','山西':'SX','内蒙古':'NM','辽宁':'LN','吉林':'JL','黑龙江':'HL','上海':'SH','江苏':'JS','浙江':'ZJ','安徽':'AH','福建':'FJ','江西':'JX','山东':'SD','河南':'HA','湖北':'HB','湖南':'HN','广东':'GD','广西':'GX','海南':'HI','重庆':'CQ','四川':'SC','贵州':'GZ','云南':'YN','西藏':'XZ','陕西':'SN','甘肃':'GS','青海':'QH','宁夏':'NX','新疆':'XJ','台湾':'TW','香港':'HK','澳门':'MO' }
const COUNTRY_CN2CODE = { '中国':'CN','中国大陆':'CN','美国':'US','美利坚':'US','巴西':'BR','巴西联邦共和国':'BR' }
function normCountryCode(c){ if(!c) return 'US'; const s=String(c).trim(); if(/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase(); return COUNTRY_CN2CODE[s]||'US' }
function normProvinceCode(p){ if(!p) return ''; const s=String(p).trim(); if(/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase(); return PROVINCE_CN2CODE[s]||s }
function normPhone(ph, country){ if(!ph) return ''; let s=String(ph).trim().replace(/[\s-]/g,''); if(s.startsWith('+')) return s; if(country==='CN'||!country){ return '+86'+s.replace(/^0/,'') } return '+'+s }

// M-MVP1 升级：Cart API 建车 + 自动预填邮箱/地址，返回 Shopify checkoutUrl（2026-08-22 真上线）
// 入参：{ variantId, qty, region, email, shippingAddress:{firstName,lastName,address1,address2,city,province,country,zip,phone} }
app.post('/mall-api/checkout-v2', async (req, res) => {
  try {
    const body = req.body || {}
    const rawVid = String(body.variantId || '').trim()
    if (!rawVid) return res.status(400).json(err(400, 'variantId required'))
    const region = resolveRegion(body.region || req.headers['x-region'])
    const cfg = getStoreConfig(region)
    const token = cfg.storefrontToken
    if (!token) return res.status(500).json(err(500, 'storefront token 未配置'))
    const qty = Math.max(1, parseInt(body.qty || '1', 10) || 1)
    const digits = rawVid.replace(/\D/g, '')
    const vid = /^gid:\/\//.test(rawVid) ? rawVid : (digits ? 'gid://shopify/ProductVariant/' + digits : '')
    if (!vid) return res.status(400).json(err(400, 'variantId 格式无效'))
    const buyerIdentity = {}
    if (body.email) buyerIdentity.email = String(body.email).trim()
    const a = body.shippingAddress
    if (a && (a.address1 || a.city)) {
      const country = normCountryCode(a.country)
      buyerIdentity.deliveryAddressPreferences = [{
        deliveryAddress: {
          firstName: String(a.firstName || ''),
          lastName: String(a.lastName || ''),
          address1: String(a.address1 || ''),
          address2: String(a.address2 || ''),
          city: String(a.city || ''),
          province: normProvinceCode(a.province),
          country: country,
          zip: String(a.zip || a.postalCode || ''),
          phone: normPhone(a.phone, country),
        },
      }]
    }
    const query = `mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { code field message }
      }
    }`
    const variables = { input: { lines: [{ merchandiseId: vid, quantity: qty }], buyerIdentity } }
    const r = await fetch('https://' + cfg.store + '/api/2024-01/graphql.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    })
    if (!r.ok) return res.status(502).json(err(502, 'Shopify Cart API HTTP ' + r.status))
    const gql = await r.json()
    if (gql.errors) return res.status(502).json(err(502, 'Shopify GraphQL error: ' + JSON.stringify(gql.errors)))
    const cc = gql.data && gql.data.cartCreate
    const ue = cc && cc.userErrors
    if (ue && ue.length) return res.status(400).json(err(400, 'Shopify: ' + ue[0].message))
    const cart = cc && cc.cart
    if (!cart) return res.status(502).json(err(502, 'cart 创建失败'))
    res.json(ok({ url: cart.checkoutUrl, cartId: cart.id, region: region, currency: cfg.currency }))
  } catch (e) {
    res.status(500).json(err(500, String(e.message || e)))
  }
})

// 订单回流（Shopify Webhook：orders/create + fulfillment/update）
//   多店：从 payload 的 shop_domain 反查 region，用对应店的 webhookSecret 校验 HMAC；
//   安全（2026-08-20 P0）：未配置 secret 一律 503 拒绝接收（fail-closed），配置后必须通过 HMAC 校验。
app.post('/mall-api/webhook/orders', (req, res) => {
  try {
    const shopDomain = (req.body && (req.body.shop_domain || req.body.myshopify_domain)) || ''
    const region = resolveRegionByShopDomain(shopDomain)
    const cfg = getStoreConfig(region)
    const secret = cfg.webhookSecret
    if (!secret) {
      // 安全：未配置 webhook secret 时拒绝接收，避免任意伪造订单入库
      return res.status(503).json(err(503, 'webhook secret not configured'))
    }
    const hmac = req.headers['x-shopify-hmac-sha256'] || ''
    const calc = require('crypto').createHmac('sha256', secret).update(req.rawBody || Buffer.from(JSON.stringify(req.body))).digest('base64')
    if (calc !== hmac) return res.status(401).json(err(401, 'invalid hmac'))
    const o = req.body || {}
    const topic = (req.headers['x-shopify-topic'] || '')
    if (topic.includes('fulfillment')) {
      // fulfillment/update：按 order_id 更新履约状态
      const oid = String(o.order_id || (o.order && o.order.id) || '')
      if (!oid) return res.json(ok({ ignored: true }))
      const status = o.status || (o.latest_status || '')
      db.prepare('UPDATE d_mall_order_map SET fulfillment=? WHERE order_id=?').run(String(status), oid)
      return res.json(ok({ updated: oid, fulfillment: status, region }))
    }
    // orders/create（默认）
    const oid = String(o.id || '')
    if (!oid) return res.json(ok({ ignored: true }))
    const _ex = db.prepare('SELECT 1 FROM d_mall_order_map WHERE order_id=?').get(oid)
    if (_ex) return res.json(ok({ duplicate: true, order_id: oid }))
    const items = (o.line_items || []).map((it) => ({ title: it.title, qty: it.quantity, price: Number(it.price) || 0 }))
    db.prepare(`INSERT INTO d_mall_order_map (order_id, email, items_json, total, currency, fulfillment, raw_json, created_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      oid,
      String((o.customer && o.customer.email) || o.email || ''),
      JSON.stringify(items),
      Number(o.total_price) || 0,
      o.currency || cfg.currency,
      'pending',
      JSON.stringify(o).slice(0, 8000),
      now()
    )
    res.json(ok({ recorded: oid, region }))
  } catch (e) {
    res.status(500).json(err(500, String(e.message || e)))
  }
})

// 订单查询（按 email；M-MVP1 Multipass 归户后扩展为 deviceId/customer）
// 安全：已配置 USER_TOKEN_SECRET 时 fail-closed（P0-2）—— email 只能来自验真后的 token，禁止 query 回退。
// 匿名 token 无 email → 直接返回空列表，杜绝枚举他人订单。未配 secret 时保留 query email 过渡降级（仅告警一次）。
let _ordersFallbackWarned = false
app.get('/mall-api/orders', requireAuth, (req, res) => {
  const emailFromToken = req.user && req.user.email ? req.user.email : ''
  let email = emailFromToken

  if (!email && !USER_TOKEN_SECRET) {
    // 过渡降级：未配 USER_TOKEN_SECRET 时 req.user 为空，仍允许 query email，但打 warning（配了 secret 即走 fail-closed）
    const emailFromQuery = String(req.query.email || '')
    if (emailFromQuery) {
      if (!_ordersFallbackWarned) {
        console.warn('[pxid-feed] /mall-api/orders 使用 query email 回退（未配置 USER_TOKEN_SECRET 的过渡降级），存在 IDOR 风险，请配置 USER_TOKEN_SECRET')
        _ordersFallbackWarned = true
      }
      email = emailFromQuery
    }
  }

  if (!email) return res.json(ok({ list: [] }))
  const rows = db.prepare('SELECT * FROM d_mall_order_map WHERE email=? ORDER BY id DESC').all(email)
  res.json(ok({ list: rows }))
})

// ---- 健康检查 ----
app.get('/health', (req, res) => res.json(ok({ status: 'up', time: now(), version: APP_VERSION })))

// ---- 版本 ----
const APP_VERSION = '1.0.0'
app.get('/version', (req, res) => res.json(ok({ version: APP_VERSION })))

// ---- 全局错误处理（避免未捕获异常泄露堆栈）----
app.use((e, req, res, next) => {
  if (res.headersSent) return next(e)
  console.error('[pxid-feed] unhandled error:', e && e.message)
  res.status(500).json(err(500, '服务器内部错误'))
})

const PORT = process.env.PORT || 8700
// 启动：从 banned_words 表加载运营自定义词，重建本地词库
moderation.loadWordsFromDb(db)

app.listen(PORT, () => console.log(`[pxid-feed] listening on ${PORT} (admin enabled)`))

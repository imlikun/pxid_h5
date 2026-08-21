// ============================================================
// 内容审核模块（pxid-feed 内容安全，2026-08-20）
// ------------------------------------------------------------
// 两层审核：
//   ① 本地 DFA 词库（filter-sensitive-word）——同步拦截
//      发帖/评论时命中即拒绝，实现「有违禁词发不出」
//   ② 阿里云内容安全 2.0 复核——异步，发帖成功后调文本+图片审核
//      命中高危自动下架并记 moderation_logs（需 AK/SK，未配置自动跳过）
//
// 环境变量：
//   ALIYUN_AK_ID / ALIYUN_AK_SECRET   阿里云 AccessKey（内容安全产品线）
//   MODERATION_OFF=1                   整模块关闭（调试用）
// ============================================================

const { FilterSensitiveWord } = require('filter-sensitive-word')
const crypto = require('crypto')

// ---- 自定义词库（运营可随时往这加，部署后生效）----
// ① 广告引流/微商类（UGC 论坛重点防） ② BR 区葡语基础违禁词（内置词库不含）
const CUSTOM_WORDS = [
  // 广告引流
  '加微信', '加V信', '加v信', '加我微信', '加微', '加v', '加V', '微商', '私聊我', '私我', '联系我买',
  // 葡语基础违禁（BR：脏话/色情/毒品/暴力）
  'puta', 'caralho', 'foda', 'foder', 'droga', 'cocaina', 'cocaína', 'vadia', 'assassinar', 'suicidio', 'suicídio', 'trafico', 'tráfico',
  // 英语补充（内置已有 FUCK 等，补高频漏网）
  'bitch', 'asshole', 'motherfucker', 'sexo', 'porn',
]

// ---- 词库初始化（单例）----
// 六类全开：politics 政治 / ads 广告 / porn 色情 / violence 暴恐 / cult 邪教 / abuse 辱骂
// 词源 = 内置默认词（CUSTOM_WORDS，兜底）+ banned_words 表（运营后台可维护，动态生效）
let filter = null
let dbWords = [] // 当前生效的 DB 自定义词快照

function buildFilter(words) {
  return new FilterSensitiveWord({ useDefaultWords: true, words })
}

function getFilter() {
  if (filter) return filter
  filter = buildFilter(CUSTOM_WORDS)
  console.log(`[moderation] 本地词库就绪（内置六类 + 自定义 ${CUSTOM_WORDS.length} 词）`)
  return filter
}

/**
 * 从 banned_words 表加载运营词并重建词库
 * 服务启动时 + 违禁词增删后调用；表不存在（老环境）时自动回退内置默认词
 * @returns {number} 生效的自定义词总数
 */
function loadWordsFromDb(db) {
  let words = []
  try {
    const rows = db.prepare('SELECT word FROM banned_words').all()
    words = rows.map((r) => String(r.word || '').trim()).filter(Boolean)
  } catch (e) {
    console.warn('[moderation] banned_words 表不可用，回退内置默认词:', e.message)
  }
  dbWords = words
  const merged = [...new Set([...CUSTOM_WORDS, ...words])]
  filter = buildFilter(merged)
  console.log(`[moderation] 词库已重建（内置六类 + 自定义 ${merged.length} 词，其中 DB 运营词 ${words.length}）`)
  return merged.length
}

function reload(db) {
  return loadWordsFromDb(db)
}

/**
 * 同步拦截（本地词库）
 * @returns {{ pass: boolean, words: string[] }}
 */
function checkText(text) {
  const f = getFilter()
  try {
    const words = f.findAll(String(text || ''))
    // 去重保序
    const uniq = [...new Set(words)]
    return uniq.length ? { pass: false, words: uniq } : { pass: true, words: [] }
  } catch (e) {
    // 词库异常不阻塞发布（fail-open），记日志由阿里云复核兜底
    console.error('[moderation] 本地词库检查异常:', e.message)
    return { pass: true, words: [] }
  }
}

// ============================================================
// 阿里云内容安全 2.0 异步复核（可选）
// ============================================================
const AK_ID = process.env.ALIYUN_AK_ID || ''
const AK_SECRET = process.env.ALIYUN_AK_SECRET || ''
const GREEN_ENDPOINT = 'https://green.cn-shanghai.aliyuncs.com/'
const GREEN_VERSION = '2022-03-02'
const MODERATION_OFF = process.env.MODERATION_OFF === '1'

function isAliyunReady() {
  return !!(AK_ID && AK_SECRET)
}

// RFC3986 percent-encode（阿里云 RPC 签名专用）
function pctEncode(s) {
  return encodeURIComponent(String(s))
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

// 阿里云 RPC 风格签名（HMAC-SHA1，零依赖）
function buildSignedUrl(params) {
  const base = {
    Format: 'JSON',
    Version: GREEN_VERSION,
    AccessKeyId: AK_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomBytes(16).toString('hex'),
    Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  }
  const all = { ...base, ...params }
  const sortedKeys = Object.keys(all).sort()
  const canonical = sortedKeys.map((k) => pctEncode(k) + '=' + pctEncode(all[k])).join('&')
  const stringToSign = 'POST&%2F&' + pctEncode(canonical)
  const signature = crypto.createHmac('sha1', AK_SECRET + '&').update(stringToSign).digest('base64')
  return GREEN_ENDPOINT + '?' + canonical + '&' + pctEncode('Signature') + '=' + pctEncode(signature)
}

/**
 * 调阿里云文本审核（2.0：TextModerationPlus）
 * @param {string} text 待审文本
 * @param {string} service comment_detection（中文本地）| comment_multilingual_global（出海多语言）
 * @returns {Promise<{riskLevel:string, labels:string[]}|null>} null=调用失败
 */
async function aliyunTextCheck(text, service = 'comment_detection') {
  const body = {
    Action: 'TextModerationPlus',
    Service: service,
    ServiceParameters: JSON.stringify({ content: String(text).slice(0, 2000) }),
  }
  const url = buildSignedUrl(body)
  const r = await fetch(url, { method: 'POST' })
  const j = await r.json()
  if (j.code !== 200) {
    console.error('[moderation] 阿里云文本审核返回异常:', j.code, j.message || '')
    return null
  }
  const d = j.data || {}
  return { riskLevel: d.riskLevel || '', labels: (d.labels || []).map((l) => l.label || l) }
}

/**
 * 调阿里云图片审核（2.0：ImageModeration，postImageCheck）
 * @param {string} url 图片公网 URL
 */
async function aliyunImageCheck(url) {
  const body = {
    Action: 'ImageModeration',
    Service: 'postImageCheck',
    ServiceParameters: JSON.stringify({ imageUrl: url }),
  }
  const r = await fetch(buildSignedUrl(body), { method: 'POST' })
  const j = await r.json()
  if (j.code !== 200) {
    console.error('[moderation] 阿里云图片审核返回异常:', j.code, j.message || '')
    return null
  }
  const d = j.data || {}
  return { riskLevel: d.riskLevel || '', labels: (d.labels || []).map((l) => l.label || l) }
}

/**
 * 发帖后异步复核入口（fire-and-forget）
 * @param {object} feedRow 已入库的 feed 行（含 id/content/images/region_code）
 * @param {object} db      better-sqlite3 实例（写 moderation_logs / 下架用）
 */
async function reviewFeed(feedRow, db) {
  if (MODERATION_OFF || !isAliyunReady()) {
    console.log('[moderation] 阿里云复核未启用（缺 ALIYUN_AK_ID/SECRET），仅本地词库拦截')
    return
  }
  const feedId = feedRow.id
  const text = feedRow.content || ''
  const images = (() => { try { return JSON.parse(feedRow.images || '[]') } catch (e) { return [] } })()
  // BR 区出海多语言，其余中文公聊评论
  const service = String(feedRow.region_code || '').toUpperCase() === 'BR' ? 'comment_multilingual_global' : 'comment_detection'

  try {
    // ① 文本复核
    let block = false
    let detail = []
    if (text) {
      const t = await aliyunTextCheck(text, service)
      if (t) {
        detail.push('text:' + (t.riskLevel || '-') + '[' + t.labels.join(',') + ']')
        if (t.riskLevel === 'high' || t.labels.includes('political_highrisk') || t.labels.includes('porn_highrisk')) block = true
      }
    }
    // ② 图片复核（最多 9 张）
    const checkedImgs = images.slice(0, 9)
    for (const img of checkedImgs) {
      if (!img) continue
      const im = await aliyunImageCheck(img)
      if (im) {
        detail.push('img:' + (im.riskLevel || '-') + '[' + im.labels.join(',') + ']')
        if (im.riskLevel === 'high') block = true
      }
    }
    // ③ 落日志 + 高危下架
    if (block) {
      db.prepare("UPDATE feeds SET status='offline', updated_at=? WHERE id=?").run(new Date().toISOString(), feedId)
      db.prepare('INSERT INTO moderation_logs (feed_id, content, engine, result, detail, created_at) VALUES (?,?,?,?,?,?)')
        .run(feedId, String(text).slice(0, 200), 'aliyun', 'block', detail.join(' | ').slice(0, 500), new Date().toISOString())
      console.log(`[moderation] 帖 ${feedId} 阿里云复核命中高危，已自动下架：`, detail.join(' | '))
    } else {
      db.prepare('INSERT INTO moderation_logs (feed_id, content, engine, result, detail, created_at) VALUES (?,?,?,?,?,?)')
        .run(feedId, String(text).slice(0, 200), 'aliyun', 'pass', detail.join(' | ').slice(0, 500), new Date().toISOString())
    }
  } catch (e) {
    // 复核失败不阻塞（已发布的帖靠举报/人工兜底）
    console.error(`[moderation] 帖 ${feedId} 阿里云复核异常:`, e.message)
  }
}

// 本地词库拦截命中时也记一条日志（审计）
function logLocalBlock(db, feedId, text, words) {
  try {
    db.prepare('INSERT INTO moderation_logs (feed_id, content, engine, result, detail, created_at) VALUES (?,?,?,?,?,?)')
      .run(feedId, String(text || '').slice(0, 200), 'local', 'block', words.slice(0, 10).join('、'), new Date().toISOString())
  } catch (e) { /* 日志失败不影响主流程 */ }
}

module.exports = { checkText, reviewFeed, logLocalBlock, isAliyunReady, CUSTOM_WORDS, loadWordsFromDb, reload }

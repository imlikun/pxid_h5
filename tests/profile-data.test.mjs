import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { DatabaseSync } from 'node:sqlite'

// Run the production handlers in an isolated database; no live user tokens or writes.
const source = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8')
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))
function harness() {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE feeds (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'published', device_id TEXT DEFAULT '', member_user_id TEXT DEFAULT '', nickname TEXT DEFAULT '', avatar TEXT DEFAULT '', car_model TEXT DEFAULT '');
    CREATE TABLE user_profiles (id INTEGER PRIMARY KEY, device_id TEXT DEFAULT '', member_user_id TEXT DEFAULT '', nickname TEXT DEFAULT '', avatar TEXT DEFAULT '', car_model TEXT DEFAULT '');
    CREATE TABLE favorites (feed_id INTEGER, device_id TEXT DEFAULT '', member_user_id TEXT DEFAULT '');
    CREATE TABLE follows (follower_device TEXT DEFAULT '', follower_member_user_id TEXT DEFAULT '', followee_device TEXT DEFAULT '', followee_member_user_id TEXT DEFAULT '', created_at TEXT, UNIQUE(follower_device, followee_device));`)
  const handlers = {}
  const points = [], notifications = []
  const context = vm.createContext({
    db, console: { log() {}, warn() {} }, now: () => '2026-10-10T12:00:00Z',
    app: Object.fromEntries(['get', 'post', 'delete'].map(method => [method, (path, ...callbacks) => {
      handlers[method + ' ' + path] = callbacks.at(-1)
    }])),
    requireAuth() {},
    resolveViewer: async req => ({ user: req.user || null }),
    resolveProfile: ({ memberUserId, deviceId }) => {
      const row = memberUserId
        ? db.prepare('SELECT * FROM user_profiles WHERE member_user_id=?').get(memberUserId)
        : deviceId ? db.prepare('SELECT * FROM user_profiles WHERE device_id=?').get(deviceId) : null
      return { nickname: row?.nickname || '', avatar: row?.avatar || '', carModel: row?.car_model || '' }
    },
    rowToFeed: row => ({ id: row.id, memberUserId: row.member_user_id }),
    ok: data => ({ code: 0, data }), err: (code, message) => ({ code, message }),
    addPoints: (...args) => points.push(args), emitNotification: data => notifications.push(data),
  })
  vm.runInContext(
    section('function userIdentityMatch(', 'function resolveIdentityByAlias(')
    + section('function buildViewerContext(', '// 关注按钮可见性')
    + section("app.get('/feed/me',", '// ---- 活跃用户')
    + section("app.get('/users/me',", '// ---- 编辑资料')
    + section("app.get('/users/:deviceId',", '// ---- 发帖')
    + section("app.post('/follow',", '// ---- 举报'), context)
  const member = (id, device = 'shared-phone') => ({ memberUserId: id, deviceId: device })
  const profile = (id, name, device = '') => db.prepare('INSERT INTO user_profiles(member_user_id,nickname,device_id) VALUES(?,?,?)').run(id, name, device)
  const feed = (id, mid, status = 'published') => db.prepare('INSERT INTO feeds(id,member_user_id,device_id,status) VALUES(?,?,?,?)').run(id, mid, 'shared-phone', status)
  const follow = (follower, followee, device = 'shared-phone', targetDevice = 'author-phone') => db.prepare('INSERT INTO follows VALUES(?,?,?,?,?)').run(device, follower, targetDevice, followee, '2026-10-10')
  async function call(path, { method = 'get', viewer = member('17'), query = {}, params = {}, body = {} } = {}) {
    let value, status = 200
    await handlers[method + ' ' + path]({ user: viewer, query, params, body, headers: {} },
      { status(code) { status = code; return this }, json(result) { value = result } })
    return { status, ...JSON.parse(JSON.stringify(value)) }
  }
  return { db, context, member, profile, feed, follow, call, points, notifications }
}

test('private published count equals the list and excludes other accounts on the same phone', async () => {
  const h = harness()
  try {
    h.profile('17', 'Owner'); h.profile('24', 'Other')
    h.feed(1, '17'); h.feed(2, '17'); h.feed(3, '24'); h.feed(4, '17', 'deleted')
    const own = await h.call('/users/me')
    const posts = await h.call('/feed/me')
    assert.equal(own.data.stats.posts, posts.data.total)
    assert.deepEqual(posts.data.list.map(x => x.id), [2, 1])
    assert.equal((await h.call('/feed/me', { viewer: h.member('24') })).data.total, 1)
  } finally { h.db.close() }
})

test('member-only stats and lists never match unrelated rows with empty member and device', async () => {
  const h = harness()
  try {
    h.profile('17', 'Owner'); h.profile('100', 'Rider')
    h.follow('17', '100', ''); h.follow('', '', 'empty-owner', '')
    h.db.prepare("INSERT INTO follows VALUES ('','','ghost','','2026-10-10')").run()
    const stats = await h.call('/users/me', { viewer: h.member('17', '') })
    const list = await h.call('/follow/list', { query: { member: '17' } })
    assert.equal(stats.data.stats.following, 1)
    assert.equal(list.data.list.length, 1)
    assert.equal(stats.data.stats.followers, 0)
    assert.equal((await h.call('/follow/followers', { query: { member: '17' } })).data.list.length, 0)
  } finally { h.db.close() }
})

test('follow lists keep member identities and resolve the correct profile on shared devices', async () => {
  const h = harness()
  try {
    h.profile('100', 'Rider A'); h.profile('101', 'Rider B', 'author-phone')
    h.follow('17', '100')
    const item = (await h.call('/follow/list', { query: { member: '17', device: 'shared-phone' } })).data.list[0]
    assert.equal(item.memberUserId, '100')
    assert.equal(item.nickname, 'Rider A')
    h.follow('24', '17', 'other-phone', 'shared-phone')
    const follower = (await h.call('/follow/followers', { query: { member: '17' } })).data.list[0]
    assert.equal(follower.memberUserId, '24')
  } finally { h.db.close() }
})

test('follow counters and lists use the same nonempty legacy-device fallback', async () => {
  const h = harness()
  try {
    h.profile('17', 'Owner')
    h.follow('17', '100', 'phone-17', 'a')
    h.follow('', '101', 'shared-phone', 'b')
    h.follow('24', '102', 'shared-phone', 'c')
    const stats = await h.call('/users/me')
    const list = await h.call('/follow/list', { query: { member: '17', device: 'shared-phone' } })
    assert.equal(stats.data.stats.following, 2)
    assert.equal(list.data.list.length, 2)
  } finally { h.db.close() }
})

test('public profile accepts verified ToC identity and hides another account favorites', async () => {
  const h = harness()
  try {
    h.profile('17', 'Owner'); h.profile('24', 'Other', 'shared-phone')
    h.feed(1, '17'); h.feed(2, '17', 'deleted')
    h.db.prepare('INSERT INTO favorites VALUES(?,?,?)').run(1, 'shared-phone', '17')
    h.db.prepare('INSERT INTO favorites VALUES(?,?,?)').run(2, 'shared-phone', '17')
    const own = (await h.call('/users/:deviceId', { params: { deviceId: '17' }, viewer: h.member('17', '') })).data
    assert.equal(own.isSelf, true)
    assert.equal(own.favoriteCount, 1)
    const other = (await h.call('/users/:deviceId', { params: { deviceId: '24' } })).data
    assert.equal(other.isSelf, false)
    assert.equal(other.favoriteCount, 0)
  } finally { h.db.close() }
})

test('viewer follow state and self state stay isolated across accounts on the same phone', () => {
  const h = harness()
  try {
    h.follow('17', '100', 'shared-phone', 'author-phone')
    h.follow('24', '101', 'shared-phone', 'other-author')
    const ctx = h.context.buildViewerContext(h.member('17'))
    assert.equal(h.context.followedFor({ device_id: 'author-phone', member_user_id: '100' }, ctx), true)
    assert.equal(h.context.followedFor({ device_id: 'author-phone', member_user_id: '101' }, ctx), false)
    assert.equal(h.context.isViewerSelf({ device_id: 'shared-phone', member_user_id: '24' }, ctx), false)
  } finally { h.db.close() }
})

test('following uses authenticated member and permits two accounts on one phone to follow the same rider', async () => {
  const h = harness()
  try {
    const body = { followerDevice: 'spoofed-device', followerMemberUserId: 'victim', followeeDevice: 'author-phone', followeeMemberUserId: '100' }
    await h.call('/follow', { method: 'post', body })
    await h.call('/follow', { method: 'post', body, viewer: h.member('24') })
    await h.call('/follow', { method: 'post', body })
    const rows = h.db.prepare('SELECT follower_member_user_id FROM follows ORDER BY follower_member_user_id').all()
    assert.deepEqual(rows.map(x => x.follower_member_user_id), ['17', '24'])
    assert.equal(h.points.length, 2)
    assert.equal((await h.call('/follow/check', { query: { followeeMember: '100', followerMember: 'victim', follower: 'wrong' } })).data.following, true)
    await h.call('/follow', { method: 'delete', query: { followerDevice: 'spoofed-device', followeeDevice: '100' } })
    assert.equal(h.db.prepare('SELECT COUNT(*) AS count FROM follows').get().count, 1)
    assert.equal((await h.call('/follow/check', { query: { followeeMember: '100' } })).data.following, false)
  } finally { h.db.close() }
})

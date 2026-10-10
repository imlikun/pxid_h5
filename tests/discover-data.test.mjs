import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { DatabaseSync } from 'node:sqlite'

// Execute the real Express read handlers against an isolated, in-memory SQLite
// database. No server startup, production database, secrets or write API involved.
const source = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8')
const handlersSource = source.slice(source.indexOf("app.get('/feed',"), source.indexOf('// ---- 我的发布（token'))
const identitySource = source.slice(source.indexOf('function followRelMatch('), source.indexOf('function resolveIdentityByAlias('))
function harness() {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE feeds (id INTEGER PRIMARY KEY, status TEXT, scheduled_at TEXT, kind TEXT, device_id TEXT, member_user_id TEXT, car_model TEXT, region_code TEXT, tags TEXT, pinned INTEGER, lat REAL, lng REAL);
    CREATE TABLE follows (follower_device TEXT, follower_member_user_id TEXT, followee_device TEXT, followee_member_user_id TEXT);`)
  const insert = db.prepare('INSERT INTO feeds VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
  function feed(id, options = {}) {
    const p = { status: 'published', scheduled: null, kind: 'moment', device: 'author', member: '100', model: 'P2', region: 'CN', tags: '["通勤骑行"]', pinned: 0, lat: 31, lng: 121, ...options }
    insert.run(id, p.status, p.scheduled, p.kind, p.device, p.member, p.model, p.region, p.tags, p.pinned, p.lat, p.lng)
  }
  const handlers = {}
  const context = vm.createContext({
    db, app: { get(path, handler) { handlers[path] = handler } }, now: () => '2026-10-10T12:00:00',
    resolveViewer: async req => ({ user: req.viewer || null }), buildViewerContext: viewer => viewer,
    rowToFeed: row => ({ id: row.id, carModel: row.car_model }), ok: data => ({ code: 0, data }), err: (code, message) => ({ code, message }),
  })
  vm.runInContext(identitySource + '\n' + handlersSource, context)
  async function read(path, query = {}, viewer = null) {
    let result, status = 200
    const response = { status(code) { status = code; return this }, json(value) { result = value } }
    await handlers[path]({ query, viewer }, response)
    return { status, ...JSON.parse(JSON.stringify(result)) }
  }
  return { db, feed, read }
}

test('topic and model are independent filters, applied before pagination', async () => {
  const h = harness()
  try {
    for (let id = 1; id <= 22; id++) h.feed(id, { model: id % 2 ? 'P2' : 'P3', tags: id <= 18 ? '["通勤骑行"]' : '["通勤骑行攻略"]' })
    const one = await h.read('/feed', { tab: 'dynamic', scope: 'all', topic: '通勤骑行', carModel: 'P2', region: 'CN', pageSize: 4, page: 1 })
    const two = await h.read('/feed', { tab: 'dynamic', scope: 'all', topic: '通勤骑行', carModel: 'P2', region: 'CN', pageSize: 4, page: 2 })
    assert.equal(one.data.total, 9)
    assert.deepEqual(one.data.list.map(x => x.id), [17, 15, 13, 11])
    assert.deepEqual(two.data.list.map(x => x.id), [9, 7, 5, 3])
    assert.equal((await h.read('/feed', { topic: "' OR 1=1 --" })).data.total, 0)
  } finally { h.db.close() }
})

test('following uses the authenticated account; no automatic official or another account posts', async () => {
  const h = harness()
  try {
    h.feed(1, { device: 'old-device', member: '100' })
    h.feed(2, { device: 'new-device', member: '100' })
    h.feed(3, { device: 'old-device', member: '101' })
    h.feed(4, { kind: 'official', device: 'official', member: '' })
    h.db.prepare('INSERT INTO follows VALUES (?,?,?,?)').run('same-phone', '17', 'old-device', '100')
    h.db.prepare('INSERT INTO follows VALUES (?,?,?,?)').run('same-phone', '24', 'official', '')
    const result = await h.read('/feed', { tab: 'dynamic', scope: 'follow', followerDevice: 'someone-else' }, { deviceId: 'same-phone', memberUserId: '17' })
    assert.deepEqual(result.data.list.map(x => x.id), [2, 1])
    assert.equal((await h.read('/feed', { tab: 'dynamic', scope: 'follow' })).status, 401)
    assert.equal((await h.read('/feed', { tab: 'dynamic', scope: 'all', followerDevice: 'same-phone' })).data.total, 4)
  } finally { h.db.close() }
})

test('nearby retains distance ordering and excludes posts without location', async () => {
  const h = harness()
  try {
    h.feed(1, { lng: 121.01 })
    h.feed(2, { lng: 121.3, pinned: 1 })
    h.feed(3, { lat: null, lng: null })
    const result = await h.read('/feed', { scope: 'near', near: '31,121', radius: 50, pageSize: 1 })
    assert.equal(result.data.total, 2)
    assert.deepEqual(result.data.list.map(x => x.id), [1])
    assert.equal((await h.read('/feed', { scope: 'near' })).status, 400)
    assert.equal((await h.read('/feed', { scope: 'near', near: '91,121' })).status, 400)
  } finally { h.db.close() }
})

test('topic catalog counts distinct published regional posts and ignores model tags', async () => {
  const h = harness()
  try {
    h.feed(1, { tags: '["通勤骑行"," #通勤骑行 ","P2","F1","act{1}"]' })
    h.feed(2, { region: 'US' })
    h.feed(3, { region: 'BR' })
    h.feed(4, { status: 'deleted' })
    h.feed(5, { scheduled: '2027-01-01' })
    h.feed(6, { tags: 'invalid JSON' })
    assert.deepEqual((await h.read('/feed/topics', { region: 'CN' })).data.list, [{ name: '通勤骑行', count: 2 }])
    assert.equal((await h.read('/feed', { region: 'CN', topic: '通勤骑行' })).data.total, 2)
  } finally { h.db.close() }
})

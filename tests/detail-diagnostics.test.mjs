import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import crypto from 'node:crypto'
import vm from 'node:vm'
const diagnostics = readFileSync(new URL('../src/utils/detailDiagnostics.js', import.meta.url), 'utf8')
const serverSource = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))
function client(fetch) {
  const data = new Map(), storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  let clock = 0
  const context = vm.createContext({ window: {}, location: { hash: '#/feed/1' }, localStorage: storage, sessionStorage: storage,
    performance: { now: () => clock }, fetch, AbortController, setTimeout, clearTimeout, console })
  vm.runInContext(diagnostics.replace(/import\.meta\.env\.VITE_API_BASE/g, "'https://example.test'").replace(/export /g, ''), context)
  context.installDetailDiagnostics()
  return { context, advance: ms => { clock += ms }, read: () => plain(context.window.__PXID_DETAIL_DIAGNOSTICS__.read()) }
}
test('fast details retain bounded local timings and do not send telemetry', () => {
  let calls = 0
  const h = client(async () => { calls++; return {} })
  for (let i = 0; i < 35; i++) {
    const trace = h.context.createDetailTrace('feed', '/feed/1')
    h.advance(20); trace.ready('snapshot', true); trace.media(); trace.close()
  }
  assert.equal(calls, 0)
  assert.equal(h.read().length, 30)
  assert.ok(h.read().every(row => row.stages.content === 20 && row.notified))
})
test('slow details report timings once and never include raw routes or account data', () => {
  const sent = [], h = client(async (_url, options) => { sent.push(JSON.parse(options.body)); return {} })
  h.context.recordDetailIntent('/feed/1?token=must-not-log')
  const trace = h.context.createDetailTrace('feed', '/feed/1')
  h.advance(3000); trace.ready('api', false); trace.media(); trace.error(); trace.close()
  assert.equal(sent.length, 1)
  assert.equal(sent[0].stages.content, 3000)
  assert.equal(JSON.stringify(sent).includes('must-not-log'), false)
  assert.equal('route' in sent[0], false)
})
test('network timings expose response/header/server correlation independently', async () => {
  const h = client(async () => { h.advance(50); return { ok: true, status: 200,
    headers: new Headers({ 'Server-Timing': 'app;dur=12.5, shopify;dur=6.0', 'X-Request-ID': 'a123456789abcdef', 'X-Detail-Cache': 'miss', 'X-Upstream-Status': '429' }),
    json: async () => { h.advance(10); return { code: 0, data: {} } } } })
  const trace = h.context.createDetailTrace('feed', '/feed/1')
  try {
    await h.context.fetchDetailJSON('feed', 'https://example.test/feed/1')
    const row = h.read().at(-1)
    assert.equal(row.request.duration, 60); assert.equal(row.request.headers, 50)
    assert.deepEqual(row.request.server, { app: 13, shopify: 6, cache: 'miss', upstreamStatus: 429 })
    assert.equal(row.request.id, 'a123456789abcdef')
  } finally { trace.close() }
})
test('timeout remains active while reading the response body', async () => {
  const h = client(async (_url, { signal }) => ({ ok: true, status: 200, headers: new Headers(),
    json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) }))
  await assert.rejects(h.context.fetchDetailJSON('product', 'https://example.test/product', { timeout: 5 }), /aborted/)
})
test('navigation cancellation aborts a detail request immediately', async () => {
  let aborted = false
  const h = client((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) }, { once: true })))
  const controller = new AbortController()
  const pending = h.context.fetchDetailJSON('product', 'https://example.test/product', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, /aborted/)
  assert.equal(aborted, true)
})
test('server report sanitizer drops extra fields, credentials and invalid durations', () => {
  const start = serverSource.indexOf('function sanitizeDetailDiagnostic(')
  const context = vm.createContext({})
  vm.runInContext(serverSource.slice(start, serverSource.indexOf("app.post('/diagnostics/detail'", start)), context)
  const row = plain(context.sanitizeDetailDiagnostic({ id: 'a'.repeat(32), kind: 'feed', status: 'ready', authorization: 'secret', nickname: 'private',
    stages: { content: 3000, auth: -1, url: 'https://example.test/?token=secret' },
    request: { id: 'sensitive string', outcome: 'ok', duration: 99, server: { app: 0, shopify: Infinity } } }))
  assert.equal(row.id, ''); assert.equal(row.request.id, '')
  assert.deepEqual(row.stages, { content: 3000 })
  assert.equal(JSON.stringify(row).includes('secret'), false)
  assert.equal(context.sanitizeDetailDiagnostic({ kind: 'other', status: 'ready' }), null)
})
test('real HTTP responses carry request IDs and server timing headers', async () => {
  let middleware
  const app = { use: fn => { middleware = fn } }, logs = []
  const start = serverSource.indexOf('// Detail timing:')
  const context = vm.createContext({ app, crypto, performance, console: { log: (...args) => logs.push(args) } })
  vm.runInContext(serverSource.slice(start, serverSource.indexOf('// ---- 请求日志', start)), context)
  const server = createServer((req, res) => {
    req.path = new URL(req.url, 'http://localhost').pathname
    middleware(req, res, () => { res.setHeader('Content-Type', 'application/json'); res.end('{"code":0}') })
  }).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try {
    const r = await fetch('http://127.0.0.1:' + server.address().port + '/feed/1')
    assert.match(r.headers.get('X-Request-ID'), /^[a-f0-9]{16}$/)
    assert.match(r.headers.get('Server-Timing'), /^app;dur=[\d.]+$/)
    await r.json()
    assert.equal(logs.length, 1)
    assert.equal(JSON.parse(logs[0][1]).kind, 'feed')
  } finally { await new Promise(resolve => server.close(resolve)) }
})
test('Shopify upstream timeout covers a stalled JSON body', async () => {
  let handler, result
  const start = serverSource.indexOf("app.get('/mall-api/products/:handle'")
  const context = vm.createContext({ app: { get: (_path, fn) => { handler = fn } },
    resolveRegion: () => 'CN', getStoreConfig: () => ({ store: 'example.test', currency: 'USD' }),
    performance, AbortController, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 5)), clearTimeout,
    ok: data => ({ code: 0, data }), normalizeProductDetail: x => x,
    fetch: async (_url, { signal }) => ({ ok: true, status: 200,
      json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) }),
  })
  const helpers = serverSource.slice(serverSource.indexOf('// Public Shopify reads only:'), serverSource.indexOf('// 单品详情：'))
  vm.runInContext(helpers + serverSource.slice(start, serverSource.indexOf('// 配置下发', start)), context)
  await handler({ query: {}, headers: {}, params: { handle: 'bike' }, detailTiming: {} }, { json: data => { result = data } })
  assert.equal(result.data.error, 'upstream_timeout')
  assert.equal(result.data.product, null)
})

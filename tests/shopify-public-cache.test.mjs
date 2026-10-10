import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync(new URL('../server/server.js', import.meta.url), 'utf8')
const helper = source.slice(source.indexOf('// Public Shopify reads only:'), source.indexOf('// 单品详情：'))
const detailOptions = { ttl: 30000, validate: data => !!data.product }
const catalogOptions = { ttl: 60000, staleMs: 600000, validate: data => Array.isArray(data.products) }
function harness(fetch) {
  let clock = 1000000
  const context = vm.createContext({ fetch, performance, AbortController, setTimeout, clearTimeout, Date: { now: () => clock, parse: Date.parse } })
  vm.runInContext(helper, context)
  return { read: context.getShopifyPublicJSON, advance: ms => { clock += ms }, context }
}
const response = (data, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => data })
test('concurrent public detail reads share one request then hit short cache', async () => {
  let calls = 0
  const h = harness(async () => { calls++; await new Promise(r => setTimeout(r, 10)); return response({ product: { id: 1 } }) })
  const rows = await Promise.all(Array.from({ length: 3 }, () => h.read('shop.test', '/products/a.json', detailOptions)))
  assert.equal(calls, 1)
  assert.deepEqual(rows.map(row => row.cache), ['miss', 'joined', 'joined'])
  assert.equal((await h.read('shop.test', '/products/a.json', detailOptions)).cache, 'hit')
  h.advance(30001)
  await h.read('shop.test', '/products/a.json', detailOptions)
  assert.equal(calls, 2)
})
test('cache keys isolate stores and handles and retained results are bounded', async () => {
  let calls = 0
  const h = harness(async url => { calls++; return response({ product: { url } }) })
  const a = await h.read('a.test', '/products/a.json', detailOptions)
  const b = await h.read('b.test', '/products/a.json', detailOptions)
  assert.notEqual(a.data.product.url, b.data.product.url)
  for (let i = 0; i < 50; i++) await h.read('a.test', '/products/' + i + '.json', detailOptions)
  assert.equal(vm.runInContext('shopifyPublicCache.size', h.context), 48)
  assert.equal(calls, 52)
})
test('429 cooldown blocks repeat upstream requests across handles and expires', async () => {
  let calls = 0, limited = true
  const h = harness(async () => { calls++; return limited ? response({}, 429, { 'retry-after': '1000' }) : response({ product: { id: 1 } }) })
  await assert.rejects(h.read('shop.test', '/products/a.json', detailOptions), error => error.status === 429)
  await assert.rejects(h.read('shop.test', '/products/b.json', detailOptions), error => error.cache === 'cooldown')
  assert.equal(calls, 1)
  h.advance(59000)
  await assert.rejects(h.read('shop.test', '/products/b.json', detailOptions))
  assert.equal(calls, 1)
  h.advance(1001); limited = false
  assert.equal((await h.read('shop.test', '/products/b.json', detailOptions)).data.product.id, 1)
  assert.equal(calls, 2)
})
test('recent catalog survives rate limit; stale purchase options never masquerade as fresh', async () => {
  let limited = false
  const h = harness(async url => limited ? response({}, 429) : response(url.includes('products.json') ? { products: [{ id: 1 }] } : { product: { price: 200 } }))
  await h.read('shop.test', '/products.json', catalogOptions)
  await h.read('shop.test', '/products/a.json', detailOptions)
  h.advance(61000); limited = true
  assert.equal((await h.read('shop.test', '/products.json', catalogOptions)).cache, 'stale')
  await assert.rejects(h.read('shop.test', '/products/a.json', detailOptions), error => error.reason === 'upstream_rate_limited')
  h.advance(600001)
  await assert.rejects(h.read('shop.test', '/products.json', catalogOptions))
})
test('invalid or failed upstream payloads cannot poison public cache', async () => {
  let calls = 0
  const h = harness(async () => response(++calls === 1 ? { unrelated: 'not a catalog' } : { products: [] }))
  await assert.rejects(h.read('shop.test', '/products.json', catalogOptions))
  assert.deepEqual((await h.read('shop.test', '/products.json', catalogOptions)).data.products, [])
  assert.equal(calls, 2)
})

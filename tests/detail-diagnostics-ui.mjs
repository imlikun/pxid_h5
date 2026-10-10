// Exercise real components and native-ready timing; every external request is intercepted.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
const require = createRequire(new URL('../package.json', import.meta.url))
const puppeteer = require('puppeteer-core')
const base = process.env.DISCOVER_QA_URL || 'http://127.0.0.1:5176'
const out = process.env.DETAIL_QA_DIR || join(tmpdir(), 'pxid-detail-qa')
mkdirSync(out, { recursive: true })
const executablePath = process.env.CHROME_BIN || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync)
const browser = await puppeteer.launch({ executablePath, headless: true })
const checks = [], errors = []
const feed = { id: 991, kind: 'official', itemType: 'moment', title: '城市骑行，记录沿途风景', author: 'PXID 视觉实验室', content: '周末沿河骑行，分享这次的通勤体验。', deviceId: 'official', images: ['/feed_r1.jpg', '/feed_r2.jpg', '/feed_r3.jpg'], cover: '/feed_r1.jpg', tags: ['通勤骑行'], likes: 12, comments: 0, createdAt: '2026-10-10T08:00:00Z' }
const product = { id: 1, handle: 'qa-part', name: '原厂电机配件', price: 200, currency: 'USD', cover: '/feed_r1.jpg', images: ['/feed_r1.jpg'], options: [], variants: [{ id: 'variant-1', price: 200, available: true, selectedOptions: [] }], shopUrl: 'https://example.test/products/qa-part', collection: 'parts', presentationComplete: true }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function setup({ snapshots = true, longName = false, hungLocale = false, delay = 0, failFeed = false } = {}) {
  const page = await browser.newPage(), reports = [], requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewport({ width: 390, height: 844 })
  await page.evaluateOnNewDocument((feed, product, snapshots, hungLocale, longName) => {
    localStorage.clear(); sessionStorage.clear()
    if (longName) feed.author = 'PXID 视觉实验室官方内容创作与骑行体验中心'
    if (snapshots) {
      localStorage.setItem('pxid_fs_ls:991', JSON.stringify({ t: Date.now(), d: feed }))
      localStorage.setItem('pxid_product_entries_v2', JSON.stringify([{ handle: product.handle, region: 'CN', time: Date.now(), product }]))
    }
    window.__ready = []
    window.ToFlutter_H5PageReady = { postMessage: value => window.__ready.push(JSON.parse(value)) }
    window.PXIDBridge = { isNative: true, getToken: async () => '', getUserInfo: async () => ({}), getDeviceId: async () => 'detail-qa', getRegion: async () => 'CN', getLocale: () => hungLocale ? new Promise(() => {}) : Promise.resolve('zh'), setPullRefresh: () => {} }
  }, feed, product, snapshots, hungLocale, longName)
  await page.setRequestInterception(true)
  page.on('request', async r => {
    const u = new URL(r.url())
    if (u.hostname === '127.0.0.1') return r.continue()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'Server-Timing, X-Request-ID', 'server-timing': 'app;dur=24, shopify;dur=12', 'x-request-id': '0123456789abcdef' }
    if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
    requests.push({ path: u.pathname, at: Date.now() })
    if (u.pathname === '/diagnostics/detail') reports.push(JSON.parse(r.postData()))
    let data = { list: [], total: 0 }, status = 200
    if (u.pathname === '/feed') data = { list: [feed, { ...feed, id: 992 }], total: 2 }
    if (u.pathname === '/feed/topics') data = { list: [{ name: '通勤骑行', count: 2 }] }
    if (u.pathname === '/feed/991') { if (delay) await pause(delay); data = feed; if (failFeed) status = 503 }
    if (u.pathname === '/mall-api/products/qa-part') { if (delay) await pause(delay); data = { product } }
    if (u.pathname === '/mall-api/products/other') data = { product: { ...product, handle: 'other', name: '另一件原厂配件' } }
    if (u.pathname.includes('/comments')) data = { list: [], total: 0 }
    try { await r.respond({ status, contentType: 'application/json', headers: cors, body: JSON.stringify({ code: status === 200 ? 0 : status, data }) }) } catch { /* request cancelled on leave */ }
  })
  return { page, reports, requests }
}
try {
  for (const width of [375, 390, 430, 600, 1017, 1337]) {
    const { page } = await setup({ longName: true })
    await page.setViewport({ width, height: 844 })
    await page.goto(base + '/?lang=zh#/feed/991', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.nav-author__name')
    const box = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect().toJSON()
      return { name: r('.nav-author__name'), badge: r('.author--nav .badge-official'), meta: r('.nav-author__meta'), share: r('.detail-topbar--author .share'), overflow: document.documentElement.scrollWidth > innerWidth }
    })
    assert.equal(box.overflow, false)
    assert.ok(box.badge.left >= box.name.right - 1 && box.badge.right <= box.meta.right + 1)
    assert.ok(Math.abs(box.name.y - box.badge.y) < 6 && box.badge.right <= box.share.left)
    checks.push(`${width}px: official badge stays beside long author name; no overflow`)
    if (width === 390) await page.screenshot({ path: join(out, 'author-badge-running.png') })
    await page.close()
  }
  {
    const { page } = await setup()
    await page.goto(base + '/?lang=zh#/discover', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.fcard__discussion')
    const order = await page.$eval('.fcard', el => {
      const y = s => el.querySelector(s).getBoundingClientRect().y
      return [y('.fcard__title'), y('.fcard__foot'), y('.fcard__discussion')]
    })
    assert.ok(order[0] < order[1] && order[1] < order[2])
    await page.screenshot({ path: join(out, 'recommend-topic-running.png') })
    await page.click('.fcard__discussion button')
    await page.waitForFunction(() => location.hash.includes('tab=dynamic') && decodeURIComponent(location.hash).includes('通勤骑行'))
    checks.push('Recommendation title and author remain adjacent; bottom topic still opens discussion')
    await page.close()
  }
  {
    const { page, requests } = await setup({ delay: 3000, hungLocale: true })
    await page.goto(base + '/#/product/qa-part?region=CN&cover=%2Ffeed_r1.jpg', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__ready.length === 1)
    assert.equal(await page.$eval('.btn--buy', el => el.disabled), true)
    const timing = await page.evaluate(() => window.__PXID_DETAIL_DIAGNOSTICS__.read().find(row => row.kind === 'product'))
    assert.equal(timing.source, 'snapshot'); assert.ok(timing.stages.content < 1200)
    assert.ok(requests.some(row => row.path === '/mall-api/products/qa-part'))
    assert.ok((timing.stages.locale || 0) < 100)
    await page.waitForFunction(() => document.querySelector('.btn--buy')?.disabled === false)
    assert.equal(await page.evaluate(() => window.__ready.length), 1)
    checks.push('Product snapshot reports ready before slow detail and hung locale; buying waits for real detail')
    await page.close()
  }
  {
    const { page, reports } = await setup({ snapshots: false, delay: 2800 })
    await page.goto(base + '/?lang=zh#/feed/991', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__ready.length === 1)
    await page.waitForFunction(() => window.__PXID_DETAIL_DIAGNOSTICS__.read().some(row => row.request?.id))
    await pause(100)
    assert.equal(reports.length, 1)
    assert.ok(reports[0].stages.content >= 2500)
    assert.equal(reports[0].request.id, '0123456789abcdef')
    assert.equal(reports[0].request.server.app, 24)
    assert.equal('route' in reports[0], false)
    checks.push('Slow feed sends one timing-only report correlated with server response')
    await page.close()
  }
  {
    const { page } = await setup({ snapshots: false, failFeed: true })
    await page.goto(base + '/?lang=zh#/feed/991', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.empty__back')
    assert.ok((await page.$eval('.empty__txt', el => el.textContent)).includes('加载'))
    assert.equal(await page.$('.article'), null)
    checks.push('Failed real feed exposes retry instead of fake fallback content')
    await page.close()
  }
  {
    const { page, requests } = await setup({ delay: 2000 })
    await page.goto(base + '/?lang=zh#/product/qa-part?region=CN&cover=%2Ffeed_r1.jpg', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__ready.length === 1)
    await page.evaluate(() => window.__router.push('/product/other?region=CN&cover=%2Ffeed_r2.jpg'))
    await page.waitForFunction(() => document.querySelector('.info .name')?.textContent === '另一件原厂配件')
    await pause(2200)
    assert.equal(await page.$eval('.info .name', el => el.textContent), '另一件原厂配件')
    assert.equal(requests.filter(row => row.path === '/mall-api/products/qa-part').length, 1)
    checks.push('Leaving slow product cancels without retry or stale overwrite')
    await page.close()
  }
  assert.deepEqual(errors, [])
  writeFileSync(join(out, 'results.json'), JSON.stringify({ checks, errors }, null, 2))
  console.log(JSON.stringify({ checks, errors }, null, 2))
} finally { await browser.close() }

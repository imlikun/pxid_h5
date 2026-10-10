// Real activity-center UI with isolated account/signup fixtures, no live writes.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'
const require = createRequire(new URL('../package.json', import.meta.url))
const puppeteer = require('puppeteer-core')
const base = process.env.DISCOVER_QA_URL || 'http://127.0.0.1:5176'
const out = process.env.ACTIVITY_QA_DIR || join(tmpdir(), 'pxid-activity-qa')
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const checks = [], errors = [], requests = []
const events = [{ id: 11, title: '周末沿河骑行', content: '和车友一起出发', startDate: '2026-11-01', endDate: '2026-11-02', cover: '/feed_r1.jpg', kind: 'activity', location: '南京', signupCount: 1 }, { id: 12, title: '已经参加的骑行', startDate: '2026-09-01', endDate: '2026-09-02', cover: '/feed_r2.jpg' }, { id: 13, title: '已取消的报名', cover: '/feed_r3.jpg' }]
let mine = [{ status: 'joined', checked: false, activity: events[0] }, { status: 'joined', checked: true, activity: events[1] }, { status: 'cancelled', activity: events[2] }, { status: 'joined', activity: events[0] }]
let unauthorized = false, fail = false, slow = false
const page = await browser.newPage()
page.on('pageerror', error => errors.push(error.message))
await page.setRequestInterception(true)
page.on('request', async r => {
  const u = new URL(r.url())
  if (u.hostname === '127.0.0.1') return r.continue()
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
  if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers })
  requests.push({ path: u.pathname, auth: !!r.headers().authorization })
  let data = { list: [] }, status = 200
  if (u.pathname === '/activities') data = { list: events }
  if (u.pathname === '/activities/me') {
    if (slow) await new Promise(resolve => setTimeout(resolve, 600))
    status = unauthorized ? 401 : fail ? 503 : 200
    data = { list: mine }
  }
  if (/^\/activities\/\d+$/.test(u.pathname)) data = events.find(a => a.id === Number(u.pathname.split('/').at(-1)))
  try { await r.respond({ status, contentType: 'application/json', headers, body: JSON.stringify({ code: status === 200 ? 0 : status, data }) }) } catch {}
})
await page.evaluateOnNewDocument(() => {
  localStorage.clear(); sessionStorage.clear()
  window.PXIDBridge = { isNative: true, getToken: async () => 'activity-qa-only', getUserInfo: async () => ({ nickname: '测试账号', token: 'activity-qa-only' }), getDeviceId: async () => 'activity-qa', getLocale: async () => 'zh', getRegion: async () => 'CN', setPullRefresh: () => {} }
})
let navigation = 0
const goto = async (hash = '/activity-center', lang = 'zh') => page.goto(base + '/?lang=' + lang + '&qa=' + ++navigation + '#' + hash, { waitUntil: 'domcontentloaded' })
const clickTab = async label => page.$$eval('.activity-tabs button', (buttons, label) => buttons.find(button => button.textContent.trim() === label).click(), label)
try {
  await page.setViewport({ width: 390, height: 844 })
  await goto()
  await page.waitForSelector('.activity-card')
  assert.equal(requests.filter(r => r.path === '/activities/me').length, 0)
  await clickTab('已报名')
  await page.waitForFunction(() => document.querySelectorAll('.activity-card').length === 2)
  assert.ok(requests.some(r => r.path === '/activities/me' && r.auth))
  const text = await page.$eval('.activity-list', el => el.textContent)
  assert.ok(text.includes('周末沿河骑行') && text.includes('已经参加的骑行') && text.includes('已签到') && text.includes('已结束'))
  assert.ok(!text.includes('已取消的报名'))
  checks.push('Joined tab uses authenticated registrations, retains past/check-in state, omits cancelled and duplicate rows')
  await page.screenshot({ path: join(out, 'joined-activities-running.png') })
  await page.click('.activity-card')
  await page.waitForSelector('.signup')
  mine = [mine[1]] // Simulate cancellation through the existing signup API.
  await page.evaluate(() => window.__router.back())
  await page.waitForFunction(() => location.hash.includes('activity-center') && document.querySelectorAll('.activity-card').length === 1)
  assert.ok((await page.$eval('.activity-title', el => el.textContent)).includes('已经参加'))
  assert.ok((await page.$eval('.activity-tabs button[aria-pressed="true"]', el => el.textContent)).includes('已报名'))
  checks.push('Returning from detail refreshes joined list and keeps selected tab')
  mine = [{ status: 'joined', activity: events[0] }, mine[0]]
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForFunction(() => document.querySelectorAll('.activity-card').length === 2)
  checks.push('Resuming native page refreshes newly registered activity')
  slow = true
  await clickTab('全部活动'); await page.waitForSelector('.activity-card')
  await clickTab('已报名'); await clickTab('全部活动')
  await new Promise(resolve => setTimeout(resolve, 800))
  assert.equal(await page.$$eval('.activity-card', els => els.length), 3)
  checks.push('Late private response cannot overwrite all-events list after fast tab switch')
  slow = false; unauthorized = true
  await clickTab('已报名')
  await page.waitForFunction(() => document.querySelector('.empty')?.textContent.includes('登录后'))
  assert.equal(await page.$('.activity-card'), null)
  assert.ok((await page.$eval('.retry', el => el.textContent)).includes('去登录'))
  checks.push('Unauthorized account sees login entry, never public/mock registrations')
  unauthorized = false; fail = true
  await page.click('.retry')
  await page.waitForFunction(() => document.querySelector('.empty')?.textContent.includes('加载失败'))
  assert.equal(await page.$('.activity-card'), null)
  fail = false; mine = []
  await page.click('.retry')
  await page.waitForFunction(() => document.querySelector('.empty')?.textContent.includes('还没有报名'))
  checks.push('Failure provides retry; successful empty response displays truthful empty state')
  mine = [{ status: 'joined', activity: events[0] }]
  for (const [width, lang] of [[375, 'zh'], [390, 'en'], [430, 'pt'], [600, 'zh'], [1017, 'zh'], [1337, 'zh']]) {
    await page.setViewport({ width, height: 844 }); await goto('/activity-center?tab=joined', lang)
    await page.waitForSelector('.activity-card')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    checks.push(`${width}px/${lang}: joined deep link and layout fit`)
  }
  assert.deepEqual(errors, [])
  writeFileSync(join(out, 'results.json'), JSON.stringify({ checks, errors }, null, 2))
  console.log(JSON.stringify({ checks, errors }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ checks, errors }, null, 2)); throw error
} finally { await browser.close() }

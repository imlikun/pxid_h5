// Browser QA for the real H5 views with a native bridge fixture.
// All API traffic, including writes, is intercepted and never reaches production.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const require = createRequire(new URL('../package.json', import.meta.url))
const puppeteer = require('puppeteer-core')
const url = process.env.PROFILE_QA_URL || 'http://127.0.0.1:5176'
const out = process.env.PROFILE_QA_DIR || join(tmpdir(), 'pxid-profile-qa')
mkdirSync(out, { recursive: true })
const executablePath = process.env.CHROME_BIN || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync)
const browser = await puppeteer.launch({ executablePath, headless: true })
const page = await browser.newPage()
const checks = [], errors = [], requests = [], writes = []
let failure = '', slowPublish = false, longList = false, failMore = false, slowPublicProfile = false
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const profiles = {
  '17': { nickname: '李给解释解释', memberUserId: '17', deviceId: '', avatar: '/feed_default.jpg', carModel: 'F1', feedCount: 2, favoriteCount: 2, followeeCount: 1, followerCount: 0, isSelf: true },
  '24': { nickname: '另一个账号', memberUserId: '24', deviceId: '', avatar: '/feed_default.jpg', feedCount: 1, favoriteCount: 0, followeeCount: 0, followerCount: 0, isSelf: true },
}
const item = (id, member, content) => ({ id, itemType: 'moment', memberUserId: member, deviceId: 'same-phone', author: profiles[member]?.nickname || '骑友', avatar: '/feed_default.jpg', content, title: '', images: ['/feed_r1.jpg'], carModel: 'P2', tags: [], createdAt: '2026-10-10T08:00:00Z' })
page.on('pageerror', error => errors.push(error.message))
await page.setRequestInterception(true)
page.on('request', async request => {
  try {
    const target = new URL(request.url())
    if (target.hostname !== 'pxid-api.appin.site') {
      if (/^https?:/.test(request.url()) && target.hostname !== '127.0.0.1') {
        await request.respond({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#edf2ff"/></svg>' })
      } else await request.continue()
      return
    }
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS' }
    if (request.method() === 'OPTIONS') { await request.respond({ status: 204, headers }); return }
    const member = request.headers().authorization?.replace('Bearer qa-', '') || ''
    requests.push({ path: target.pathname, member, query: Object.fromEntries(target.searchParams) })
    if (!['GET', 'OPTIONS'].includes(request.method())) writes.push({ path: target.pathname, member, body: JSON.parse(request.postData() || '{}') })
    let data = {}, status = 200
    if (failure === target.pathname || (failMore && target.pathname === '/feed/me' && target.searchParams.get('page') === '2')) status = 503
    else if (target.pathname === '/users/me') {
      data = member === 'guest' ? { ...profiles['17'], memberUserId: '', deviceId: 'anonymous' } : { ...profiles[member] }
      if (!profiles[member] && member !== 'guest') status = 401
    } else if (target.pathname === '/users/profile') data = {}
    else if (target.pathname.startsWith('/users/')) {
      const id = target.pathname.split('/').at(-1)
      if (slowPublicProfile && id === '100') await pause(1200)
      data = { nickname: '骑友 ' + id, memberUserId: id, deviceId: '', feedCount: 1, followerCount: 0, followeeCount: 0, favoriteCount: 0, isSelf: false }
    } else if (target.pathname === '/feed/me') {
      if (slowPublish) await pause(600)
      const all = longList ? Array.from({ length: 16 }, (_, i) => item(300 + i, member, '分页动态 ' + i))
        : member === '24' ? [item(240, '24', '账号乙的发布')] : [item(235, '17', '恢复的发布一'), item(245, '17', '恢复的发布二')]
      const p = Number(target.searchParams.get('page') || 1)
      data = { total: all.length, list: all.slice((p - 1) * 15, p * 15) }
    } else if (target.pathname === '/favorites') data = { total: member === '17' ? 2 : 0, list: member === '17' ? [item(500, '24', '收藏的第一篇'), item(501, '24', '收藏的第二篇')] : [] }
    else if (target.pathname === '/follow/list') data = { list: [{ memberUserId: '100', deviceId: '', nickname: '只有会员ID的骑友', avatar: '/feed_default.jpg' }] }
    else if (target.pathname === '/follow/followers') data = { list: [] }
    else if (target.pathname === '/feed' && request.method() === 'GET') {
      const targetMember = target.searchParams.get('memberUserId')
      data = targetMember ? { total: 1, list: [item(Number(targetMember), targetMember, '骑友 ' + targetMember + ' 的发布')] } : { total: 0, list: [] }
    } else if (target.pathname === '/feed' && request.method() === 'POST') data = { id: 999 }
    else if (/^\/feed\/\d+$/.test(target.pathname)) data = item(Number(target.pathname.split('/').at(-1)), member, '详情正文')
    else data = { list: [], total: 0 }
    await request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(status === 200 ? { code: 0, data } : { code: status, message: 'Fixture failure' }) })
  } catch (error) {
    // Aborted old requests must not interfere with the next tab/user.
    if (!/Target closed|Session closed|Invalid InterceptionId|already handled/.test(error.message)) errors.push(error.message)
  }
})
await page.evaluateOnNewDocument(() => {
  window.qaMember = '17'
  window.qaNickname = '李给解释解释'
  window.PXIDBridge = {
    isNative: true,
    getUserInfo: async () => ({ memberUserId: window.qaMember === 'guest' ? '' : window.qaMember, token: 'qa-' + window.qaMember, nickname: window.qaNickname, avatar: '/feed_default.jpg', carModel: 'F1' }),
    getToken: async () => 'qa-' + window.qaMember,
    getDeviceId: async () => { throw new Error('Native device bridge unavailable') },
    getLocale: async () => 'zh', getRegion: async () => 'CN', getLocation: async () => null,
    setPullRefresh: () => {}, getFollowList: async () => [], getFansList: async () => [],
  }
})
const navigate = async hash => { await page.evaluate(hash => window.__router.push(hash), hash); await pause(400) }
const waitReady = () => page.waitForFunction(() => !document.querySelector('.u-error') && document.querySelector('.u-body')?.textContent && !document.querySelector('.u-body').textContent.includes('加载中…'))
const select = key => page.evaluate(key => {
  const labels = { publish: '发布', favorites: '收藏', follow: '关注', followers: '粉丝' }
  ;[...document.querySelectorAll('.u-grid__item')].find(el => el.textContent.includes(labels[key])).click()
}, key)
try {
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(url + '/?lang=zh#/user/me', { waitUntil: 'networkidle2' })
  await waitReady()
  assert.equal(await page.$$eval('.moment', els => els.length), 2)
  assert.deepEqual(await page.$$eval('.u-grid__item b', els => els.map(el => el.textContent)), ['2', '2', '1', '0'])
  checks.push('token-only native identity works without getDeviceId; stats agree with published list')
  await page.evaluate(() => { window.qaNickname = '更新后的昵称' })
  await navigate('/user/me?tab=favorites')
  await waitReady()
  assert.ok(await page.$eval('.u-body', el => el.textContent.includes('收藏的第一篇')))
  checks.push('same-profile query tab changes load the matching content')
  await navigate('/discover?tab=dynamic')
  await navigate('/user/me')
  await waitReady()
  assert.ok(writes.some(write => write.path === '/users/profile' && write.body.nickname === '更新后的昵称'))
  assert.ok(await page.$eval('.u-name', el => el.textContent.includes('更新后的昵称')))
  checks.push('native profile change persists through imported updateMyProfile and returns consistently')

  slowPublish = true
  await navigate('/user/me?tab=favorites')
  await waitReady()
  await select('publish'); await pause(80); await select('favorites')
  await waitReady(); await pause(1300)
  assert.ok(await page.$eval('.u-body', el => el.textContent.includes('收藏的第一篇') && !el.textContent.includes('恢复的发布')))
  slowPublish = false
  checks.push('late publish response cannot replace favorites after a fast tab switch')

  failure = '/follow/list'
  await select('follow')
  await page.waitForSelector('.u-error')
  assert.ok(await page.$eval('.u-error', el => el.textContent.includes('加载失败')))
  assert.equal(await page.$eval('.u-grid__item:nth-child(3) b', el => el.textContent), '1')
  failure = ''
  await page.click('.u-error button'); await waitReady()
  await page.click('.u-user')
  await page.waitForFunction(() => location.hash.includes('/user/100'))
  await waitReady()
  assert.ok(await page.$eval('.u-name', el => el.textContent.includes('骑友 100')))
  checks.push('follow error preserves count and retries; member-only follow entry opens correct profile')
  slowPublicProfile = true
  await navigate('/user/101'); await waitReady()
  await navigate('/user/100'); await pause(100); await navigate('/user/101')
  await waitReady(); await pause(700)
  assert.ok(await page.$eval('.u-name', el => el.textContent.includes('骑友 101')))
  assert.ok(await page.$eval('.u-body', el => el.textContent.includes('骑友 101 的发布')))
  slowPublicProfile = false
  checks.push('late previous-user response cannot overwrite the current user or feed')

  await navigate('/user/me'); await waitReady()
  await page.evaluate(() => { window.qaMember = '24'; window.qaNickname = '另一个账号' })
  await navigate('/discover?tab=dynamic'); await navigate('/user/me'); await waitReady()
  assert.ok(await page.$eval('.u-body', el => el.textContent.includes('账号乙的发布') && !el.textContent.includes('恢复的发布')))
  assert.equal(await page.$eval('.u-grid__item b', el => el.textContent), '1')
  await page.evaluate(() => { window.qaMember = ''; window.qaNickname = '' })
  await navigate('/discover?tab=dynamic'); await navigate('/user/me')
  await page.waitForSelector('.u-error')
  assert.ok(await page.$eval('.u-error', el => el.textContent.includes('登录信息已失效')))
  assert.deepEqual(await page.$$eval('.u-grid__item b', els => els.map(el => el.textContent)), ['—', '—', '—', '—'])
  checks.push('account switch refreshes token; logout clears previous account data and does not show fake zero counts')
  await page.evaluate(() => { window.qaMember = '17'; window.qaNickname = '李给解释解释' })
  await page.click('.u-error button'); await waitReady()

  failure = '/favorites'
  await select('favorites'); await page.waitForSelector('.u-error')
  assert.ok(await page.$eval('.u-body', el => !el.textContent.includes('还没有收藏')))
  failure = ''; await page.click('.u-error button'); await waitReady()
  await select('followers'); await waitReady()
  assert.ok(await page.$eval('.u-body', el => el.textContent.includes('还没有粉丝')))
  checks.push('list failure is distinguishable from a successful empty response and can retry')

  longList = true; failMore = true
  await select('publish'); await waitReady()
  assert.equal(await page.$$eval('.moment', els => els.length), 15)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForSelector('.u-error')
  failMore = false
  await page.click('.u-error button'); await waitReady()
  assert.equal(await page.$$eval('.moment', els => els.length), 16)
  checks.push('pagination failure retries the same page without dropping or duplicating earlier items')
  longList = false

  await navigate('/discover?tab=dynamic'); await navigate('/user/me'); await waitReady()
  for (const width of [375, 390, 430, 600, 1017, 1337]) {
    await page.setViewport({ width, height: 844 }); await pause(80)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: join(out, 'profile-' + width + '.png'), fullPage: true })
    checks.push(width + 'px profile: four stats, content, no horizontal overflow')
  }

  await page.evaluate(async () => {
    const module = await import('/src/bridge/index.js')
    const original = window.PXIDBridge
    window.PXIDBridge = { ...original, getUserInfo: async () => ({ token: 'qa-24' }) }
    if (await module.bridge.getAuthToken() !== 'qa-24') throw new Error('Replaced native bridge kept an old token')
    window.PXIDBridge = original
  })
  checks.push('late native bridge replacement invalidates warmed preview/account token')

  await page.evaluate(() => { window.qaMember = '17' })
  await navigate('/publish')
  await page.waitForSelector('textarea.content')
  await page.type('textarea.content', '有效会员发帖校验，本地拦截。')
  await page.click('button.post')
  await page.waitForFunction(() => location.hash.includes('/discover'))
  assert.equal(writes.filter(write => write.path === '/feed').at(-1)?.member, '17')
  checks.push('native publish refreshes token and posts with the verified current member')

  await page.evaluate(() => { window.qaMember = 'guest' })
  await navigate('/publish')
  await page.waitForSelector('textarea.content')
  await page.type('textarea.content', '原生身份校验测试，不应以匿名身份发到线上。')
  const before = writes.filter(write => write.path === '/feed').length
  await page.click('button.post')
  await page.waitForFunction(() => document.body.textContent.includes('App 登录信息未同步'))
  assert.equal(writes.filter(write => write.path === '/feed').length, before)
  checks.push('native anonymous token cannot publish into an identity missing its member ID')
  assert.deepEqual(errors, [])
  const report = { passed: checks.length, checks, errors }
  writeFileSync(join(out, 'result.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png'), fullPage: true }).catch(() => {})
  console.error(error)
  console.error(JSON.stringify({ checks, errors, lastRequests: requests.slice(-8) }, null, 2))
  process.exitCode = 1
} finally { await browser.close() }

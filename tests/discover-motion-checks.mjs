// Actual interaction/rendering checks against local fixtures; no API reaches production.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const require = createRequire(new URL('../package.json', import.meta.url))
const puppeteer = require('puppeteer-core')
const base = process.env.MOTION_QA_URL || 'http://127.0.0.1:5176/'
const out = process.env.MOTION_QA_DIR || join(tmpdir(), 'pxid-motion-qa')
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const checks = [], errors = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const feeds = Array.from({ length: 12 }, (_, i) => ({
  id: 1001 + i, itemType: 'moment', kind: 'moment', author: '测试车友',
  deviceId: 'motion-qa-rider', memberUserId: '101', avatar: '/feed_default.jpg',
  title: '沿河骑行，看看熟悉的城市', content: '分享一段通勤骑行，验证操作反馈与图片加载。',
  carModel: 'P2', tags: ['通勤骑行'], images: ['/feed_r1.jpg', '/feed_r2.jpg'],
  cover: '/feed_r1.jpg', likes: 10, comments: 0, time: '2026-10-10T08:00:00Z',
}))
try {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.setRequestInterception(true)
  page.on('request', async request => {
    const url = new URL(request.url())
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (url.hostname !== 'pxid-api.appin.site') return request.continue()
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })
    let data = { list: [], total: 0 }
    if (url.pathname === '/feed') data = { list: feeds, total: feeds.length }
    else if (/^\/feed\/\d+$/.test(url.pathname)) data = feeds.find(feed => feed.id === Number(url.pathname.split('/').at(-1)))
    await request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ code: 0, data }) })
  })
  await page.evaluateOnNewDocument(() => {
    window.PXIDBridge = {
      isNative: false, getUserInfo: async () => ({ nickname: '测试账号', memberUserId: 'qa', token: 'test-only-fixture' }),
      getToken: async () => 'test-only-fixture', getDeviceId: async () => 'motion-qa-device',
      getLocale: async () => 'zh', getRegion: async () => 'CN',
      openNative: () => {}, navigateTo: () => {}, exit: () => {},
    }
  })
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(base + '?lang=zh#/discover?tab=dynamic', { waitUntil: 'networkidle2' })
  await page.waitForSelector('.moment')
  const motion = await page.evaluate(async () => {
    const top = document.querySelector('.moment').getBoundingClientRect().top
    document.querySelector('.model-trigger').click()
    await new Promise(requestAnimationFrame)
    const menu = document.querySelector('.model-options')
    return { before: top, after: document.querySelector('.moment').getBoundingClientRect().top, animations: menu.getAnimations().length, focused: menu.contains(document.activeElement), overflow: document.documentElement.scrollWidth > innerWidth }
  })
  assert.equal(motion.before, motion.after)
  assert.equal(motion.overflow, false)
  assert.equal(motion.focused, true)
  assert.equal(motion.animations, 1)
  checks.push('menu animates without moving cards or disturbing keyboard focus')
  await pause(220)
  assert.equal(await page.$eval('.model-options', el => getComputedStyle(el).transform), 'none')
  await page.screenshot({ path: join(out, 'dynamic-menu.png') })
  await page.keyboard.press('Escape')
  assert.equal(await page.$('.model-options'), null)
  checks.push('completed menu motion leaves no transform/layer; Escape closes immediately')

  const tabs = await page.evaluate(async () => {
    const row = document.querySelector('.tabs')
    const before = [...row.children].map(el => el.getBoundingClientRect().toJSON())
    row.children[0].click()
    await new Promise(resolve => setTimeout(resolve, 240))
    return { before, after: [...row.children].map(el => el.getBoundingClientRect().toJSON()), activeOpacity: getComputedStyle(row.querySelector('.active'), '::after').opacity, hidden: [...row.children].filter(el => !el.classList.contains('active')).every(el => getComputedStyle(el, '::after').opacity === '0') }
  })
  assert.deepEqual(tabs.before, tabs.after)
  assert.equal(tabs.activeOpacity, '1')
  assert.equal(tabs.hidden, true)
  checks.push('root indicator switches with stable tab widths, positions and baseline')
  await page.waitForSelector('.fcard__cover')
  await page.waitForFunction(() => document.querySelector('.fcard__cover').complete)
  const image = await page.evaluate(async () => {
    const module = await import('/src/utils/motion.js')
    const image = document.querySelector('.fcard__cover')
    image.getAnimations().forEach(animation => animation.cancel())
    image.dataset.motionSource = ''
    const bounds = image.getBoundingClientRect().toJSON()
    module.revealLoadedImage({ target: image })
    const visibleDuringLoad = Number(getComputedStyle(image).opacity) > 0
    const animation = image.getAnimations()[0]
    await animation.finished
    const after = image.getBoundingClientRect().toJSON()
    module.revealLoadedImage({ target: image })
    return { bounds, after, visibleDuringLoad, replay: image.getAnimations().length, opacity: getComputedStyle(image).opacity, transform: getComputedStyle(image).transform }
  })
  assert.deepEqual(image.bounds, image.after)
  assert.equal(image.visibleDuringLoad, true)
  assert.equal(image.opacity, '1')
  assert.equal(image.transform, 'none')
  assert.equal(image.replay, 0)
  checks.push('image remains visible, keeps its dimensions and does not replay on cached return')

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.evaluate(() => document.querySelectorAll('.tabs .tab')[1].click())
  await page.waitForSelector('.model-trigger')
  await page.click('.model-trigger')
  const reduced = await page.evaluate(async () => {
    const module = await import('/src/utils/motion.js')
    const image = document.querySelector('.media-cell img')
    image.dataset.motionSource = ''
    module.revealLoadedImage({ target: image })
    return {
      menu: document.querySelector('.model-options').getAnimations().length,
      arrow: getComputedStyle(document.querySelector('.model-trigger svg')).transitionDuration,
      tab: getComputedStyle(document.querySelector('.tabs .active'), '::after').transitionDuration,
      image: image.getAnimations().length,
    }
  })
  assert.deepEqual(reduced, { menu: 0, arrow: '0s', tab: '0s', image: 0 })
  checks.push('reduced-motion setting disables indicator, menu, arrow and image motion')
  await page.keyboard.press('Escape')
  for (const width of [375, 430, 600, 1017, 1337]) {
    await page.setViewport({ width, height: 844 }); await pause(220)
    await page.waitForSelector('.model-trigger')
    await page.click('.model-trigger')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.keyboard.press('Escape')
    checks.push(width + 'px: animated controls retain mobile/fold layout and do not overflow')
  }
  assert.deepEqual(errors, [])
  writeFileSync(join(out, 'result.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2))
} finally { await browser.close() }

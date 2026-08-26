// ============================================================
// JS Bridge —— H5 与原生 Flutter 的通信契约
// ------------------------------------------------------------
// 生产环境：由「他」在 Flutter WebView 中注入 window.PXIDBridge 的真实实现
//           （Android: JavascriptChannel / iOS: WKScriptMessageHandler）
// 独立预览：本文件提供 mock 实现，保证页面在浏览器里也能点、能跑。
//
// 接入细节见仓库根目录 INTEGRATION.md
// ============================================================

// 是否「嵌入原生 App」：只有 Flutter 注入真实桥（isNative === true）才算嵌入模式，
// 此时 H5 不渲染底部 tab（由原生 tab 接管）。
// 浏览器直接打开（含线上预览 appin.site）一律为独立预览：显示底部 tab、走 H5 兜底。
function isEmbed() {
  return !!(window.PXIDBridge && window.PXIDBridge.isNative === true)
}

// H5 预览/mock 模式下向后端申请匿名 token 的地址
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'
let _cachedToken = null
let _tokenPromise = null

async function fetchAnonymousToken() {
  if (_cachedToken) return _cachedToken
  if (_tokenPromise) return _tokenPromise
  _tokenPromise = (async () => {
    try {
      // 安全：/auth/token 由服务端生成 deviceId，前端不再自报（P0-1 根因修复，防自签他人身份）
      const r = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const token = json.data && json.data.token
      if (token) _cachedToken = token
      return token || 'mock-token-standalone'
    } catch (e) {
      console.warn('[PXIDBridge:mock] fetch /auth/token failed, fallback to dummy token', e.message || e)
      return 'mock-token-standalone'
    } finally {
      _tokenPromise = null
    }
  })()
  return _tokenPromise
}

function logMock(name, payload) {
  // eslint-disable-next-line no-console
  console.log(`[PXIDBridge:mock] ${name}`, payload ?? '')
}

// 默认 mock 实现（原生未注入时使用）
const mockBridge = {
  // 标记：当前是 mock，不是真实原生桥。Flutter 注入的真实实现应带 isNative: true
  isNative: false,

  // 获取登录态 token（返回 Promise<string>）
  // H5 预览/mock 模式：向后端 /auth/token 申请 HMAC 签名 token，失败则回退 dummy token
  getToken() {
    logMock('getToken')
    return fetchAnonymousToken()
  },

  // 取当前地区（CN/BR/US）；真机由 Flutter 注入真实值；H5 预览默认 US（美国视图）
  getRegion() {
    logMock('getRegion')
    return Promise.resolve('US')
  },

  // 取当前语言（zh/en/pt）；真机由 Flutter 注入真实值；H5 预览默认中文
  getLocale() {
    logMock('getLocale')
    return Promise.resolve('zh')
  },

  // 设备唯一 ID（封禁维度）；真机由 Flutter 注入真实设备 ID；H5 预览生成稳定匿名 ID
  getDeviceId() {
    logMock('getDeviceId')
    try {
      let id = localStorage.getItem('pxid_device_id')
      if (!id) {
        id = 'h5-' + Math.random().toString(36).slice(2, 12)
        localStorage.setItem('pxid_device_id', id)
      }
      return Promise.resolve(id)
    } catch (e) {
      return Promise.resolve('h5-anon')
    }
  },
  getLocation() {
    logMock('getLocation')
    // H5 侧走浏览器定位，原生未注入时返回 null 由上层降级
    return Promise.resolve(null)
  },
  getOSSCredentials() {
    logMock('getOSSCredentials')
    return Promise.reject(new Error('OSS 直传未实现（本地模式）'))
  },

  // 唤起原生图片选择器（多选，≤maxCount 张）
  // Flutter 返回：[{ uri, path, width, height, size }] 或转线上 URL 后直接传 url 数组
  pickImages({ maxCount = 9 } = {}) {
    logMock('pickImages', { maxCount })
    return Promise.reject(new Error('图片选择需原生 App 支持'))
  },

  // 唤起原生视频选择器（单选，≤maxDuration 秒）
  pickVideo({ maxDuration = 60 } = {}) {
    logMock('pickVideo', { maxDuration })
    return Promise.reject(new Error('视频选择需原生 App 支持'))
  },

  // 取当前登录用户信息（昵称/头像），用于评论/互动带身份
  // 真机由 Flutter 注入真实实现；H5 预览用默认游客态
  getUserInfo() {
    logMock('getUserInfo')
    // M-MVP1 订单归属需要 email：真机由 Flutter 注入真实用户 email；H5 预览用测试值
    return Promise.resolve({
      nickname: '我',
      avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg',
      email: 'guest@pxid.app',
    })
  },

  // 切换到原生底部 tab：'discover' | 'featured' | 'purchase' | 'service' | 'profile'
  navigateTo(tab) {
    logMock('navigateTo', tab)
    // 独立预览下用路由兜底，便于在浏览器里演示
    if (!isEmbed() && window.__router) {
      window.__router.push('/' + tab)
    }
  },

  // 拉起原生购买 / 下单流程（原生在支付完成/取消后 resolve(true/false)；mock 模拟支付成功）
  requestPurchase(payload) {
    logMock('requestPurchase', payload)
    return Promise.resolve(true)
  },

  // 拨打电话（走原生拨号）
  callPhone(phone) {
    logMock('callPhone', phone)
    if (!isEmbed()) window.location.href = 'tel:' + phone
  },

  // 打开地图导航
  // 嵌入模式：交由原生（Android JavascriptChannel / iOS WKScriptMessageHandler）拉起系统/高德/百度地图
  // 独立预览（手机浏览器直接打开）：按 UA 跳高德(Android) / 苹果地图(iOS) 的 Web URI，实现真调起导航
  openMap({ lat, lng, name }) {
    logMock('openMap', { lat, lng, name })
    if (!isEmbed()) {
      const q = encodeURIComponent(name || '')
      const ua = navigator.userAgent
      if (/iPhone|iPad|iPod/i.test(ua)) {
        // iOS 用苹果地图 Web 链接
        window.location.href = `https://maps.apple.com/?q=${q}`
      } else {
        // Android 用高德 URI（有坐标走导航，无坐标走搜索）
        if (lat != null && lng != null) {
          window.location.href = `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(
            name || ''
          )}&mode=car&src=pxid&coordinate=gaode&callnative=1`
        } else {
          window.location.href = `https://uri.amap.com/search?keyword=${q}&src=pxid&coordinate=gaode`
        }
      }
    }
  },

  // 打开 Shopify 商品/页面（商城与 Shopify 打通：H5 仅展示，点击跳 Shopify 购买）
  // 原生实现：在 WebView / 外部浏览器打开该 URL；mock 直接新标签打开便于预览
  openShopify(url) {
    logMock('openShopify', url)
    if (!isEmbed()) window.open(url, '_blank')
  },

  // 去 Shopify 结账（Headless 终态：自有购物车 → 原生 cartCreate → WebView 打开 checkoutUrl）
  // 原生实现（Flutter）：拿 lines 调该国店 Storefront `cartCreate`（buyerIdentity 带 App 登录身份预填），
  //   得到 checkoutUrl 后在 WebView 内打开 Shopify 结账；监听 return_to（pxid://checkout/done）回弹 App。
  //   lines 元素：{ variantId: 'gid://shopify/ProductVariant/xxx', quantity: 1 }
  // mock 兜底（独立预览）：返回 true 让 H5 走订单完成流程；不外跳商品页（避免预览时弹陌生标签）
  openCheckout(lines) {
    logMock('openCheckout', lines)
    return Promise.resolve(true)
  },

  // 打开原生页面（如车型选择 / 绑定车辆）
  openNative(path) {
    logMock('openNative', path)
    // H5 预览兜底：把几个有 H5 等价页的原生标识映射到同名路由，浏览器里也能走通链路
    if (!isEmbed() && window.__router) {
      const map = (p) => {
        let m
        if ((m = p.match(/^vehicle\/(P\d+)/))) return '/vehicle/' + m[1]
        if (p === 'purchase/customize' || p.startsWith('purchase/customize?')) return '/purchase/customize'
        if (p === 'search' || p.startsWith('search?')) return '/search'
        // 积分板块：真机走 Flutter 原生实现；预览环境兜底到 H5 等价页
        if (p === 'points/guide' || p.startsWith('points/guide?')) return '/points/guide'
        if (p === 'points/rules' || p.startsWith('points/rules?')) return '/points/guide'
        if (p === 'points/mall' || p.startsWith('points/mall?')) return '/points/mall'
        if (p === 'points/exchange' || p.startsWith('points/exchange?')) return '/points/mall'
        return null
      }
      const target = map(path)
      if (target) {
        window.__router.push(target)
        return
      }
    }
  },
}

export function initBridge() {
  // 原生若已注入则不覆盖
  if (!window.PXIDBridge) {
    window.PXIDBridge = mockBridge
  }
  window.__PXID_EMBED__ = isEmbed()
}

// 统一出口：业务代码只调用这里，无需关心当前是 mock 还是原生
export const bridge = {
  get isEmbed() {
    return isEmbed()
  },
  // 是否真实原生桥（Flutter 注入的实现 isNative===true；mock 为 false）
  isNative: () => window.PXIDBridge && window.PXIDBridge.isNative === true,
  getToken: () => window.PXIDBridge.getToken(),
  // 统一登录态 token：真机优先 getUserInfo 注入的登录 token，回退 getToken()（mock/匿名）
  // 修复：真机 getToken() 未必返回登录 token，但登录态经 getUserInfo 注入 → 评论/点赞统一走这里
  getAuthToken: async () => {
    try {
      const u = await window.PXIDBridge.getUserInfo()
      if (u && u.token) return u.token
    } catch (e) { /* 真机未实现 getUserInfo 时回退 */ }
    try {
      const t = await window.PXIDBridge.getToken()
      if (t) return t
    } catch (e) { /* 原生未注入时回退 */ }
    return null
  },
  getUserInfo: () => window.PXIDBridge.getUserInfo(),
  getRegion: () => window.PXIDBridge.getRegion(),
  getDeviceId: () => window.PXIDBridge.getDeviceId(),
  getLocale: () => window.PXIDBridge.getLocale(),
  navigateTo: (t) => window.PXIDBridge.navigateTo(t),
  requestPurchase: (p) => window.PXIDBridge.requestPurchase(p),
  callPhone: (p) => window.PXIDBridge.callPhone(p),
  openMap: (o) => window.PXIDBridge.openMap(o),
  openNative: (p) => window.PXIDBridge.openNative(p),
  getLocation: () => window.PXIDBridge.getLocation(),
  getOSSCredentials: () => window.PXIDBridge.getOSSCredentials(),
  pickImages: (opts) => window.PXIDBridge.pickImages ? window.PXIDBridge.pickImages(opts) : Promise.reject(new Error('未实现')),
  pickVideo: (opts) => window.PXIDBridge.pickVideo ? window.PXIDBridge.pickVideo(opts) : Promise.reject(new Error('未实现')),
  openShopify: (u) => window.PXIDBridge.openShopify(u),
  openCheckout: (lines) => window.PXIDBridge.openCheckout(lines),
}

export default bridge

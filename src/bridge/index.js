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

function logMock(name, payload) {
  // eslint-disable-next-line no-console
  console.log(`[PXIDBridge:mock] ${name}`, payload ?? '')
}

// 默认 mock 实现（原生未注入时使用）
const mockBridge = {
  // 标记：当前是 mock，不是真实原生桥。Flutter 注入的真实实现应带 isNative: true
  isNative: false,

  // 获取登录态 token（返回 Promise<string>）
  getToken() {
    logMock('getToken')
    return Promise.resolve('mock-token-standalone')
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
  // mock 兜底：预览环境没真 checkoutUrl，直接开第一个商品的 shopUrl 模拟跳转
  openCheckout(lines) {
    logMock('openCheckout', lines)
    if (!isEmbed()) {
      const first = (lines && lines[0]) || {}
      const url = first.shopUrl || 'https://shop.pxid.com/'
      window.open(url, '_blank')
    }
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
  navigateTo: (t) => window.PXIDBridge.navigateTo(t),
  requestPurchase: (p) => window.PXIDBridge.requestPurchase(p),
  callPhone: (p) => window.PXIDBridge.callPhone(p),
  openMap: (o) => window.PXIDBridge.openMap(o),
  openNative: (p) => window.PXIDBridge.openNative(p),
  openShopify: (u) => window.PXIDBridge.openShopify(u),
  openCheckout: (lines) => window.PXIDBridge.openCheckout(lines),
}

export default bridge

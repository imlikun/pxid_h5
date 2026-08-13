// ============================================================
// JS Bridge —— H5 与原生 Flutter 的通信契约
// ------------------------------------------------------------
// 生产环境：由「他」在 Flutter WebView 中注入 window.PXIDBridge 的真实实现
//           （Android: JavascriptChannel / iOS: WKScriptMessageHandler）
// 独立预览：本文件提供 mock 实现，保证页面在浏览器里也能点、能跑。
//
// 接入细节见仓库根目录 INTEGRATION.md
// ============================================================

const isEmbed = new URLSearchParams(location.search).has('embed')

function logMock(name, payload) {
  // eslint-disable-next-line no-console
  console.log(`[PXIDBridge:mock] ${name}`, payload ?? '')
}

// 默认 mock 实现（原生未注入时使用）
const mockBridge = {
  // 获取登录态 token（返回 Promise<string>）
  getToken() {
    logMock('getToken')
    return Promise.resolve('mock-token-standalone')
  },

  // 切换到原生底部 tab：'discover' | 'featured' | 'purchase' | 'service' | 'profile'
  navigateTo(tab) {
    logMock('navigateTo', tab)
    // 独立预览下用路由兜底，便于在浏览器里演示
    if (!isEmbed && window.__router) {
      window.__router.push('/' + tab)
    }
  },

  // 拉起原生购买 / 下单流程
  requestPurchase(payload) {
    logMock('requestPurchase', payload)
  },

  // 拨打电话（走原生拨号）
  callPhone(phone) {
    logMock('callPhone', phone)
    if (!isEmbed) window.location.href = 'tel:' + phone
  },

  // 打开地图导航
  // 嵌入模式：交由原生（Android JavascriptChannel / iOS WKScriptMessageHandler）拉起系统/高德/百度地图
  // 独立预览（手机浏览器直接打开）：按 UA 跳高德(Android) / 苹果地图(iOS) 的 Web URI，实现真调起导航
  openMap({ lat, lng, name }) {
    logMock('openMap', { lat, lng, name })
    if (!isEmbed) {
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

  // 打开原生页面（如车型选择 / 绑定车辆）
  openNative(path) {
    logMock('openNative', path)
  },
}

export function initBridge() {
  // 原生若已注入则不覆盖
  if (!window.PXIDBridge) {
    window.PXIDBridge = mockBridge
  }
  window.__PXID_EMBED__ = isEmbed
}

// 统一出口：业务代码只调用这里，无需关心当前是 mock 还是原生
export const bridge = {
  get isEmbed() {
    return isEmbed
  },
  getToken: () => window.PXIDBridge.getToken(),
  navigateTo: (t) => window.PXIDBridge.navigateTo(t),
  requestPurchase: (p) => window.PXIDBridge.requestPurchase(p),
  callPhone: (p) => window.PXIDBridge.callPhone(p),
  openMap: (o) => window.PXIDBridge.openMap(o),
  openNative: (p) => window.PXIDBridge.openNative(p),
}

export default bridge

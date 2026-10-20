// ============================================================
// 社交只读模式（2026-10-20，小米应用商店上架审核用）
// ------------------------------------------------------------
// 两层开关：
//   1) 构建时硬开关（渠道包用，远程不可改回）：
//        VITE_SOCIAL_MODE=readonly / VITE_SOCIAL_DISABLED=1 / VITE_CHANNEL=xiaomi
//   2) 运行时开关（正式站用，非显性、无界面入口）：
//        同源 social-mode.json：{ "readOnly": true|false }
//        main.js 在 mount 前加载，改完文件重开 App/刷新即生效。
// 默认 = 正常社交模式。仅 DEV 允许 localStorage 调试覆盖，生产无后门。
// ============================================================
const env = (import.meta && import.meta.env) || {}
const mode = String(env.VITE_SOCIAL_MODE || '').toLowerCase()
const disabled = String(env.VITE_SOCIAL_DISABLED || '') === '1'
const channel = String(env.VITE_CHANNEL || '').toLowerCase()

// 渠道包硬只读：一旦构建进小米包，运行时开关不能把社交放出来
const hardReadOnly = disabled || mode === 'readonly' || channel === 'xiaomi'

// 用 export let + setter：ESM live binding，main.js 在 mount 前改值，
// 所有 import 该值的组件/路由守卫都能读到最新结果。
export let isSocialReadOnly = hardReadOnly

export function setSocialReadOnly(value) {
  isSocialReadOnly = hardReadOnly ? true : !!value
}

// mount 前调用：读取同源 social-mode.json（相对当前页面，兼容 /nav/pxid-h5/ 与子路径）
export async function loadSocialMode() {  // 开发态本地调试覆盖（仅 DEV 生效，生产构建该分支不执行）
  if (env.DEV) {
    try {
      const dev = String(window.localStorage.getItem('__pxid_social_mode') || '').toLowerCase()
      if (dev === 'readonly' || dev === 'normal') {
        isSocialReadOnly = dev === 'readonly' ? true : hardReadOnly
        return
      }
    } catch (e) { /* localStorage 不可用则走远程开关 */ }
  }
  if (hardReadOnly) return
  try {
    const base = String(env.BASE_URL || './')
    const url = base.replace(/\/?$/, '/') + 'social-mode.json?t=' + Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return
    const cfg = await res.json()
    if (typeof cfg.readOnly === 'boolean') isSocialReadOnly = cfg.readOnly
  } catch (e) {
    // 开关文件不可用 → 保持构建时默认（正常社交），不阻塞启动
  }
}

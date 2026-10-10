// A short-lived handoff when a split-pane reader opens the same post fullscreen.
// localStorage follows the existing snapshot convention across native WebViews.
const KEY = 'pxid_feed_reading_handoff'
const TTL = 30_000
let returnAnchor = null
export function setDiscoverReturnAnchor(id) { returnAnchor = /^\d+$/.test(String(id)) ? String(id) : null }
export function takeDiscoverReturnAnchor() { const id = returnAnchor; returnAnchor = null; return id }
export function handoffFeedReading(id, state) {
  try { localStorage.setItem(KEY, JSON.stringify({ id: String(id), time: Date.now(), state })) } catch {}
}
export function takeFeedReading(id) {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!value || Date.now() - value.time > TTL) { localStorage.removeItem(KEY); return null }
    if (value.id !== String(id)) return null
    localStorage.removeItem(KEY)
    return value.state
  } catch { return null }
}

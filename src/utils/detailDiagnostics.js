// Bounded timing records only: never store tokens, account data, URL queries or content.
const API = import.meta.env.VITE_API_BASE || 'https://pxid-api.appin.site'
const KEY = 'pxid_detail_timings_v1', INTENT = 'pxid_detail_intent_v1'
const active = new Set()
const records = (() => { try { const rows = JSON.parse(sessionStorage.getItem(KEY) || '[]'); return Array.isArray(rows) ? rows.slice(-30) : [] } catch { return [] } })()
const bootPath = location.hash.replace(/^#/, '').split('?')[0]
let bootstrapTaken = false
const now = () => performance.now()
const rounded = value => Math.max(0, Math.round(value))
const identifier = () => Math.random().toString(36).slice(2, 12)
const kindOf = path => /^\/feed\/\d+$/.test(path) ? 'feed' : /^\/product\/[^/]+$/.test(path) ? 'product' : ''
export function recordDetailIntent(route) {
  const path = String(route).split('?')[0], kind = kindOf(path)
  if (!kind) return
  try { localStorage.setItem(INTENT, JSON.stringify({ path, at: Date.now() })) } catch { /* optional shared storage */ }
}
function save(record) {
  const i = records.findIndex(row => row.id === record.id)
  if (i >= 0) records.splice(i, 1)
  records.push(record)
  if (records.length > 30) records.shift()
  try { sessionStorage.setItem(KEY, JSON.stringify(records)) } catch { /* quota/privacy mode */ }
}
function report(record) {
  // Fire and forget; monitoring must not delay rendering, retry business requests or throw.
  fetch(API + '/diagnostics/detail', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record), keepalive: true }).catch(() => {})
}
export function createDetailTrace(kind, path, embedded = false) {
  const start = now(), entry = { id: identifier(), kind, embedded, native: window.PXIDBridge?.isNative === true, at: Date.now(), stages: {} }
  if (!embedded) {
    if (!bootstrapTaken && bootPath === String(path).split('?')[0]) { entry.stages.bootstrap = rounded(start); bootstrapTaken = true }
    try {
      const intent = JSON.parse(localStorage.getItem(INTENT) || 'null')
      if (intent?.path === String(path).split('?')[0] && entry.at - intent.at < 30000 && entry.at >= intent.at) {
        entry.stages.handoff = entry.at - intent.at
        localStorage.removeItem(INTENT)
      }
    } catch { /* storage isolation */ }
  }
  let closed = false, sent = false
  function snapshot(status) {
    const record = { ...entry, stages: { ...entry.stages }, elapsed: rounded(now() - start), status }
    save(record)
    const slow = Math.max(record.elapsed, ...Object.values(record.stages)) >= 2500
    if (!sent && ((slow && status === 'ready') || status === 'error' || status === 'pending')) { sent = true; report(record) }
  }
  const pending = setTimeout(() => { if (!closed) snapshot('pending') }, 10000)
  const trace = {
    kind, start,
    set(name, value) { if (!closed && Number.isFinite(value)) { entry.stages[name] = rounded(value); snapshot('progress') } },
    request(data) { if (!closed) { entry.request = data; snapshot(data.outcome === 'error' || data.outcome === 'timeout' ? 'error' : entry.stages.content === undefined ? 'progress' : 'ready') } },
    ready(source, notified) { if (!closed) { entry.source = source; entry.notified = !!notified; entry.stages.content = rounded(now() - start); snapshot('ready'); if (entry.stages.media !== undefined) clearTimeout(pending) } },
    media() { if (!closed && entry.stages.media === undefined) { entry.stages.media = rounded(now() - start); snapshot(entry.stages.content === undefined ? 'progress' : 'ready'); if (entry.stages.content !== undefined) clearTimeout(pending) } },
    error() { if (!closed) snapshot('error') },
    close() { closed = true; clearTimeout(pending); active.delete(trace) },
  }
  active.add(trace)
  return trace
}
export function recordDetailStage(kind, name, duration) { active.forEach(trace => { if (trace.kind === kind) trace.set(name, duration) }) }
export async function fetchDetailJSON(kind, url, { signal, timeout = 9000, ...options } = {}) {
  const spans = [...active].filter(trace => trace.kind === kind), start = now()
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, timeout)
  let response, headersAt, server = {}, requestId = '', outcome = 'error'
  try {
    response = await fetch(url, { ...options, signal: controller.signal })
    headersAt = now()
    const timings = response.headers.get('Server-Timing') || ''
    for (const name of ['app', 'shopify']) {
      const match = timings.match(new RegExp('(?:^|,)\\s*' + name + ';dur=([\\d.]+)'))
      if (match) server[name] = rounded(Number(match[1]))
    }
    const rawId = response.headers.get('X-Request-ID') || ''
    requestId = /^[a-f0-9]{16}$/.test(rawId) ? rawId : ''
    if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), { status: response.status })
    const json = await response.json()
    outcome = 'ok'
    return json
  } catch (error) {
    outcome = signal?.aborted ? 'cancelled' : controller.signal.aborted ? 'timeout' : 'error'
    throw error
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort)
    const request = { id: requestId, duration: rounded(now() - start), headers: headersAt ? rounded(headersAt - start) : 0,
      server, status: response?.status || 0, outcome }
    spans.forEach(trace => trace.request(request))
  }
}
export function installDetailDiagnostics() {
  window.__PXID_DETAIL_DIAGNOSTICS__ = {
    read() { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]') } catch { return records.slice() } },
    clear() { records.length = 0; try { sessionStorage.removeItem(KEY) } catch { /* storage unavailable */ } },
  }
}

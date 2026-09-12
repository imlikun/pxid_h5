// Shopify 图片/变体关联统一在此解析；不按图片数组顺序猜颜色。
export const isColorOption = (name) => /color|colour|颜色/i.test(name || '')
export const imagesOf = (p) => (p?.images || []).map((im) => typeof im === 'string' ? { src: im } : im).filter((im) => im?.src)
export function sameImage(a, b) {
  if (!a || !b) return false
  try {
    const left = new URL(a, 'https://image.invalid')
    const right = new URL(b, 'https://image.invalid')
    return left.pathname === right.pathname && left.hostname === right.hostname
  } catch { return a === b }
}
export const colorOf = (v) => (v?.selectedOptions || []).find((o) => isColorOption(o.name))?.value || ''
function linkedVariants(p, im) {
  return (p?.variants || []).filter((v) => (v.imageId && im.id && String(v.imageId) === String(im.id))
    || (im.variantIds || []).map(String).includes(String(v.id)) || sameImage(v.imageSrc, im.src))
}
// 仅在没有明确绑定、alt 唯一匹配一种颜色时兜底；避免 Black/Red 互串。
function altColor(p, im) {
  const normalize = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const alt = ' ' + normalize(im.alt) + ' '
  const colors = [...new Set((p?.variants || []).map(colorOf).filter(Boolean))]
  const matches = colors.filter((color) => alt.includes(' ' + normalize(color) + ' '))
  return matches.length === 1 ? matches[0] : ''
}
function belongsToColor(p, im, color) {
  const linked = linkedVariants(p, im)
  if (linked.length) return linked.some((v) => colorOf(v) === color)
  return !!color && altColor(p, im) === color
}
export function imageForVariant(p, v) {
  if (!v) return ''
  const images = imagesOf(p)
  return images.find((im) => v.imageId && String(im.id) === String(v.imageId))?.src
    || images.find((im) => (im.variantIds || []).map(String).includes(String(v.id)))?.src
    || v.imageSrc || ''
}
export function variantForCover(p, cover) {
  const vs = p?.variants || []
  const linked = vs.find((v) => sameImage(imageForVariant(p, v), cover))
  if (linked) return linked
  const im = imagesOf(p).find((i) => sameImage(i.src, cover))
  if (!im) return null
  return linkedVariants(p, im)[0] || vs.find((v) => colorOf(v) && colorOf(v) === altColor(p, im)) || null
}
export function imagesForColor(p, color) {
  const vs = (p?.variants || []).filter((v) => colorOf(v) === color)
  // 变体绑定主图优先，再放该色其它图片；不让图片数组顺序或 alt 覆盖真实绑定。
  const primary = vs.map((v) => imageForVariant(p, v)).filter(Boolean)
  const extra = imagesOf(p).filter((im) => belongsToColor(p, im, color)).map((im) => im.src)
  return [...primary, ...extra].filter((src, index, arr) => arr.findIndex((other) => sameImage(other, src)) === index)
}
export function colorPreview(p, color) {
  const source = imagesForColor(p, color)[0]
  if (!source) return ''
  try {
    const url = new URL(source)
    if (url.hostname === 'cdn.shopify.com') url.searchParams.set('width', '104')
    return url.href
  } catch { return source }
}

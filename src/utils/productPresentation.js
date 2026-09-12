// Shopify 图片/变体关联统一在此解析；不按图片数组顺序猜颜色。
export const isColorOption = (name) => /color|colour|颜色/i.test(name || '')
export const imagesOf = (p) => (p?.images || []).map((im) => typeof im === 'string' ? { src: im } : im).filter((im) => im?.src)
export function sameImage(a, b) {
  if (!a || !b) return false
  try { return new URL(a, 'https://image.invalid').pathname === new URL(b, 'https://image.invalid').pathname && new URL(a, 'https://image.invalid').hostname === new URL(b, 'https://image.invalid').hostname } catch { return a === b }
}
export const colorOf = (v) => (v?.selectedOptions || []).find((o) => isColorOption(o.name))?.value || ''
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
  // 只在 alt 明确包含颜色时兜底；无法关联则保留首图，等待详情补全。
  return im?.alt ? vs.find((v) => colorOf(v) && im.alt.toLowerCase().includes(colorOf(v).toLowerCase())) : null
}
export function imagesForColor(p, color) {
  const vs = (p?.variants || []).filter((v) => colorOf(v) === color)
  const sources = vs.map((v) => imageForVariant(p, v)).filter(Boolean)
  return imagesOf(p).filter((im) => sources.some((s) => sameImage(s, im.src))
    || (im.variantIds || []).some((id) => vs.some((v) => String(v.id) === String(id)))
    || (color && (im.alt || '').toLowerCase().includes(color.toLowerCase()))).map((im) => im.src)
}

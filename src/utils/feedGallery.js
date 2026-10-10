// Phone details and the foldable detail pane must use the same count rules.
export function feedGalleryLayout(count) {
  return ({ 2: 'pair', 3: 'bento-3', 4: 'quad', 6: 'bento-6', 7: 'bento-7', 9: 'nine' })[count] || ''
}

export function feedUsesCarousel(count) {
  return count === 5 || count === 8 || count >= 10
}

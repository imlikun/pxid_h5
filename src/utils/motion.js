// Reveal decoded images without hiding content, moving cards or replaying
// a whole-list entrance when a kept-alive view is restored.
export function revealLoadedImage(event) {
  const image = event?.target
  if (!image?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const source = image.currentSrc || image.src
  if (image.dataset.motionSource === source) return
  image.dataset.motionSource = source
  image.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
}

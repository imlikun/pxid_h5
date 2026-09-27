<template>
  <Teleport to="body">
    <div v-if="modelValue && images.length" class="image-preview" role="dialog" aria-modal="true" :aria-label="t('feed.imagePreview')" @click.self="close" @touchstart.passive="touchStart" @touchend.passive="touchEnd">
      <button ref="closeButton" class="preview-close" type="button" :aria-label="t('feed.close')" @click="close">×</button>
      <span class="preview-count">{{ index + 1 }} / {{ images.length }}</span>
      <img class="preview-image" :src="images[index]" :alt="alt" />
      <button v-if="images.length > 1" class="preview-prev" type="button" :disabled="index === 0" :aria-label="t('feed.imagePrevious')" @click="step(-1)">‹</button>
      <button v-if="images.length > 1" class="preview-next" type="button" :disabled="index === images.length - 1" :aria-label="t('feed.imageNext')" @click="step(1)">›</button>
    </div>
  </Teleport>
</template>
<script setup>
import { ref, watch, nextTick, onBeforeUnmount, onDeactivated } from 'vue'
import { t } from '../i18n'
const props = defineProps({ modelValue: Boolean, images: { type: Array, default: () => [] }, startIndex: { type: Number, default: 0 }, alt: String })
const emit = defineEmits(['update:modelValue'])
const index = ref(0), closeButton = ref(null)
let previousFocus, previousOverflow, locked = false, startX = 0, startY = 0
function close() { emit('update:modelValue', false) }
function step(delta) { index.value = Math.max(0, Math.min(props.images.length - 1, index.value + delta)) }
function touchStart(e) { startX = e.changedTouches[0].clientX; startY = e.changedTouches[0].clientY }
function touchEnd(e) { const dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1) }
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close() }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1) }
  else if (e.key === 'Tab') {
    const buttons = [...document.querySelectorAll('.image-preview button:not(:disabled)')]
    const first = buttons[0], last = buttons.at(-1)
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
}
function release() {
  if (!locked) return
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKey)
  previousFocus?.focus?.({ preventScroll: true })
  locked = false
}
watch(() => props.modelValue, async open => {
  if (!open) { release(); return }
  index.value = Math.max(0, Math.min(props.images.length - 1, props.startIndex))
  previousFocus = document.activeElement; previousOverflow = document.body.style.overflow; locked = true
  document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey)
  await nextTick(); closeButton.value?.focus({ preventScroll: true })
})
watch(() => props.images.length, length => { index.value = Math.max(0, Math.min(index.value, length - 1)) })
onDeactivated(() => { close(); release() })
onBeforeUnmount(release)
</script>
<style scoped>
.image-preview { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.96); display: grid; place-items: center; }
.preview-image { max-width: 100%; max-height: calc(100vh - 112px); max-height: calc(100dvh - 112px); object-fit: contain; }
.preview-close, .preview-prev, .preview-next { position: absolute; width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(255,255,255,.15); color: white; font-size: 32px; display: grid; place-items: center; padding: 0; }
.preview-close { top: 12px; right: 16px; }
.preview-count { position: absolute; top: 26px; left: 20px; font-size: 14px; color: white; }
.preview-prev { left: 12px; top: calc(50% - 22px); }
.preview-next { right: 12px; top: calc(50% - 22px); }
button:disabled { opacity: .25; }
button:focus-visible { outline: 2px solid white; outline-offset: 3px; }
</style>

<template>
  <div v-if="visibleImages.length" class="media-grid" :class="layout ? `media-grid--${layout}` : ''" :style="layout ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
    <button v-for="(src, i) in visibleImages" :key="i" type="button" class="media-cell" :class="{ 'media-cell--single': columns === 1 }" :aria-label="t('feed.imageView', { n: i + 1 })" @click.stop="$emit('preview', i)">
      <img :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'" @error="onError" />
      <span v-if="i === visibleImages.length - 1 && images.length > visibleImages.length" class="media-more">+{{ images.length - visibleImages.length }}</span>
    </button>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { t } from '../i18n'
const props = defineProps({ images: { type: Array, default: () => [] }, alt: { type: String, default: '' }, maxCount: { type: Number, default: Infinity }, eager: Boolean, layout: { type: String, default: '' } })
defineEmits(['preview'])
const visibleImages = computed(() => props.images.filter(Boolean).slice(0, props.maxCount))
const columns = computed(() => visibleImages.value.length <= 1 ? 1 : visibleImages.value.length === 2 || visibleImages.value.length === 4 ? 2 : 3)
const fallback = import.meta.env.BASE_URL + 'feed_default.jpg'
function onError(e) { if (e.target.dataset.fallback) return; e.target.dataset.fallback = '1'; e.target.src = fallback }
</script>
<style scoped>
.media-grid { display: grid; gap: 6px; }
.media-cell { position: relative; display: block; width: 100%; padding: 0; overflow: hidden; border: 0; border-radius: 10px; background: #f1f3f6; aspect-ratio: 4 / 3; }
.media-cell--single { max-height: 320px; }
.media-cell img { display: block; width: 100%; height: 100%; object-fit: cover; }
.media-cell:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.media-more { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.4); color: white; font-size: 24px; font-weight: 600; }

/* 仅详情页传入 layout；列表卡片继续使用上方原有网格。 */
.media-grid--pair, .media-grid--quad { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.media-grid--nine { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.media-grid--quad .media-cell, .media-grid--nine .media-cell { aspect-ratio: 1; }
.media-grid--bento-3, .media-grid--bento-6, .media-grid--bento-7 {
  width: 100%;
  aspect-ratio: 1;
  grid-template-rows: repeat(3, minmax(0, 1fr));
}
.media-grid--bento-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
.media-grid--bento-6, .media-grid--bento-7 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.media-grid--bento-3 .media-cell, .media-grid--bento-6 .media-cell, .media-grid--bento-7 .media-cell { height: 100%; aspect-ratio: auto; }
.media-grid--bento-3 .media-cell:nth-child(1) { grid-column: 1; grid-row: 1 / 3; }
.media-grid--bento-3 .media-cell:nth-child(2) { grid-column: 2; grid-row: 1; }
.media-grid--bento-3 .media-cell:nth-child(3) { grid-column: 2; grid-row: 2; }
.media-grid--bento-6 .media-cell:nth-child(1) { grid-column: 1; grid-row: 1; }
.media-grid--bento-6 .media-cell:nth-child(2) { grid-column: 2; grid-row: 1; }
.media-grid--bento-6 .media-cell:nth-child(3) { grid-column: 3; grid-row: 1 / 3; }
.media-grid--bento-6 .media-cell:nth-child(4) { grid-column: 1; grid-row: 2 / 4; }
.media-grid--bento-6 .media-cell:nth-child(5) { grid-column: 2; grid-row: 2; }
.media-grid--bento-6 .media-cell:nth-child(6) { grid-column: 2 / 4; grid-row: 3; }
.media-grid--bento-7 .media-cell:nth-child(1) { grid-column: 1; grid-row: 1 / 3; }
.media-grid--bento-7 .media-cell:nth-child(2) { grid-column: 2; grid-row: 1; }
.media-grid--bento-7 .media-cell:nth-child(3) { grid-column: 3; grid-row: 1; }
.media-grid--bento-7 .media-cell:nth-child(4) { grid-column: 2; grid-row: 2; }
.media-grid--bento-7 .media-cell:nth-child(5) { grid-column: 3; grid-row: 2 / 4; }
.media-grid--bento-7 .media-cell:nth-child(6) { grid-column: 1; grid-row: 3; }
.media-grid--bento-7 .media-cell:nth-child(7) { grid-column: 2; grid-row: 3; }
</style>

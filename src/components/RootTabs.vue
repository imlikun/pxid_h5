<template>
  <div class="tabs" role="tablist" :aria-label="ariaLabel" @keydown="onKey">
    <button v-for="item in items" :key="item.key" type="button" role="tab" class="tab"
      :class="{ active: modelValue === item.key }" :aria-selected="modelValue === item.key"
      :tabindex="modelValue === item.key ? 0 : -1" @click="$emit('update:modelValue', item.key)">
      <span class="tab__measure" aria-hidden="true" :data-label="item.label"></span>
      <span class="tab__label">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({ items: { type: Array, required: true }, modelValue: { type: String, required: true }, ariaLabel: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])
function onKey(event) {
  const current = props.items.findIndex(item => item.key === props.modelValue)
  let next
  if (event.key === 'ArrowRight') next = (current + 1) % props.items.length
  else if (event.key === 'ArrowLeft') next = (current + props.items.length - 1) % props.items.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = props.items.length - 1
  else return
  event.preventDefault()
  emit('update:modelValue', props.items[next].key)
  const button = event.currentTarget.querySelectorAll('[role="tab"]')[next]
  button?.focus({ preventScroll: true })
  if (!button) return
  const row = event.currentTarget, bounds = row.getBoundingClientRect(), selected = button.getBoundingClientRect()
  if (selected.left < bounds.left || selected.width > row.clientWidth) row.scrollLeft += selected.left - bounds.left
  else if (selected.right > bounds.right) row.scrollLeft += selected.right - bounds.right
}
</script>

<style scoped>
.tabs { display: flex; flex: 1 1 0; align-items: center; gap: var(--root-nav-gap); height: 44px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { position: relative; display: grid; align-items: center; justify-content: center; flex: 0 0 auto; min-width: 44px; height: 44px; padding: 0 8px; background: none; border: 0; white-space: nowrap; font-size: var(--root-nav-size); font-weight: 500; line-height: 24px; letter-spacing: 0; color: var(--text-sub); }
.tab__label, .tab__measure { grid-area: 1 / 1; }
.tab__label { transition: color 160ms ease, opacity 100ms ease; }
.tab:active .tab__label { opacity: .7; }
.tab__measure { font-weight: 700; visibility: hidden; pointer-events: none; }
.tab__measure::before { content: attr(data-label); }
.tab.active { color: var(--text); font-weight: 700; }
.tab::after { content: ''; position: absolute; left: 50%; bottom: var(--root-nav-indicator-bottom); transform: translateX(-50%) scaleX(.7); opacity: 0; width: var(--root-nav-indicator-width); height: var(--root-nav-indicator-height); border-radius: 2px; background: var(--brand); transition: opacity 160ms ease, transform 160ms cubic-bezier(.2, .8, .2, 1); }
.tab.active::after { opacity: 1; transform: translateX(-50%) scaleX(1); }
.tab:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { .tab__label, .tab::after { transition: none; } }
</style>

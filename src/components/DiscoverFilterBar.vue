<template>
  <div ref="root" class="discussion-filter">
    <div class="scope-tabs" :aria-label="t('discover.scope.label')">
      <button v-for="option in scopes" :key="option.value" type="button" :class="{ active: scope === option.value }" :aria-pressed="scope === option.value" @click="$emit('scope', option.value)">{{ option.label }}</button>
    </div>
    <div class="model-menu">
      <button ref="trigger" type="button" class="model-trigger" :aria-label="`${t('discover.chooseModel')}: ${model || t('discover.allModels')}`" aria-haspopup="listbox" :aria-expanded="open" aria-controls="discover-model-options" @click="toggle">
        <span>{{ model || t('discover.allModels') }}</span><svg viewBox="0 0 12 12" aria-hidden="true" :class="{ expanded: open }"><path d="m2.5 4.5 3.5 3 3.5-3"/></svg>
      </button>
      <div v-if="open" id="discover-model-options" class="model-options" role="listbox" :aria-label="t('discover.chooseModel')" @keydown="moveFocus">
        <button type="button" role="option" :aria-selected="!model" class="model-all" @click="pick('')">{{ t('discover.allModels') }}<span v-if="!model">✓</span></button>
        <div class="model-grid"><button v-for="value in models" :key="value" type="button" role="option" :aria-selected="model === value" @click="pick(value)">{{ value }}<span v-if="model === value">✓</span></button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount, onDeactivated } from 'vue'
import { CAR_MODEL_LABELS } from '../data/carModels'
import { t } from '../i18n'
const props = defineProps({ scope: { type: String, default: 'all' }, model: { type: String, default: '' }, mine: { type: String, default: '' } })
const emit = defineEmits(['scope', 'model'])
const root = ref(null), trigger = ref(null), open = ref(false)
const scopes = computed(() => [
  { value: 'all', label: t('discover.filter.all') },
  { value: 'follow', label: t('discover.subFollow') },
  { value: 'near', label: t('discover.subNear') },
])
const models = computed(() => props.mine ? [props.mine, ...CAR_MODEL_LABELS.filter(x => x !== props.mine)] : CAR_MODEL_LABELS)
function pick(value) { emit('model', value); open.value = false; trigger.value?.focus() }
function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => root.value?.querySelector('[aria-selected="true"]')?.focus())
}
function moveFocus(event) {
  const items = [...root.value.querySelectorAll('[role="option"]')]
  const index = items.indexOf(document.activeElement)
  const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: index < 1 ? 1 : 3, ArrowUp: -3 }
  let next
  if (event.key in steps) next = Math.max(0, Math.min(items.length - 1, index + steps[event.key]))
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else if (event.key === 'Tab') { open.value = false; return }
  else return
  event.preventDefault(); items[next]?.focus()
}
function outside(event) { if (!root.value?.contains(event.target)) open.value = false }
function escape(event) { if (event.key === 'Escape' && open.value) { open.value = false; trigger.value?.focus() } }
onMounted(() => { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) })
onDeactivated(() => { open.value = false })
</script>
<style scoped>
.discussion-filter { position: relative; z-index: 6; display: flex; align-items: center; gap: 8px; min-height: 56px; margin: 0 16px; }
.scope-tabs { display: flex; align-items: center; gap: 4px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.scope-tabs button { flex: 0 0 auto; min-height: 44px; padding: 0 12px; border-radius: 12px; color: var(--text-sub); font-size: 14px; white-space: nowrap; }
.scope-tabs button.active { color: var(--brand-ink); background: var(--brand-soft); font-weight: 700; }
.model-menu { flex: 0 0 auto; margin-left: auto; }
.model-trigger { min-height: 44px; display: flex; align-items: center; gap: 5px; padding: 0 0 0 7px; color: var(--text-sub); font-size: 13px; white-space: nowrap; }
.model-trigger svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.model-trigger svg.expanded { transform: rotate(180deg); }
.model-options { position: absolute; right: 0; top: 100%; width: 232px; max-width: 100%; padding: 8px; border: 1px solid var(--line); border-radius: 12px; background: white; box-shadow: 0 6px 18px rgba(25, 40, 64, .08); }
.model-options button { display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 10px; border-radius: 8px; color: var(--text-sub); font-size: 13px; }
.model-all { width: 100%; margin-bottom: 4px; }.model-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
.model-options button[aria-selected="true"] { color: var(--brand-ink); background: var(--brand-soft); }.model-options span { font-size: 11px; }
button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
@media (max-width: 359px), (min-width: 600px) and (max-width: 749px) { .scope-tabs button { padding: 0 8px; font-size: 13px; }.model-trigger { font-size: 12px; } }
</style>

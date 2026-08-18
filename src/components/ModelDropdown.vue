<template>
  <button type="button" class="md press" @click="open">
    <span class="md__txt">{{ modelValue || placeholder }}</span>
    <svg class="md__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <transition name="md-sheet">
    <div v-if="open_" class="md-mask" @click="close">
      <div class="md-sheet" @click.stop>
        <div class="md-sheet__handle"></div>
        <div class="md-sheet__title">{{ title || placeholder }}</div>
        <ul class="md-sheet__list">
          <li
            v-for="opt in options"
            :key="opt"
            class="md-sheet__opt"
            :class="{ on: modelValue === opt }"
            @click="pick(opt)"
          >
            <span>{{ opt }}</span>
            <svg v-if="modelValue === opt" class="md-sheet__check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </li>
        </ul>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '选择车型' },
  title: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const open_ = ref(false)
function open() { open_.value = true }
function close() { open_.value = false }
function pick(opt) { emit('update:modelValue', opt); close() }

watch(open_, (v) => { document.body.style.overflow = v ? 'hidden' : '' })
onUnmounted(() => { document.body.style.overflow = '' })
</script>

<style scoped>
.md {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  background: var(--bg);
  border: 1px solid var(--line);
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}
.md:active { background: var(--bg-press); }
.md__txt {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.md__chev { flex: none; color: var(--text-sub); transition: transform 0.2s ease; }
.md.active .md__chev { transform: rotate(180deg); }

.md-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.md-sheet {
  width: 100%;
  max-width: 560px;
  background: var(--card, #fff);
  border-radius: 16px 16px 0 0;
  padding: 8px 0 calc(12px + env(safe-area-inset-bottom));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.md-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  margin: 8px auto 4px;
}
.md-sheet__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  padding: 8px 16px 12px;
  border-bottom: 1px solid var(--line);
}
.md-sheet__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.md-sheet__opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  font-size: 15px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s ease;
}
.md-sheet__opt:active { background: var(--bg-press); }
.md-sheet__opt.on {
  color: var(--brand);
  font-weight: 600;
}
.md-sheet__check { color: var(--brand); flex: none; }

.md-sheet-enter-active, .md-sheet-leave-active {
  transition: opacity 0.22s ease;
}
.md-sheet-enter-active .md-sheet, .md-sheet-leave-active .md-sheet {
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.md-sheet-enter-from, .md-sheet-leave-to { opacity: 0; }
.md-sheet-enter-from .md-sheet, .md-sheet-leave-to .md-sheet {
  transform: translateY(100%);
}
</style>
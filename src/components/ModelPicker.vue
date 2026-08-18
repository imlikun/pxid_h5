<template>
  <div class="mp">
    <!-- 默认 chip（全部/最新），可选 -->
    <span
      v-if="resetLabel"
      class="mp-chip press"
      :class="{ on: modelValue === resetLabel }"
      @click="select(resetLabel)"
      >{{ resetLabel }}</span
    >
    <!-- 可见车型 chips（默认前 N 个；选中项不在可见区则补进来） -->
    <span
      v-for="opt in visibleOptions"
      :key="opt"
      class="mp-chip press"
      :class="{ on: modelValue === opt }"
      @click="select(opt)"
      >{{ opt }}</span
    >
    <!-- 更多：超出可见数量的车型走底部弹层 -->
    <span v-if="options.length > visibleOptions.length" class="mp-chip mp-more press" @click="open">
      更多
      <svg class="mp-more__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </span>
  </div>

  <transition name="md-sheet">
    <div v-if="open_" class="md-mask" @click="close">
      <div class="md-sheet" @click.stop>
        <div class="md-sheet__handle"></div>
        <div class="md-sheet__title">{{ title || placeholder }}</div>
        <ul class="md-sheet__list">
          <li
            v-if="resetLabel"
            class="md-sheet__opt"
            :class="{ on: modelValue === resetLabel }"
            @click="pick(resetLabel)"
          >
            <span>{{ resetLabel }}</span>
            <svg v-if="modelValue === resetLabel" class="md-sheet__check" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </li>
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
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true }, // 车型代号列表（不含默认项）
  resetLabel: { type: String, default: '' }, // 默认 chip（'全部'/'最新'），可选
  visibleCount: { type: Number, default: 4 }, // 除默认项外先展示的车型数
  placeholder: { type: String, default: '选择车型' },
  title: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const visibleOptions = computed(() => {
  const shown = props.options.slice(0, props.visibleCount)
  const v = props.modelValue
  // 已选车型不在可见区（通过"更多"选的）→ 补进可见行，选中态始终可见
  if (v && v !== props.resetLabel && !shown.includes(v)) shown.push(v)
  return shown
})

const open_ = ref(false)
function open() { open_.value = true }
function close() { open_.value = false }
function select(opt) { emit('update:modelValue', opt) }
function pick(opt) { emit('update:modelValue', opt); close() }

watch(open_, (v) => { document.body.style.overflow = v ? 'hidden' : '' })
onUnmounted(() => { document.body.style.overflow = '' })
</script>

<style scoped>
.mp {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.mp-chip {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 7px 14px;
  transition: all 0.12s ease;
  user-select: none;
  cursor: pointer;
}
.mp-chip:active { transform: scale(0.96); }
.mp-chip.on {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
  font-weight: 500;
}
.mp-more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.mp-more__chev { color: var(--text-sub); }

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

.md-sheet-enter-active, .md-sheet-leave-active { transition: opacity 0.22s ease; }
.md-sheet-enter-active .md-sheet, .md-sheet-leave-active .md-sheet { transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); }
.md-sheet-enter-from, .md-sheet-leave-to { opacity: 0; }
.md-sheet-enter-from .md-sheet, .md-sheet-leave-to .md-sheet { transform: translateY(100%); }
</style>

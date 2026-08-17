<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="share-overlay" @click.self="close">
        <transition name="slide-up">
          <div v-if="modelValue" class="share-sheet">
            <div class="share-handle"></div>
            <div class="share-title">分享到</div>
            <div class="share-grid">
              <div
                v-for="ch in channels"
                :key="ch.key"
                class="share-item press pop"
                @click="onSelect(ch.key)"
              >
                <div class="share-icon" :class="'share-icon--' + ch.key">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="ch.svg"></svg>
                </div>
                <div class="share-label">{{ ch.label }}</div>
              </div>
            </div>
            <div class="share-gap"></div>
            <button class="share-cancel press" @click="close">取消</button>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  url: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'share'])

const channels = [
  {
    key: 'wechat',
    label: '微信好友',
    svg: '<path d="M17 10.5c-3.6 0-6.5 2.4-6.5 5.4 0 1.5.8 2.8 2.1 3.7-.1.5-.4 1.4-.4 1.4s1.2-.2 1.8-.6c.9.4 2 .7 3 .7 3.6 0 6.5-2.4 6.5-5.4S20.6 10.5 17 10.5z"/><path d="M8.5 2C4.4 2 1 4.7 1 8c0 1.9 1 3.6 2.6 4.7-.1.6-.5 1.7-.5 1.7s1.5-.3 2.2-.7c1 .5 2.3.8 3.7.8.4 0 .8 0 1.1-.1-.1-.5-.2-1-.2-1.5 0-3.7 3.6-6.7 8-6.7.6 0 1.1.1 1.7.2C18 3.9 13.7 2 8.5 2z"/>'
  },
  {
    key: 'moments',
    label: '朋友圈',
    svg: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'
  },
  {
    key: 'link',
    label: '复制链接',
    svg: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
  },
  {
    key: 'more',
    label: '更多',
    svg: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>'
  },
]

function onSelect(channel) {
  emit('share', { channel, title: props.title, desc: props.desc, url: props.url })
}
function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.share-sheet {
  width: 100%;
  max-width: 480px;
  background: var(--card, #fff);
  border-radius: 20px 20px 0 0;
  padding: 0 0 env(safe-area-inset-bottom);
  animation: slideUp 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
.share-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--line, #e5e7eb);
  margin: 10px auto 14px;
}
.share-title {
  text-align: center;
  font-size: 14px;
  color: var(--text-sub, #666);
  margin-bottom: 18px;
}
.share-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 16px 20px;
}
.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.share-icon {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.share-icon--wechat { background: #07C160; }
.share-icon--moments { background: #07C160; }
.share-icon--link { background: var(--brand, #4D7CFF); }
.share-icon--more { background: var(--text-sub, #666); }
.share-label {
  font-size: 12px;
  color: var(--text, #111);
}
.share-gap {
  height: 8px;
  background: var(--bg, #F5F7FA);
}
.share-cancel {
  width: 100%;
  padding: 15px 0 calc(15px + env(safe-area-inset-bottom));
  font-size: 16px;
  color: var(--text, #111);
  background: var(--card, #fff);
  border-radius: 0;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>

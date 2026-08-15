<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">新手指导视频</span>
    </div>

    <div class="list">
      <div v-for="v in guideVideos" :key="v.id" class="video">
        <div class="video__t">{{ v.title }}</div>
        <div class="player" @click="onPlay(v)">
          <div class="player__mask">视频将在预览时播放</div>
          <div class="player__bar">
            <IconSvg class="play" name="play" :size="12" />
            <span class="time">0:00 / 0:00</span>
            <span class="spacer"></span>
            <IconSvg class="vol" name="volume" :size="14" />
            <IconSvg class="full" name="maximize" :size="14" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { guideVideos } from '../data/mock'
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()
function onPlay(v) {
  // 真实环境：调用 bridge 拉起原生播放器 / 或 <video> 加载视频源
  console.log('[guide] play video', v.id)
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.nav { height: 48px; display: flex; align-items: center; justify-content: center; position: relative; background: var(--card); border-bottom: 1px solid var(--line); }
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.list { padding: 12px; display: flex; flex-direction: column; gap: 16px; }
.video__t { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.player { position: relative; border-radius: var(--radius); overflow: hidden; background: linear-gradient(135deg, #3a3a3a, #1c1c1c); aspect-ratio: 16 / 9; }
.player__mask { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.7); font-size: 13px; }
.player__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 28px; display: flex; align-items: center; gap: 10px; padding: 0 10px; background: rgba(0,0,0,.45); color: #fff; font-size: 11px; }
.player__bar .play,
.player__bar .vol,
.player__bar .full {
  display: flex;
  align-items: center;
  justify-content: center;
}
.player__bar .spacer { flex: 1; }
</style>

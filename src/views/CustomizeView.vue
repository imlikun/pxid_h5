<template>
  <div class="page">
    <TopBar title="购车定制" />

    <div class="body">
      <div class="group">
        <div class="gl">选择车型</div>
        <div class="opts">
          <button
            v-for="m in opts.models"
            :key="m.id"
            class="opt"
            :class="{ on: model === m.id }"
            @click="model = m.id"
          >{{ m.name }}</button>
        </div>
        <div class="desc" v-if="modelDesc">{{ modelDesc }}</div>
      </div>

      <div class="group">
        <div class="gl">车身颜色</div>
        <div class="opts">
          <button
            v-for="c in opts.colors"
            :key="c"
            class="opt"
            :class="{ on: color === c }"
            @click="color = c"
          >{{ c }}</button>
        </div>
      </div>

      <div class="group">
        <div class="gl">电池续航</div>
        <div class="opts">
          <button
            v-for="b in opts.batteries"
            :key="b"
            class="opt"
            :class="{ on: battery === b }"
            @click="battery = b"
          >{{ b }}</button>
        </div>
      </div>
    </div>

    <div class="footer">
      <button class="submit" @click="onSubmit">提交定制意向</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { customizeOptions } from '../data/mock'
import { bridge } from '../bridge'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
const opts = customizeOptions
const model = ref(opts.models[0].id)
const color = ref(opts.colors[0])
const battery = ref(opts.batteries[0])
const modelDesc = computed(() => (opts.models.find((m) => m.id === model.value) || {}).desc || '')

function onSubmit() {
  // 决策 2/8：定制意向提交由原生承载；H5 兜底仅演示参数回传
  const q = new URLSearchParams({
    model: model.value,
    color: color.value,
    battery: battery.value,
  }).toString()
  bridge.openNative('buy/customize?' + q)
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
.body { padding: 12px; }
.group { background: var(--card); border-radius: var(--radius); padding: 14px; margin-bottom: 12px; }
.gl { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
.opts { display: flex; flex-wrap: wrap; gap: 10px; }
.opt {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 8px 14px;
}
.opt.on { color: var(--brand); border-color: var(--brand); background: var(--brand-soft); font-weight: 600; }
.desc { margin-top: 10px; font-size: 12px; color: var(--text-hint); }
.footer { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: var(--card); border-top: 1px solid var(--line); }
.submit { width: 100%; height: 48px; border: none; border-radius: 24px; background: var(--brand-gradient); color: #fff; font-size: 16px; font-weight: 600; }
</style>

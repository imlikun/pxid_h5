<template>
  <div class="store">
    <div v-if="tag" class="store__tag">{{ tag }}</div>
    <div class="store__main">
      <div class="store__name">{{ store.name }}</div>
      <div class="store__rate">
        <span class="star"><IconSvg name="star" :size="14" /> {{ store.rating }}</span>
        <span class="rev">{{ store.reviews }}条评价</span>
        <span class="dist">{{ store.distance }}</span>
      </div>
      <div class="store__addr">{{ store.address }}</div>
    </div>
    <div class="store__acts">
      <button class="act" @click="onMap">地图导航</button>
      <button class="act act--call" @click="onCall">门店电话</button>
    </div>
  </div>
</template>

<script setup>
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'

const props = defineProps({
  store: { type: Object, required: true },
  tag: { type: String, default: '' },
})

function onMap() {
  bridge.openMap({ lat: props.store.lat, lng: props.store.lng, name: props.store.name })
}
function onCall() {
  bridge.callPhone(props.store.phone)
}
</script>

<style scoped>
.store {
  background: var(--card);
  border-radius: var(--radius);
  padding: 14px;
  margin: 0 12px;
}
.store__tag {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}
.store__name {
  font-size: 15px;
  font-weight: 700;
}
.store__rate {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-sub);
}
.star {
  color: #ffb400;
  font-weight: 700;
}
.store__addr {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 6px;
}
.store__acts {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.act {
  flex: 1;
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: var(--radius-xxl);
  padding: 8px 0;
  font-size: 13px;
}
.act--call {
  background: var(--card);
  color: var(--text);
}
</style>

<template>
  <div class="service">
    <div class="topbar">
      <div class="title">服务</div>
    </div>

    <!-- 服务模块已由 App 原生实现（Flutter 原生页面全接管），H5 不再承载 -->
    <div class="native-box fade-up stagger-1">
      <div class="native-icon">
        <IconSvg name="headset" :size="40" />
      </div>
      <div class="native-title">服务模块已升级</div>
      <div class="native-desc">
        道路救援 · 使用指南 · 车辆体检 · 三包政策<br />
        附近门店 · 我的工单 · 常见问题<br /><br />
        以上服务已由 App 原生提供更流畅的体验，<br />
        请使用最新版 App 访问。
      </div>
    </div>
  </div>
</template>

<script setup>
import IconSvg from '../components/IconSvg.vue'
</script>

<style scoped>
.service {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
}
.topbar {
  padding: 16px 16px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.native-box {
  margin: 60px 24px;
  text-align: center;
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 40px 20px;
}
.native-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.native-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}
.native-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.8;
}
</style>

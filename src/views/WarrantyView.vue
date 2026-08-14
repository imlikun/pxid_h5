<template>
  <div class="page">
    <!-- 顶部导航 -->
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">三包政策</span>
    </div>

    <!-- 产品图 -->
    <div class="hero">
      <img class="hero-img" :src="currentModel.img" alt="车型" />
    </div>

    <!-- 车型选择 -->
    <div class="model-select" @click="showModels = !showModels">
      <span class="ms-label">车型选择</span>
      <span class="ms-value">{{ currentModel.name }}</span>
      <svg class="ms-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      <div v-if="showModels" class="model-pop">
        <div
          v-for="m in models"
          :key="m.name"
          class="model-pop-item"
          :class="{ on: m.name === currentModel.name }"
          @click.stop="pickModel(m)"
        >{{ m.name }}</div>
      </div>
    </div>

    <!-- 三包表格 -->
    <div class="table-card">
      <div class="tr tr--head">
        <span class="td td--part">部件</span>
        <span class="td td--period">期限</span>
        <span class="td td--note">说明</span>
      </div>
      <div v-for="(row, i) in currentModel.table" :key="i" class="tr">
        <span class="td td--part">{{ row.part }}</span>
        <span class="td td--period">{{ row.period }}</span>
        <span class="td td--note">{{ row.note }}</span>
      </div>
    </div>

    <!-- 注 -->
    <div class="note">
      <strong>注：</strong>所有配件不循环三包，质保期内更换的配件三包期按购买时的三包剩余日期计算。
    </div>

    <!-- 服务范围 -->
    <div class="scope">
      <div class="scope-title">服务范围</div>
      <p class="scope-law">
        本公司依据《中华人民共和国消费者权益保护法》、《中华人民共和国产品质量法》等国家相关法律、法规规定实行售后三包服务。
      </p>
      <div class="scope-sub">具体服务内容如下：</div>
      <ol class="scope-list">
        <li>本公司生产的电动代步工具，因原装零部件的材料、制造、包装、储运等而产生的质量缺陷时，影响外观、完整性和使用性能，按保修条例中标明的范围及期限给予免费保修。</li>
        <li>保修主要通过调整、修复为主，更换新件为辅进行，保修换下的零部件全部归本公司所有。</li>
        <li>三包维修后的车辆应达到本公司的相关技术要求。</li>
        <li>三包期起始计算方法：以发票日期、购车凭证、车辆绑定日期为准（以优先发生日起计算）。</li>
      </ol>
      <div class="scope-sub">售出产品发生以下情况的，不属于保修服务范围，需用户自费进行维修及相关服务：</div>
      <ul class="scope-list scope-list--dash">
        <li>超过规定“三包”时限和范围的，视为超出保修期。</li>
        <li>用户未按产品使用说明的规定正确使用、驾驶、保养及调整而造成的。</li>
        <li>售出产品因雨水、冰雪浸泡、烟熏、药品、化学用品腐蚀等造成的损坏或自然产品故障或损坏的。</li>
        <li>售出产品遭遇不可抗力影响的（包括但不限于地震、台风、火灾、水灾、社会事件、群体事件、暴力犯罪等）造成的故障或损坏的。</li>
        <li>未在官方授权服务中心进行维修，自行改装、分解、维修以及破坏产品整体及零部件正常使用状态的。</li>
        <li>用户使用非原厂配件造成的零部件损坏或擅自改动电路、线路配置的。</li>
        <li>用户在行驶过程中撞车、摔车、超载、超速等人为因素造成的故障或损坏的。</li>
        <li>按处理价出售的以及用户用作竞赛、试验、出租、营运等特殊用途使用的。</li>
        <li>对使用功能没有影响的、感觉上的现象，因时间变化而引起的不良现象（如油漆件保护层的表面自然褪色）。</li>
        <li>赠送物品类不在保修范围。</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 车型数据：框架阶段 P1 用设计稿真实数据，其余车型暂共用 P1（接后端后按车型下发）
const p1Table = [
  { part: '电机', period: '3年', note: '出现线圈烧毁、缺相、退磁、短路等性能或功能质量问题，0-24个月换新，后12个月维修或维护电机（非个为因素）' },
  { part: '控制器', period: '1年', note: '功能性故障（非人为因素）' },
  { part: '仪表', period: '1年', note: '屏幕无帮黑屏、性能故障、主板损坏（非人为因素）' },
  { part: '车架', period: '2年', note: '非外力导致的变形、脱焊、断裂等质量问题（非人为因素）' },
  { part: '车架套件', period: '1年', note: '因产品原因发生的性能故障或质量问题且无法修复（非人为因素）' },
  { part: '充电器', period: '1年', note: '因产品原因发生的性能故障或质量问题且无法修复（非人为因素）' },
  { part: '充电器', period: '1年', note: '功能性故障（非人为因素）' },
  { part: '防盗器', period: '1年', note: '主机主板无故损坏、遥控器电路板失效、传感器硬件缺陷（非人为因素）' },
  { part: '中控', period: '1年', note: '因产品原因发生的性能故障或质量问题且无法修复（非人为因素）' },
  { part: '中控总成', period: '1年', note: '因产品原因发生的性能故障或质量问题且无法修复（非人为因素）' },
]

const models = [
  { name: 'P1', img: 'unsplash/photo-1571068316344-75bc76f77890_w_800_q_80.jpg', table: p1Table },
  { name: 'P2', img: 'feed_r2.jpg', table: p1Table },
  { name: 'P3', img: 'unsplash/photo-1565193566173-7a0ee3dbe261_w_800_q_80.jpg', table: p1Table },
  { name: 'H10', img: 'unsplash/photo-1558618666-fcd25c85cd64_w_800_q_80.jpg', table: p1Table },
  { name: 'M2', img: 'feed_r3.jpg', table: p1Table },
  { name: 'Z3', img: 'unsplash/photo-1517649763962-0c623066013b_w_800_q_80.jpg', table: p1Table },
]

const currentModel = ref(models[0])
const showModels = ref(false)

function pickModel(m) {
  currentModel.value = m
  showModels.value = false
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
}
.back { position: absolute; left: 12px; display: flex; color: #333; }
.title { font-size: 17px; font-weight: 600; color: #333; }

.hero {
  padding: 12px;
}
.hero-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: var(--radius);
  background: #f2f4f7;
}

.model-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 10px;
}
.ms-label { font-size: 14px; color: #666; }
.ms-value { flex: 1; font-size: 15px; font-weight: 600; color: #333; }
.ms-caret { flex: none; }
.model-pop {
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  margin-top: 4px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 20;
  overflow: hidden;
}
.model-pop-item {
  padding: 12px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #f2f2f2;
}
.model-pop-item:last-child { border-bottom: none; }
.model-pop-item.on { color: var(--brand); font-weight: 600; }

.table-card {
  margin: 0 12px 12px;
  background: var(--bg);
  border-radius: 10px;
  overflow: hidden;
}
.tr {
  display: flex;
  align-items: flex-start;
  padding: 14px 12px;
  border-bottom: 1px solid #ececec;
}
.tr:last-child { border-bottom: none; }
.tr--head {
  background: #eef0f3;
  font-weight: 600;
  color: #333;
  align-items: center;
}
.td { font-size: 13px; color: #333; line-height: 1.5; }
.td--part { width: 26%; }
.td--period { width: 18%; color: #e53935; font-weight: 600; }
.tr--head .td--period { color: #e53935; }
.td--note { flex: 1; color: #666; line-height: 1.6; }

.note {
  margin: 0 12px 12px;
  font-size: 12px;
  color: #888;
  line-height: 1.6;
  background: #f7f8fa;
  padding: 10px 12px;
  border-radius: 8px;
}

.scope {
  margin: 0 12px;
}
.scope-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}
.scope-law {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  margin: 0 0 8px;
}
.scope-sub {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 10px 0 6px;
}
.scope-list {
  margin: 0;
  padding-left: 18px;
}
.scope-list li {
  font-size: 12px;
  color: #666;
  line-height: 1.7;
  margin-bottom: 4px;
}
</style>

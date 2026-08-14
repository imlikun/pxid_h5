<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-bind="$attrs"
  >
    <!-- 发现：立即定制 -->
    <g v-if="name === 'scissors'">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M6 9l12 12" />
      <path d="M18 9L6 21" />
    </g>

    <!-- 官方公告 / 通知 -->
    <g v-else-if="name === 'megaphone' || name === 'announce'">
      <path d="M3 11l18-5v12L3 13v-2z" />
      <path d="M3 13v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6" />
    </g>

    <!-- 智能助手 / 客服 -->
    <g v-else-if="name === 'headset'">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </g>

    <!-- 积分 / 礼物 -->
    <g v-else-if="name === 'gift'">
      <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      <path d="M2 12h20" />
      <path d="M12 2a4 4 0 0 1 4 4v6H8V6a4 4 0 0 1 4-4z" />
      <path d="M12 2v18" />
    </g>

    <!-- 道路救援 -->
    <g v-else-if="name === 'wrench'">
      <path d="M3 15h13a2 2 0 0 0 2-2v-2H5v-2h13V8a2 2 0 0 0-2-2h-2l-1.5-3H8v5H3a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2z" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="17" cy="15" r="1.5" />
      <path d="M16 5v4" />
    </g>

    <!-- 使用指南 -->
    <g v-else-if="name === 'book-open'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <path d="M12 3v2" />
    </g>

    <!-- 车辆体检 -->
    <g v-else-if="name === 'gauge'">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <path d="M9 12l2 2 5-5" />
    </g>

    <!-- 意见反馈 -->
    <g v-else-if="name === 'message-circle'">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
      <path d="M12 8v4" />
      <circle cx="12" cy="15" r=".8" />
    </g>

    <!-- 三包政策 -->
    <g v-else-if="name === 'shield-check'">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <text x="12" y="14" text-anchor="middle" font-size="8" fill="currentColor" font-weight="bold" stroke="none">保</text>
    </g>

    <!-- 我的工单 -->
    <g v-else-if="name === 'clipboard-list'">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      <path d="M9 14h6" />
      <path d="M9 10h6" />
    </g>

    <!-- 热购榜单 -->
    <g v-else-if="name === 'flame'">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.7-3.5-1-6 1-8 2.5 2.5 5 5.5 5 9.5a6.5 6.5 0 0 1-13 0c0-2.5 1.5-4 3.5-5.5 0 3 1 5 2 9.5z" />
    </g>

    <!-- 近期上新 -->
    <g v-else-if="name === 'sparkles'">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      <path d="M19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </g>

    <!-- 玩转积分 -->
    <g v-else-if="name === 'award'">
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v7" />
      <path d="M8 18l4 2 4-2" />
    </g>

    <!-- 购物车 -->
    <g v-else-if="name === 'shopping-cart'">
      <path d="M6 6h15l-1.5 9h-12L6 6z" />
      <path d="M6 6L5 3H2" />
      <circle cx="9" cy="20" r="2" />
      <circle cx="19" cy="20" r="2" />
    </g>

    <!-- 车辆 / 电动车 -->
    <g v-else-if="name === 'scooter' || name === 'car'">
      <path d="M8 17h8a3 3 0 0 0 3-3v-2a2 2 0 0 0-2-2h-3l-2-5H9v4H6a2 2 0 0 0-2 2v3a3 3 0 0 0 3 3z" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </g>

    <!-- 播放 -->
    <g v-else-if="name === 'play'">
      <polygon points="5 3 19 12 5 21 5 3" />
    </g>

    <!-- 音量 -->
    <g v-else-if="name === 'volume'">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </g>

    <!-- 全屏 -->
    <g v-else-if="name === 'maximize'">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </g>

    <!-- 消息：通知 -->
    <g v-else-if="name === 'bell'">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </g>

    <!-- 消息：互动 -->
    <g v-else-if="name === 'chat'">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0z" />
    </g>

    <!-- 封面：春/花 -->
    <g v-else-if="name === 'flower'">
      <circle cx="12" cy="6" r="2.3" />
      <circle cx="17.8" cy="9.3" r="2.3" />
      <circle cx="15.5" cy="16.5" r="2.3" />
      <circle cx="8.5" cy="16.5" r="2.3" />
      <circle cx="6.2" cy="9.3" r="2.3" />
      <circle cx="12" cy="12" r="1.9" />
    </g>

    <!-- 封面：原厂配件 / 齿轮 -->
    <g v-else-if="name === 'gear'">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
    </g>

    <!-- 封面：智能中控屏 -->
    <g v-else-if="name === 'device'">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </g>

    <!-- 星级 -->
    <g v-else-if="name === 'star'">
      <path d="M12 3.5l2.5 5.1 5.6.8-4 4 1 5.6L12 16.7 6.9 19l1-5.6-4-4 5.6-.8z" fill="currentColor" />
    </g>

    <!-- 默认占位：圆圈问号 -->
    <g v-else>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <circle cx="12" cy="17" r=".5" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [String, Number], default: 24 },
  stroke: { type: [String, Number], default: 1.6 },
})
</script>

<template>
  <div class="pg">
    <TopBar :title="t('points.guideTitle')" />
    <div class="pg__body">
      <!-- 如何赚积分 -->
      <div class="pg__sec">
        <div class="pg__sec-title">{{ C.earn.title }}</div>
        <div class="pg__sec-desc">{{ C.earn.desc }}</div>
        <div v-for="(it, i) in C.earn.items" :key="i" class="pg__row">
          <div class="pg__row-icon">{{ it.icon }}</div>
          <div class="pg__row-body">
            <div class="pg__row-name">{{ it.name }}</div>
            <div class="pg__row-desc">{{ it.desc }}</div>
          </div>
          <div class="pg__row-pts">{{ it.pts }}</div>
        </div>
      </div>

      <!-- 如何花积分 -->
      <div class="pg__sec">
        <div class="pg__sec-title">{{ C.spend.title }}</div>
        <div class="pg__sec-desc">{{ C.spend.desc }}</div>
        <div v-for="(it, i) in C.spend.items" :key="i" class="pg__row">
          <div class="pg__row-icon">{{ it.icon }}</div>
          <div class="pg__row-body">
            <div class="pg__row-name">{{ it.name }}</div>
            <div class="pg__row-desc">{{ it.desc }}</div>
          </div>
          <div class="pg__row-pts">{{ it.pts }}</div>
        </div>
      </div>

      <!-- 等级成长 -->
      <div class="pg__sec">
        <div class="pg__sec-title">{{ C.level.title }}</div>
        <div class="pg__sec-desc">{{ C.level.desc }}</div>
        <div v-for="(it, i) in C.level.items" :key="i" class="pg__row">
          <div class="pg__row-icon">{{ it.icon }}</div>
          <div class="pg__row-body">
            <div class="pg__row-name">{{ it.name }}</div>
            <div class="pg__row-desc">{{ it.desc }}</div>
          </div>
          <div class="pg__row-pts">{{ it.pts }}</div>
        </div>
      </div>

      <!-- 常见问题 -->
      <div class="pg__sec" v-if="C.faq && C.faq.items.length">
        <div class="pg__sec-title">{{ C.faq.title }}</div>
        <div v-for="(qa, i) in C.faq.items" :key="i" class="pg__faq">
          <div class="pg__faq-q">{{ qa[0] }}</div>
          <div class="pg__faq-a">{{ qa[1] }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TopBar from '../components/TopBar.vue'
import { t, locale } from '../i18n'

const CONTENT = {
  zh: {
    earn: {
      title: '如何赚积分',
      desc: '日常互动都能赚积分，攒起来换好物',
      items: [
        { icon: '📅', name: '每日签到', desc: '每天签到领取积分，连续签到奖励更高', pts: '+10~50' },
        { icon: '🛒', name: '购物返积分', desc: '商城下单按实付金额返积分', pts: '1元=1分' },
        { icon: '📝', name: '发布动态', desc: '在发现页发布骑行动态，审核通过即得积分', pts: '+20' },
        { icon: '👍', name: '互动有礼', desc: '内容获赞、被关注可获得积分', pts: '+5~15' },
      ],
    },
    spend: {
      title: '如何花积分',
      desc: '积分可兑换精选好物，也可在结算时抵扣金额',
      items: [
        { icon: '🎁', name: '积分商城', desc: '精选好物支持积分 + 现金兑换，兑换后 48 小时内发货', pts: '见商城' },
        { icon: '💰', name: '下单抵扣', desc: '结算时用积分抵扣部分订单金额', pts: '100分=¥1' },
      ],
    },
    level: {
      title: '等级成长',
      desc: '累计积分提升等级，解锁更多专属权益',
      items: [
        { icon: '🥉', name: '青铜', desc: '初始等级', pts: '0分' },
        { icon: '🥈', name: '白银', desc: '解锁日常任务', pts: '500分' },
        { icon: '🥇', name: '黄金', desc: '专属折扣权益', pts: '2000分' },
        { icon: '💎', name: '钻石', desc: '优先客服 + 新品内测', pts: '5000分' },
        { icon: '👑', name: '王者', desc: '尊享礼遇', pts: '10000分' },
      ],
    },
    faq: {
      title: '常见问题',
      items: [
        ['积分会过期吗？', '积分自获得之日起 12 个月有效，过期自动清零。'],
        ['兑换后多久发货？', '积分兑换商品 48 小时内安排发货，可在订单中心查看物流。'],
        ['签到中断了怎么办？', '连续签到中断后将从 1 天重新累计，建议每天保持签到。'],
      ],
    },
  },
  en: {
    earn: {
      title: 'How to Earn Points',
      desc: 'Earn points through daily interactions',
      items: [
        { icon: '📅', name: 'Daily Check-in', desc: 'Check in daily for points; streaks earn more', pts: '+10~50' },
        { icon: '🛒', name: 'Shop & Earn', desc: 'Earn points on every store order', pts: '¥1 = 1pt' },
        { icon: '📝', name: 'Post a Feed', desc: 'Share riding moments on Discover', pts: '+20' },
        { icon: '👍', name: 'Get Engaged', desc: 'Earn points from likes and follows', pts: '+5~15' },
      ],
    },
    spend: {
      title: 'How to Spend Points',
      desc: 'Redeem for curated goods or offset order amounts',
      items: [
        { icon: '🎁', name: 'Points Mall', desc: 'Redeem goods with points + cash; ships within 48h', pts: 'Mall' },
        { icon: '💰', name: 'Order Offset', desc: 'Offset part of your order at checkout', pts: '100pts = ¥1' },
      ],
    },
    level: {
      title: 'Level Up',
      desc: 'Accumulate points to level up and unlock perks',
      items: [
        { icon: '🥉', name: 'Bronze', desc: 'Starting level', pts: '0pts' },
        { icon: '🥈', name: 'Silver', desc: 'Unlock daily tasks', pts: '500pts' },
        { icon: '🥇', name: 'Gold', desc: 'Exclusive discounts', pts: '2000pts' },
        { icon: '💎', name: 'Diamond', desc: 'Priority support + beta access', pts: '5000pts' },
        { icon: '👑', name: 'King', desc: 'Premium perks', pts: '10000pts' },
      ],
    },
    faq: {
      title: 'FAQ',
      items: [
        ['Do points expire?', 'Points are valid for 12 months from the day they are earned.'],
        ['When will my redemption ship?', 'Redemptions ship within 48 hours; track in your orders.'],
        ['What if I miss a check-in day?', 'Your streak restarts from day 1; check in daily to keep it.'],
      ],
    },
  },
  pt: {
    earn: {
      title: 'Como Ganhar Pontos',
      desc: 'Ganhe pontos com interações diárias',
      items: [
        { icon: '📅', name: 'Check-in Diário', desc: 'Check-in diário; sequências rendem mais', pts: '+10~50' },
        { icon: '🛒', name: 'Comprar e Ganhar', desc: 'Ganhe pontos em cada pedido', pts: '¥1 = 1pt' },
        { icon: '📝', name: 'Publicar Feed', desc: 'Compartilhe momentos no Descobrir', pts: '+20' },
        { icon: '👍', name: 'Interaja', desc: 'Ganhe pontos com curtidas e seguidores', pts: '+5~15' },
      ],
    },
    spend: {
      title: 'Como Gastar Pontos',
      desc: 'Troque por produtos ou desconte no pedido',
      items: [
        { icon: '🎁', name: 'Loja de Pontos', desc: 'Troque com pontos + dinheiro; envio em 48h', pts: 'Loja' },
        { icon: '💰', name: 'Desconto no Pedido', desc: 'Desconte parte do pedido no checkout', pts: '100pts = ¥1' },
      ],
    },
    level: {
      title: 'Suba de Nível',
      desc: 'Acumule pontos para subir de nível e desbloquear vantagens',
      items: [
        { icon: '🥉', name: 'Bronze', desc: 'Nível inicial', pts: '0pts' },
        { icon: '🥈', name: 'Prata', desc: 'Desbloqueia tarefas diárias', pts: '500pts' },
        { icon: '🥇', name: 'Ouro', desc: 'Descontos exclusivos', pts: '2000pts' },
        { icon: '💎', name: 'Diamante', desc: 'Suporte prioritário + beta', pts: '5000pts' },
        { icon: '👑', name: 'Rei', desc: 'Vantagens premium', pts: '10000pts' },
      ],
    },
    faq: {
      title: 'Perguntas Frequentes',
      items: [
        ['Os pontos expiram?', 'Os pontos são válidos por 12 meses a partir do dia em que foram ganhos.'],
        ['Quando meu resgate será enviado?', 'Resgates são enviados em 48h; acompanhe em seus pedidos.'],
        ['E se eu perder um dia de check-in?', 'Sua sequência recomeça do dia 1; faça check-in diário.'],
      ],
    },
  },
}

const C = computed(() => CONTENT[locale.value] || CONTENT.zh)
</script>

<style scoped>
.pg {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 24px;
}
.pg__body {
  padding: 12px 16px;
}
.pg__sec {
  margin-bottom: 14px;
  padding: 16px;
  background: var(--card);
  border-radius: var(--radius-lg);
}
.pg__sec-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.pg__sec-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}
.pg__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line, rgba(0, 0, 0, 0.05));
}
.pg__row:last-child {
  border-bottom: none;
}
.pg__row-icon {
  width: 40px;
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--brand-soft, rgba(77, 124, 255, 0.1));
  font-size: 20px;
}
.pg__row-body {
  flex: 1;
  min-width: 0;
}
.pg__row-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.pg__row-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-hint);
  line-height: 1.4;
}
.pg__row-pts {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand);
  background: var(--brand-soft, rgba(77, 124, 255, 0.1));
  padding: 3px 10px;
  border-radius: var(--radius-pill, 999px);
}
.pg__faq {
  margin-top: 10px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--bg, #f5f6fa);
}
.pg__faq-q {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.pg__faq-a {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
  line-height: 1.5;
}
</style>

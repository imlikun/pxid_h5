<template>
  <div class="pcard" @click="go">
    <div class="pcard__cover">{{ product.cover }}</div>
    <div class="pcard__name">{{ product.name }}</div>
    <div class="pcard__price">
      <span class="price">¥{{ product.price }}</span>
      <span v-if="product.origin" class="origin">¥{{ product.origin }}</span>
    </div>
    <div class="pcard__meta">
      <span v-if="product.tag" class="tag">{{ product.tag }}</span>
      <span class="sales">已售 {{ product.sales }}</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  product: { type: Object, required: true },
})
const router = useRouter()

function go() {
  router.push('/product/' + props.product.id)
}
</script>

<style scoped>
.pcard {
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
}
.pcard__cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  background: linear-gradient(135deg, #f3f6ff, #eaf1ff);
}
.pcard__name {
  padding: 8px 10px 0;
  font-size: 13px;
  line-height: 1.3;
  min-height: 34px;
}
.pcard__price {
  padding: 4px 10px 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 16px;
}
.origin {
  color: var(--text-sub);
  font-size: 11px;
  text-decoration: line-through;
}
.pcard__meta {
  padding: 6px 10px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tag {
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
}
.sales {
  color: var(--text-sub);
  font-size: 11px;
}
</style>

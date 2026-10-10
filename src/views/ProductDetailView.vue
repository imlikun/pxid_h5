<template>
  <div class="product-page">
  <div class="detail" v-if="product">
    <!-- 顶栏 -->
    <TopBar sticky :title="isPart ? '原厂配件' : isVehicle ? '整车详情' : '商品详情'" :back="goBack">
      <template #right>
        <span class="cart press" @click="goCart">
          <IconSvg name="shopping-cart" :size="24" />
          <span v-if="cartCount > 0" class="badge">{{ cartCount > 99 ? '99+' : cartCount }}</span>
        </span>
      </template>
    </TopBar>

    <!-- 折叠屏左右分栏容器：左主图常驻 + 右信息滚动 -->
    <div class="pd-split">
    <!-- 当前颜色图廊：首帧沿用列表封面，切色才加载对应图片 -->
    <div class="gallery-frame">
    <div class="gallery" ref="gallery" @scroll="onGalleryScroll">
      <img
        v-for="(src, i) in galleryImages"
        :key="src"
        class="slide"
        :src="src"
        :alt="product.name"
        :loading="i === 0 ? 'eager' : 'lazy'"
        @load="detailTrace?.media()"
      />
      <div v-if="!galleryImages.length" class="slide empty-slide">无图</div>
    </div>
    <span class="gallery-brand" :class="{ 'gallery-brand--plain': isVehicle }">{{ isPart ? (product.vendor || '配件') : 'PXID' }}</span>
    <span v-if="galleryImages.length" class="gallery-count">{{ activeIdx + 1 }}/{{ galleryImages.length }}</span>

    </div>

    <div class="product-content" v-if="product.name">
    <!-- 信息卡 -->
    <div class="card info">
      <div class="price-row">
        <span class="price">{{ sym(product.currency) }}{{ displayPrice }}</span>
        <span v-if="displayOrigin" class="origin">{{ sym(product.currency) }}{{ displayOrigin }}</span>
      </div>
      <div class="name">{{ product.name }}</div>
      <div class="tagline">{{ isPart ? '配件 · 请先核对适配车型' : isVehicle ? '选择颜色与版本，查看对应图片和价格' : '商品信息以当前选项为准' }}</div>
      <div class="meta" v-if="product.vendor || product.tag">
        <span v-if="product.vendor" class="pill">{{ product.vendor }}</span>
        <span v-if="product.tag" class="pill pill--brand">{{ product.tag }}</span>
      </div>
    </div>

    <div class="card fit-card" v-if="isPart">
      <div class="fit-heading"><span aria-hidden="true">＋</span><strong>选择我的车型</strong></div>
      <button ref="fitTrigger" class="fit-picker press" type="button" :disabled="!detailReady"
        aria-haspopup="dialog" :aria-expanded="fitOpen" @click="fitOpen = true">
        <span class="fit-picker__text"><small>{{ fitDimension ? '商品车型规格' : '我的车型' }}</small><strong>{{ selectedFit || '请选择车型' }}</strong></span>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <p class="fit-note">{{ fitDimension ? '所选车型对应商品规格；具体适配请核对商品说明。' : selectedFit ? `已选 ${selectedFit}，仅用于核对，不改变商品规格或订单；请向商家确认适配。` : '选择车型便于核对；商品暂无可自动验证的适配数据，请向商家确认。' }}</p>
    </div>

    <div class="card core-card" v-if="isVehicle && coreSpecs.length">
      <div class="block__title">核心配置</div>
      <div class="core-grid">
        <div class="core-item" v-for="spec in coreSpecs" :key="spec.label">
          <strong>{{ spec.value }}</strong><span>{{ spec.label }}</span>
        </div>
      </div>
    </div>

    <div class="card selection-card">
      <div class="block__title">选择配置</div>
    <!-- 颜色选择（有颜色选项时显示，联动轮播图与规格） -->
    <div class="color-card" v-if="hasColor">
      <div class="selection-label">颜色</div>
      <p v-if="detailReady && !activeColor" class="color-hint">请选择颜色以查看对应图片</p>
      <div class="colors">
        <button
          v-for="cv in colorValues"
          :key="cv"
          class="color-btn"
          :class="{ active: activeColor === cv }"
          @click="selectColor(cv)"
          :disabled="!detailReady"
        >
          <img v-if="colorPreviews[cv] && !failedPreviews[colorPreviews[cv]]" class="color-swatch"
            :src="colorPreviews[cv]" alt="" aria-hidden="true" loading="lazy" decoding="async"
            @error="failedPreviews[colorPreviews[cv]] = true" />
          <span v-else class="color-swatch color-swatch--empty" aria-hidden="true">—</span>
          <span>{{ cv }}</span>
        </button>
      </div>
    </div>

    <!-- 规格（仅展示颜色之外的维度；颜色已由上方颜色卡选择） -->
    <div class="spec-card" v-if="purchaseSpecDims.length">
      <div class="spec-dim" v-for="dim in purchaseSpecDims" :key="dim.name">
        <div class="spec-dim__label">{{ specLabel(dim.name) }}</div>
        <div class="opts">
          <span
            v-for="val in dim.values"
            :key="val"
            class="opt"
            :class="{ active: (specPick[dim.name] || '') === val, soldout: !specComboAvailable(dim.name, val) }"
            @click="pickSpec(dim.name, val)"
            >{{ val }}<i v-if="!specComboAvailable(dim.name, val)">缺货</i></span
          >
        </div>
      </div>
    </div>

    <!-- 数量（紧跟规格，决策区） -->
    <div class="card--inline">
      <div class="selection-label">数量</div>
      <div class="qty">
        <button class="press" @click="changeQty(-1)">－</button>
        <span>{{ qty }}</span>
        <button class="press" @click="changeQty(1)">＋</button>
      </div>
    </div>
    </div>

    <!-- 规格参数 -->
    <div class="card" v-if="product.specs && product.specs.length">
      <div class="block__title">规格参数</div>
      <div class="specs">
        <div class="spec" v-for="(s, i) in product.specs" :key="i">
          <span class="spec__k">{{ s.label }}</span>
          <span class="spec__v">{{ s.value }}</span>
        </div>
      </div>
    </div>

    <!-- 商品描述（Shopify body_html 富文本） -->
    <div class="card desc" v-if="product.hasMerchantDescription && product.description">
      <div class="block__title">商品详情</div>
      <div class="prose" v-html="descriptionHtml"></div>
      <div class="more-link press" @click="openOrigin" v-if="product.shopUrl">
        前往 Shopify 查看完整详情 ↗
      </div>
    </div>
    <!-- 无描述时也提供入口 -->
    <div class="card desc" v-else-if="product.shopUrl">
      <div class="more-link press" @click="openOrigin">
        前往 Shopify 查看完整详情 ↗
      </div>
    </div>

    </div>
    <div v-else class="content-placeholder" aria-label="正在加载商品信息"><span></span><span></span><span></span></div>
    <div v-if="error" class="detail-error">{{ error }} <button @click="reload">重新加载</button></div>
    <div class="gap"></div>
    </div> <!-- /pd-split -->

    <!-- 底部吸底操作 -->
    <div class="actions">
      <button class="btn btn--cart pop press" @click="onAddCart" :disabled="!canPurchase">加入购物车</button>
      <button class="btn btn--buy pop press" @click="onBuy" :disabled="!canPurchase">立即购买</button>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
    <Teleport to="body">
      <transition name="fit-sheet">
        <div v-if="fitOpen && isPart" class="fit-overlay" @click.self="closeFit">
          <div ref="fitPanel" class="fit-panel" role="dialog" aria-modal="true" aria-labelledby="fit-panel-title" tabindex="-1" @keydown.esc.stop="closeFit">
            <div class="fit-panel__handle" aria-hidden="true"></div>
            <div class="fit-panel__head">
              <div><h2 id="fit-panel-title">选择车型</h2><p>{{ fitDimension ? '当前商品可选的车型规格' : '选择我的车型，用于购买前核对' }}</p></div>
              <button type="button" class="fit-panel__close" aria-label="关闭车型选择" @click="closeFit">×</button>
            </div>
            <div class="fit-panel__options">
              <button v-for="model in fitOptions" :key="model" type="button" class="fit-option"
                :class="{ 'fit-option--selected': selectedFit === model }"
                :disabled="!fitAvailable(model)" :aria-pressed="selectedFit === model" @click="selectFit(model)">
                <span>{{ model }}</span><span v-if="selectedFit === model" class="fit-option__check" aria-hidden="true">✓</span>
                <small v-else-if="!fitAvailable(model)">缺货</small>
              </button>
            </div>
            <p class="fit-panel__note">{{ fitDimension ? '选项来自 Shopify 商品规格；具体适配请核对商品说明。' : '选择仅用于核对，不代表商品适配该车型，也不会改变订单规格。' }}</p>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>

  <!-- 无点击快照的冷启动也保留详情结构，不再切到整页加载文案。 -->
  <div v-else-if="loading" class="detail product-skeleton" aria-busy="true" aria-label="正在加载商品信息">
    <TopBar sticky title="" :back="goBack" />
    <div class="gallery-frame product-skeleton__cover" aria-hidden="true"></div>
    <div class="content-placeholder" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="actions">
      <button class="btn btn--cart" disabled>加入购物车</button>
      <button class="btn btn--buy" disabled>立即购买</button>
    </div>
  </div>
  <div class="empty" v-else>
      <p>{{ error || '商品不存在' }}</p>
      <div class="empty__acts">
        <button class="press btn--retry" @click="goBack">返回精选</button>
        <button class="press btn--retry" @click="reload">重新加载</button>
      </div>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onActivated, onDeactivated, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProductDetail, getStore, sym, API_BASE, getRegion } from '../api/shop'
import { initLocale } from '../i18n'
import { productEntry } from '../utils/productNavigation'
import { CAR_MODEL_LABELS } from '../data/carModels'
import { variantForCover, colorOf, imagesForColor, sameImage, colorPreview } from '../utils/productPresentation'
import { addToCart, cartCount } from '../store/cart'
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'
import { createDetailTrace } from '../utils/detailDiagnostics'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const detailReady = ref(false)
const entryCover = ref('')
const productRegion = ref('')
const loading = ref(true)
const error = ref('')
const activeIdx = ref(0)
const activeVariant = ref(-1)
const qty = ref(1)
const personalFitModel = ref('')
const fitOpen = ref(false)
const fitTrigger = ref(null)
const fitPanel = ref(null)
const toast = ref('')
const gallery = ref(null)
const isPart = computed(() => product.value?.collection === 'p1parts')
const isVehicle = computed(() => product.value?.collection === 'spring')
const coreSpecs = computed(() => {
  const specs = product.value?.specs || []
  const selected = currentVariant.value?.selectedOptions || []
  return specs.filter((spec) => /range|续航|motor|电机|weight|重量/i.test(spec.label || ''))
    .map((spec) => ({
      label: spec.label,
      value: selected.find((option) => option.name === spec.label)?.value || spec.value,
    }))
    .filter((spec) => spec.value && !String(spec.value).includes(' / '))
    .slice(0, 3)
})

const currentVariant = computed(() => {
  const vs = product.value && product.value.variants
  if (vs && vs.length) return vs[activeVariant.value] || null
  return null
})
const displayPrice = computed(() => {
  if (currentVariant.value && currentVariant.value.price) return currentVariant.value.price
  return product.value ? product.value.price : 0
})
const displayOrigin = computed(() => {
  if (currentVariant.value) return currentVariant.value.compareAtPrice || null
  return variantList.value.length ? null : product.value?.origin
})

// —— 颜色主图联动（精选商品详情）——
// images 统一成对象（兼容列表缓存的字符串数组）；variants 取 selectedOptions 匹配颜色
const imageList = computed(() =>
  (product.value?.images || []).map((im) =>
    typeof im === 'string' ? { src: im, alt: '', id: '', variantIds: [] } : im
  )
)
const descriptionHtml = computed(() => {
  if (!product.value?.description) return ''
  const doc = new DOMParser().parseFromString(product.value.description, 'text/html')
  doc.querySelectorAll('img').forEach((im) => { im.setAttribute('loading', 'lazy'); im.setAttribute('decoding', 'async') })
  return doc.body.innerHTML
})
const variantList = computed(() => product.value?.variants || [])
const canPurchase = computed(() => detailReady.value &&
  (!variantList.value.length || (currentVariant.value && currentVariant.value.available !== false)))
const colorOption = computed(() =>
  (product.value?.options || []).find((o) => /color|colour|颜色/i.test(o.name)) || null
)
const colorValues = computed(() => (colorOption.value ? colorOption.value.values || [] : []))
const isColorOpt = (name) => /color|colour|颜色/i.test(name || '')
// 有颜色选项即可选色；缺少图片关联时显示占位，不加载其它颜色冒充。
const hasColor = computed(() => {
  const cv = colorValues.value
  if (!cv.length) return false
  return variantList.value.some((v) =>
    (v.selectedOptions || []).some((o) => isColorOpt(o.name) && o.value)
  )
})
// 列表封面在详情补全后继续保留；只渲染当前颜色，不把其它颜色先塞入 DOM。
const galleryImages = computed(() => {
  if (!product.value) return []
  const selected = hasColor.value
    ? (colorValues.value.length === 1 ? imageList.value.map((i) => i.src) : imagesForColor(product.value, activeColor.value))
    : (detailReady.value ? imageList.value.map((i) => i.src) : [])
  const first = entryCover.value || selected[0] || (!hasColor.value ? product.value.cover : '') || ''
  return first ? [first, ...selected.filter((s) => !sameImage(s, first))] : selected
})
const activeColor = ref('')
const specPick = reactive({}) // 颜色之外各规格维度的当前选中值 { Battery: '10 Ah' }

// 颜色之外的规格维度（如 Battery）；Title/单一默认维度视为无规格
const specDims = computed(() => {
  const opts = (product.value && product.value.options) || []
  const vs = variantList.value
  return opts
    .filter((o) => o.name && !isColorOpt(o.name) && !/^title$/i.test(o.name))
    .map((d) => {
      const seen = []
      vs.forEach((v) => {
        const so = (v.selectedOptions || []).find((s) => s.name === d.name)
        if (so && so.value && !seen.includes(so.value)) seen.push(so.value)
      })
      return { name: d.name, values: seen.length ? seen : (d.values || []).filter(Boolean) }
    })
    .filter((d) => d.values.length)
})
const fitDimension = computed(() => specDims.value.find((d) =>
  /^(model|vehicle model|compatible model|车型|适配车型|适用车型)$/i.test(d.name.trim()) &&
  variantList.value.some((v) => (v.selectedOptions || []).some((o) => o.name === d.name))
) || null)
const purchaseSpecDims = computed(() => specDims.value.filter((d) => d.name !== fitDimension.value?.name))
const fitOptions = computed(() => fitDimension.value?.values || CAR_MODEL_LABELS)
const selectedFit = computed(() => fitDimension.value ? specPick[fitDimension.value.name] || '' : personalFitModel.value)

let priorBodyOverflow = ''
watch(fitOpen, (open) => {
  if (open) {
    priorBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => fitPanel.value?.focus())
  } else {
    document.body.style.overflow = priorBodyOverflow
  }
})
onUnmounted(() => { if (fitOpen.value) document.body.style.overflow = priorBodyOverflow })
function closeFit() {
  fitOpen.value = false
  nextTick(() => fitTrigger.value?.focus())
}
function fitAvailable(model) {
  if (!fitDimension.value) return CAR_MODEL_LABELS.includes(model)
  const name = fitDimension.value?.name
  return !!name && variantList.value.some((v) => v.available !== false &&
    (v.selectedOptions || []).some((o) => o.name === name && o.value === model))
}
function selectFit(model) {
  if (!detailReady.value || !fitAvailable(model)) return
  if (!fitDimension.value) {
    personalFitModel.value = model
    closeFit()
    return
  }
  const name = fitDimension.value.name
  const matching = (v) => v.available !== false &&
    (v.selectedOptions || []).some((o) => o.name === name && o.value === model)
  const variants = variantList.value
  let index = variants.findIndex((v) => matching(v) && matchVariant(v, { [name]: model }))
  if (index < 0) index = variants.findIndex(matching)
  if (index < 0) return
  const previousColor = activeColor.value
  activeVariant.value = index
  activeColor.value = colorOf(variants[index])
  syncSpecFromVariant()
  if (previousColor !== activeColor.value) { entryCover.value = ''; resetGallery() }
  closeFit()
}

// 维度名汉化（英文店铺选项名 → 中文界面展示）
const SPEC_LABEL = { Battery: '电池容量', Size: '尺寸', Voltage: '电压', Capacity: '容量', Model: '型号', Color: '颜色' }
function specLabel(name) {
  return SPEC_LABEL[name] || name
}

// 某 variant 是否满足「当前颜色 + 各规格已选 + 覆盖项」组合
function matchVariant(v, overrides = {}) {
  const so = v.selectedOptions || []
  // 颜色条件：有颜色商品需匹配 activeColor
  if (hasColor.value && activeColor.value) {
    const hit = so.find((o) => isColorOpt(o.name))
    if (!hit || hit.value !== activeColor.value) return false
  }
  // 其它规格维度：已选值需匹配（overrides 优先）
  for (const d of specDims.value) {
    const want = overrides[d.name] !== undefined ? overrides[d.name] : specPick[d.name]
    if (!want) continue
    const hit = so.find((o) => o.name === d.name)
    if (!hit || hit.value !== want) return false
  }
  return true
}

// 颜色卡点击：替换当前色图片，并选择该颜色下存在的规格组合。
function selectColor(cv) {
  if (!detailReady.value) return
  activeColor.value = cv
  entryCover.value = ''
  resolveVariant()
  resetGallery()
}
// 规格维度点击：更新该维值 → 重建选中变体
function pickSpec(dimName, val) {
  if (!detailReady.value) return
  const exists = variantList.value.some((v) => matchVariant(v, { [dimName]: val }))
  if (!exists) return // 该颜色下无此组合，忽略点击
  specPick[dimName] = val
  resolveVariant()
}
// 某维度值在「当前颜色 + 其它已选维度」下是否存在可用变体（决定缺货标）
function specComboAvailable(dimName, val) {
  return variantList.value.some(
    (v) => v.available !== false && matchVariant(v, { [dimName]: val })
  )
}
// 优先保留其它规格；不存在该组合时回退到新颜色的首个真实变体。
function resolveVariant() {
  const vs = variantList.value
  if (!vs.length) return
  const idx = vs.findIndex((v) => matchVariant(v))
  if (idx >= 0) activeVariant.value = idx
  else {
    const colorIndex = vs.findIndex((v) => colorOf(v) === activeColor.value)
    if (colorIndex >= 0) { activeVariant.value = colorIndex; syncSpecFromVariant() }
  }
}
// 从当前选中变体回填各规格维度的默认选中值（首次进入/换商品时）
function syncSpecFromVariant() {
  const v = variantList.value[activeVariant.value] || variantList.value[0]
  if (!v) return
  const so = v.selectedOptions || []
  specDims.value.forEach((d) => {
    const hit = so.find((s) => s.name === d.name)
    specPick[d.name] = hit && hit.value ? hit.value : d.values[0]
  })
}
// 颜色/规格选中态初始化（cache 首屏与 detail 覆盖后共用）
function initSelection(preferredId = '') {
  const vs = variantList.value
  const preferred = vs.find((v) => String(v.id) === String(preferredId))
    || variantForCover(product.value, entryCover.value || product.value?.cover)
    || (colorValues.value.length <= 1 ? vs[0] : null)
  activeVariant.value = vs.indexOf(preferred)
  activeColor.value = colorOf(preferred)
  syncSpecFromVariant()
}
function resetGallery() {
  activeIdx.value = 0
  nextTick(() => { if (gallery.value) gallery.value.scrollLeft = 0 })
}
// 颜色选项始终使用该颜色关联的小图，文字与图共用同一颜色键。
const failedPreviews = reactive({})
const colorPreviews = computed(() => Object.fromEntries(
  colorValues.value.map((color) => [color, colorPreview(product.value, color)])
))

// 在首次 setup / 路由切换的同步阶段展示快照；异步回包只补当前商品。
let loadSeq = 0
let loadController = null, detailTrace = null
let detailMounted = false, readySeq = 0, lastReadyRoute = '', traceSource = 'api'
function schedulePageReady() {
  const path = route.fullPath, seq = ++readySeq
  if (!detailMounted || route.name !== 'product' || (!product.value?.name && loading.value) || lastReadyRoute === path) return
  nextTick(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (seq !== readySeq || route.fullPath !== path || (!product.value?.name && loading.value)) return
    lastReadyRoute = path
    detailTrace?.ready(product.value?.name ? traceSource : 'empty', bridge.notifyPageReady(route.path))
    if (!galleryImages.value.length || gallery.value?.querySelector('img')?.complete && gallery.value.querySelector('img').naturalWidth > 0) detailTrace?.media()
  })))
}
onMounted(() => { detailMounted = true; schedulePageReady() })
onActivated(() => { detailMounted = true; schedulePageReady() })
watch(() => [route.fullPath, product.value?.name, loading.value], schedulePageReady, { flush: 'post' })
onDeactivated(() => { detailMounted = false; ++readySeq; loadController?.abort(); detailTrace?.close(); lastReadyRoute = '' })
onUnmounted(() => { detailMounted = false; ++readySeq; loadController?.abort(); detailTrace?.close() })
async function load() {
  if (route.name !== 'product') return
  const handle = String(route.params.id)
  const path = route.fullPath
  const seq = ++loadSeq
  loadController?.abort()
  loadController = new AbortController()
  const signal = loadController.signal
  detailTrace?.close()
  detailTrace = createDetailTrace('product', route.path)
  lastReadyRoute = ''
  const query = { ...route.query }
  const stale = () => seq !== loadSeq || route.fullPath !== path
  const snapshot = productEntry(handle, query)
  traceSource = snapshot?.name ? 'snapshot' : 'api'
  product.value = snapshot
  entryCover.value = snapshot?.cover || ''
  detailReady.value = false
  loading.value = true
  error.value = ''
  activeVariant.value = -1
  activeColor.value = ''
  personalFitModel.value = ''
  fitOpen.value = false
  Object.keys(specPick).forEach((k) => delete specPick[k])
  qty.value = 1
  resetGallery()
  // 列表数据可能没有图与变体关联，不猜颜色；可解析时同步选中。
  if (snapshot) initSelection(query.variant)
  try {
    const localeStarted = performance.now()
    // The list already supplied the store. Do not wait for a second native
    // locale round-trip before issuing that known-region detail request.
    if (['CN', 'US', 'BR'].includes(query.region)) initLocale().catch(() => {})
    else await initLocale()
    if (stale()) return
    detailTrace?.set('locale', performance.now() - localeStarted)
    productRegion.value = ['CN', 'US', 'BR'].includes(query.region) ? query.region : getRegion()
    // 直链/全屏冷启动同样只请求这一件商品，不再请求商品全列表。
    const dataStarted = performance.now()
    const detail = await fetchProductDetail(handle, productRegion.value, { signal })
    if (stale()) return
    detailTrace?.set('data', performance.now() - dataStarted)
    if (detail) {
      // 展示文案采用本次点击快照，避免接口返回后整块插入/改行高；价格库存仍用实时变体。
      const display = snapshot?.presentationComplete ? Object.fromEntries(
        ['name', 'vendor', 'tag', 'tagline', 'origin', 'description', 'specs', 'sellingPoints', 'collection']
          .filter((key) => snapshot[key] !== undefined)
          .map((key) => [key, snapshot[key]])
      ) : {}
      product.value = { ...detail, ...display }
      if (!entryCover.value) entryCover.value = detail.cover || ''
      initSelection(query.variant)
      detailReady.value = true
    } else {
      error.value = '详情加载失败，请重试'
      detailTrace?.error()
    }
  } catch (e) {
    if (!stale()) { error.value = '详情加载失败，请重试'; detailTrace?.error() }
  } finally {
    if (!stale()) loading.value = false
  }
}
watch(() => route.name === 'product' ? route.fullPath : '', (path) => {
  if (path) load()
  else { ++loadSeq; loadController?.abort(); detailTrace?.close() } // 离屏时废弃在途请求，不重置正在离场的 DOM。
}, { immediate: true, flush: 'sync' })

function onGalleryScroll() {
  const el = gallery.value
  if (!el) return
  const w = el.clientWidth
  activeIdx.value = Math.round(el.scrollLeft / w)
}
function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1500)
}
function changeQty(d) {
  qty.value = Math.max(1, qty.value + d)
}
function goBack() {
  // /product/:id 为全屏 WebView 白名单路由（2026-09-08 对接说明）：
  // 第一层（无 H5 内部历史）关全屏路由回精选根页；有 H5 内部历史（如返回已跳的深层页）先 back
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    if (bridge.isWebViewFirstPage()) app.postMessage('closeWebView')
    else router.back()
    return
  }
  router.back()
}
async function reload() {
  await load()
}
function goCart() {
  router.push('/cart')
}
function openOrigin() {
  if (product.value && product.value.shopUrl) bridge.openShopify(product.value.shopUrl)
}
function productStore() {
  try { return new URL(product.value.shopUrl).hostname } catch { return getStore() }
}
function onAddCart() {
  if (!product.value || !canPurchase.value) return
  addToCart(product.value, {
    variantId: currentVariant.value ? currentVariant.value.id : 'def',
    variantTitle: currentVariant.value ? currentVariant.value.title : '',
    price: displayPrice.value,
    qty: qty.value,
    region: productRegion.value || getRegion(),
    store: productStore(),
  })
  showToast('已加入购物车')
}
async function onBuy() {
  if (!product.value || !canPurchase.value) return
  const vid = currentVariant.value ? currentVariant.value.id : 'def'
  // 走后端 checkout-v2 建 Shopify 购物车并预填邮箱/地址（region + Multipass 收敛在后端）
  try {
    // 拉取 Flutter 注入的用户资料：email + shippingAddress 用于 Shopify 结算页自动预填
    let profile = {}
    try { profile = (await bridge.getUserInfo()) || {} } catch (e) { profile = {} }
    const r = await fetch(`${API_BASE}/mall-api/checkout-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: vid,
        qty: qty.value,
        region: productRegion.value || getRegion(),
        email: profile.email || '',
        shippingAddress: profile.shippingAddress || null,
      }),
    })
    const j = await r.json()
    const url = (j.data && j.data.url) || (j.url)
    if (!url) throw new Error('empty checkout url')
    bridge.openShopify(url)
    showToast('正在前往 Shopify…')
  } catch (e) {
    // 兜底：直接拼 permalink，保证不阻塞
    const store = productStore()
    if (store) {
      bridge.openShopify(`https://${store}/cart/${vid}:${qty.value}`)
      showToast('正在前往 Shopify…')
    } else {
      showToast('结算失败，请重试')
    }
  }
}
</script>

<style scoped>
.product-page { min-height: 100vh; }
.product-skeleton .product-skeleton__cover { background: #f3f3f3; }
.content-placeholder { padding: 24px 16px; min-height: 240px; }
.content-placeholder span { display: block; height: 18px; margin-bottom: 20px; border-radius: 6px; background: #eee; }
.content-placeholder span:last-child { width: 45%; }
.color-hint { color: var(--text-sub); font-size: 13px; margin-bottom: 12px; }
.btn:disabled { cursor: wait; }
.detail-error { padding: 16px; text-align: center; }
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
/* 详情页：单列卡片流（淘宝详情页形式 + 发现栏目卡片风格），居中限宽复用手机规格，不分栏 */
.pd-split {
  display: block;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 12px;
}
.cart {
  position: relative;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #e53935;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
}
/* 保留图片占位，轮播只呈现商品实图。 */
.gallery-frame {
  position: relative;
  height: auto;
  aspect-ratio: 4 / 3;
  max-height: 520px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 18px;
  background: #fff;
}
.gallery {
  display: flex;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  background: #fff;
}
.gallery::-webkit-scrollbar {
  display: none;
}
.slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
  scroll-snap-align: center;
}
.empty-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}
.gallery-brand {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(238, 243, 255, 0.94);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}
.gallery-brand--plain { background: transparent; padding-left: 2px; font-size: 15px; letter-spacing: 0.12em; }
.gallery-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(238, 243, 255, 0.94);
  color: #7b8cae;
  font-size: 12px;
  pointer-events: none;
}
/* 卡片 */
.card {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}
.info .name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 8px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.pill {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 3px 10px;
  border-radius: 12px;
}
.pill--brand {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 0;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 28px;
}
.origin {
  color: var(--text-sub);
  font-size: 13px;
  text-decoration: line-through;
}
.block__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.block__title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}
.fit-card { border-color: rgba(77, 124, 255, 0.16); }
.fit-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; }
.fit-heading span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); font-size: 20px; font-weight: 400; }
.fit-picker {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}
.fit-picker:disabled { cursor: wait; opacity: 0.65; }
.fit-picker:focus-visible, .fit-panel button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.fit-picker__text { display: flex; flex-direction: column; gap: 3px; }
.fit-picker__text small { color: var(--text-sub); font-size: 11px; }
.fit-picker__text strong { color: var(--text); font-size: 15px; }
.fit-picker svg { flex: none; color: var(--brand); }
.fit-note { margin: 10px 0 0; color: var(--text-sub); font-size: 12px; line-height: 1.5; }
.fit-overlay { position: fixed; inset: 0; z-index: 110; display: flex; align-items: flex-end; justify-content: center; background: rgba(17, 27, 50, 0.38); }
.fit-panel { box-sizing: border-box; width: 100%; max-width: 560px; max-height: min(72vh, 620px); display: flex; flex-direction: column; padding: 8px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; background: #fff; box-shadow: 0 -12px 36px rgba(20, 37, 73, 0.12); outline: none; }
.fit-panel__handle { flex: none; width: 36px; height: 4px; margin: 2px auto 16px; border-radius: 99px; background: #d8deeb; }
.fit-panel__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex: none; }
.fit-panel__head h2 { margin: 0; color: var(--text); font-size: 18px; line-height: 1.4; }
.fit-panel__head p { margin: 5px 0 0; color: var(--text-sub); font-size: 12px; }
.fit-panel__close { flex: none; width: 32px; height: 32px; border: 0; border-radius: 50%; background: var(--brand-soft); color: var(--text-sub); font-size: 24px; line-height: 1; }
.fit-panel__options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 22px; overflow-y: auto; overscroll-behavior: contain; }
.fit-option { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; min-height: 52px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 12px; background: #fff; color: var(--text); font-size: 15px; font-weight: 600; text-align: left; overflow-wrap: anywhere; cursor: pointer; }
.fit-option--selected { border-color: var(--brand); background: var(--brand-soft); color: var(--brand); }
.fit-option:disabled { opacity: 0.48; cursor: not-allowed; }
.fit-option__check { display: grid; place-items: center; flex: none; width: 20px; height: 20px; border-radius: 50%; background: var(--brand); color: #fff; font-size: 12px; }
.fit-option small { color: var(--text-sub); font-size: 11px; }
.fit-panel__note { flex: none; margin: 16px 0 0; color: var(--text-sub); font-size: 12px; line-height: 1.5; }
.fit-sheet-enter-active, .fit-sheet-leave-active { transition: opacity 0.2s ease; }
.fit-sheet-enter-active .fit-panel, .fit-sheet-leave-active .fit-panel { transition: transform 0.24s ease; }
.fit-sheet-enter-from, .fit-sheet-leave-to { opacity: 0; }
.fit-sheet-enter-from .fit-panel, .fit-sheet-leave-to .fit-panel { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) { .fit-sheet-enter-active, .fit-sheet-leave-active, .fit-sheet-enter-active .fit-panel, .fit-sheet-leave-active .fit-panel { transition: none; } }
.core-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.core-item { display: flex; flex-direction: column; justify-content: center; gap: 5px; min-height: 70px; padding: 10px; border-radius: 12px; background: var(--brand-soft); text-align: center; }
.core-item strong { color: var(--text); font-size: 14px; overflow-wrap: anywhere; }
.core-item span { color: var(--text-sub); font-size: 11px; }
.selection-label { color: var(--text-sub); font-size: 13px; margin-bottom: 10px; }
.selection-card .color-card, .selection-card .spec-card { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--line); }
.opts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.opt {
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 16px;
}
.opt em {
  font-style: normal;
  color: var(--price);
  font-size: 12px;
}
.opt i {
  font-style: normal;
  color: var(--text-sub);
  font-size: 11px;
  margin-left: 4px;
}
.opt.active {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
}
.opt.soldout {
  opacity: 0.5;
  text-decoration: line-through;
}
/* 规格多维度：每维度独立一行 */
.spec-dim {
  margin-bottom: 14px;
}
.spec-dim:last-child {
  margin-bottom: 0;
}
.spec-dim__label {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 8px;
}
.spec-card .opts {
  gap: 8px;
}
/* 数量（决策区内联） */
.card--inline {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0;
}
.card--inline .selection-label { margin-bottom: 0; }
.card--inline .qty {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}
.qty button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  font-size: 16px;
  color: var(--text);
}
.qty span {
  font-size: 16px;
  min-width: 24px;
  text-align: center;
}
/* 描述富文本 */
.desc .prose {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}
.desc .prose :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  margin: 10px 0;
}
.desc .prose :deep(p) {
  margin: 0 0 14px;
  line-height: 1.8;
}
.desc .prose :deep(h1),
.desc .prose :deep(h2),
.desc .prose :deep(h3) {
  font-size: 16px;
  margin: 18px 0 10px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.desc .prose :deep(h1)::before,
.desc .prose :deep(h2)::before,
.desc .prose :deep(h3)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}
.desc .prose :deep(a) {
  color: var(--brand);
}
.desc .prose :deep(ul),
.desc .prose :deep(ol) {
  padding-left: 20px;
  margin: 0 0 10px;
}
.desc .prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.desc .prose :deep(td),
.desc .prose :deep(th) {
  border: 1px solid var(--line);
  padding: 6px 8px;
}
/* 描述底部辅助链接 */
.more-link {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 13px;
  color: var(--text-sub);
}
.gap {
  height: 4px;
}
/* 卖点 / 参数 */
.tagline {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 6px;
  line-height: 1.5;
}
.specs {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  border: 0.5px solid var(--line);
}
.spec {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
}
.spec:nth-child(even) {
  background: var(--brand-soft);
}
.spec__k {
  color: var(--text-sub);
  flex: none;
}
.spec__v {
  color: var(--text);
  text-align: right;
  font-weight: 500;
}
/* 吸底操作 */
.actions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 760px;
  display: flex;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}
.btn {
  flex: 1;
  border-radius: 22px;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
}
.btn--cart {
  background: var(--brand-soft);
  color: var(--brand);
}
.btn--buy {
  background: linear-gradient(110deg, #5f98ff, var(--brand));
  color: #fff;
}
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  z-index: 100;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-sub);
}
.empty p {
  margin-bottom: 20px;
  font-size: 15px;
}
.empty__acts {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn--retry {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--text);
}
.btn--retry:active {
  background: var(--bg);
}
/* 颜色选择（联动轮播图） */
.color-card .colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.color-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 76px;
  padding: 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
}
.color-btn.active {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.color-swatch {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: contain;
  background: #fff;
}
.color-swatch--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-hint);
  border: 1px solid var(--line);
}
.color-btn span {
  font-size: 12px;
  color: var(--text);
}
</style>

// 已发布动态（H5 预览态的内存态；联调接入真实 API 后由后端返回）
import { reactive } from 'vue'

export const publishState = reactive({
  list: [],
  // 发布后让发现页自动切到「动态」tab 展示新内容
  pendingTab: null,
})

// 预置本地图库（dist 内已存在、可直接引用，避免无后端上传）
export const publishGallery = [
  'feed_r1.jpg',
  'feed_r2.jpg',
  'feed_d1.jpg',
  'feed_d2.jpg',
  'feed_d3.jpg',
  'feed_r3.jpg',
  'plaza_p1.jpg',
  'plaza_p2.jpg',
]

export function addMoment(m, tab) {
  publishState.list.unshift(m)
  publishState.pendingTab = tab || null
}

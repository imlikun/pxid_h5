import { createRouter, createWebHashHistory } from 'vue-router'
import { bridge } from '../bridge'
import DiscoverView from '../views/DiscoverView.vue'
import FeaturedView from '../views/FeaturedView.vue'
import ServiceView from '../views/ServiceView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import CartView from '../views/CartView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import OrderSuccessView from '../views/OrderSuccessView.vue'
import OrderListView from '../views/OrderListView.vue'
import MessageView from '../views/MessageView.vue'
import FeedDetailView from '../views/FeedDetailView.vue'
import NoticesView from '../views/NoticesView.vue'
import NoticeDetailView from '../views/NoticeDetailView.vue'

// 服务子页
import RoadRescueView from '../views/RoadRescueView.vue'
import GuideView from '../views/GuideView.vue'
import GuideVideoView from '../views/GuideVideoView.vue'
import GuideManualView from '../views/GuideManualView.vue'
import VehicleCheckView from '../views/VehicleCheckView.vue'
import FeedbackView from '../views/FeedbackView.vue'
import WarrantyView from '../views/WarrantyView.vue'
import StoreListView from '../views/StoreListView.vue'
import WorkOrderView from '../views/WorkOrderView.vue'
import WorkOrderDetailView from '../views/WorkOrderDetailView.vue'
import FaqView from '../views/FaqView.vue'
import FaqDetailView from '../views/FaqDetailView.vue'
import FaqFilterView from '../views/FaqFilterView.vue'
import VehicleDetailView from '../views/VehicleDetailView.vue'
import CustomizeView from '../views/CustomizeView.vue'
import SearchView from '../views/SearchView.vue'
import PointsView from '../views/PointsView.vue'
import PublishView from '../views/PublishView.vue'
import ActivityCenterView from '../views/ActivityCenterView.vue'
import InteractionView from '../views/InteractionView.vue'

// 用 hash 路由：WebView 内加载任意域名/本地文件都不会 404，无需服务端 rewrite
const routes = [
  { path: '/', redirect: '/discover' },
  {
    path: '/discover',
    name: 'discover',
    component: DiscoverView,
    meta: { tab: 'discover', title: '发现' },
  },
  {
    path: '/featured',
    name: 'featured',
    component: FeaturedView,
    meta: { tab: 'featured', title: '精选' },
  },
  {
    path: '/service',
    name: 'service',
    component: ServiceView,
    meta: { tab: 'service', title: '服务' },
  },

  // 服务板块子页（二级页隐藏底部演示 tab）
  { path: '/service/rescue', name: 'rescue', component: RoadRescueView, meta: { hideTabBar: true, title: '道路救援' } },
  { path: '/service/guide', name: 'guide', component: GuideView, meta: { hideTabBar: true, title: '使用指南' } },
  { path: '/service/guide/video', name: 'guide-video', component: GuideVideoView, meta: { hideTabBar: true, title: '新手指导视频' } },
  { path: '/service/guide/manual', name: 'guide-manual', component: GuideManualView, meta: { hideTabBar: true, title: '产品资料' } },
  { path: '/service/check', name: 'check', component: VehicleCheckView, meta: { hideTabBar: true, title: '车辆体检' } },
  { path: '/service/feedback', name: 'feedback', component: FeedbackView, meta: { hideTabBar: true, title: '意见反馈' } },
  { path: '/service/policy', name: 'policy', component: WarrantyView, meta: { hideTabBar: true, title: '三包政策' } },
  { path: '/service/stores', name: 'stores', component: StoreListView, meta: { hideTabBar: true, title: '附近门店' } },
  { path: '/service/workorders', name: 'workorders', component: WorkOrderView, meta: { hideTabBar: true, title: '我的工单' } },
  { path: '/service/workorders/:id', name: 'workorder-detail', component: WorkOrderDetailView, meta: { hideTabBar: true, title: '工单详情' } },
  { path: '/service/faq', name: 'faq', component: FaqView, meta: { hideTabBar: true, title: '常见问题' } },
  { path: '/service/faq/filter', name: 'faq-filter', component: FaqFilterView, meta: { hideTabBar: true, title: '问题筛选' } },
  { path: '/service/faq/:id', name: 'faq-detail', component: FaqDetailView, meta: { hideTabBar: true, title: '问题详情' } },

  // 精选
  { path: '/product/:id', name: 'product', component: ProductDetailView, meta: { hideTabBar: true } },
  { path: '/cart', name: 'cart', component: CartView, meta: { hideTabBar: true } },
  { path: '/cart/checkout', name: 'checkout', component: CheckoutView, meta: { hideTabBar: true, title: '确认订单' } },
  { path: '/order/success', name: 'order-success', component: OrderSuccessView, meta: { hideTabBar: true, title: '支付成功' } },
  { path: '/order/list', name: 'order-list', component: OrderListView, meta: { hideTabBar: true, title: '我的订单' } },

  // 发现
  { path: '/message', name: 'message', component: MessageView, meta: { hideTabBar: true } },
  { path: '/notices', name: 'notices', component: NoticesView, meta: { hideTabBar: true, title: '官方公告' } },
  { path: '/notice/:id', name: 'notice-detail', component: NoticeDetailView, meta: { hideTabBar: true, title: '公告详情' } },
  { path: '/feed/:id', name: 'feed-detail', component: FeedDetailView, meta: { hideTabBar: true, title: '内容详情' } },
  { path: '/activity/:id', name: 'activity-detail', component: FeedDetailView, meta: { hideTabBar: true, title: '活动详情' } },
  { path: '/activity-center', name: 'activity-center', component: ActivityCenterView, meta: { hideTabBar: true, title: '活动中心' } },

  // 互动消息中心（点赞/评论/关注/系统，自有后端 /notifications）
  { path: '/interactions', name: 'interactions', component: InteractionView, meta: { hideTabBar: true, title: '互动消息' } },

  // H5 兜底页（无原生时由 bridge 兜底路由到此）
  { path: '/vehicle/:id', name: 'vehicle', component: VehicleDetailView, meta: { hideTabBar: true, title: '车型详情' } },
  { path: '/purchase/customize', name: 'customize', component: CustomizeView, meta: { hideTabBar: true, title: '购车定制' } },
  { path: '/search', name: 'search', component: SearchView, meta: { hideTabBar: true, title: '搜索' } },
  { path: '/points', name: 'points', component: PointsView, meta: { hideTabBar: true, title: '我的积分' } },
  { path: '/publish', name: 'publish', component: PublishView, meta: { hideTabBar: true, title: '发布动态' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 服务模块已由 Flutter 原生版提供，H5 侧彻底屏蔽（tab 入口已移除 + 路由级拦截），任何环境都进不去 /service
router.beforeEach((to, from, next) => {
  if (to.path.startsWith('/service')) {
    next('/discover')
    return
  }
  next()
})

export default router

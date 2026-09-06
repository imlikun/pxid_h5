import { createRouter, createWebHashHistory } from 'vue-router'
import { bridge } from '../bridge'

// 路由级懒加载：全部页面动态 import，Vite 按路由拆 chunk，
// 首屏只加载当前页面代码，大幅减小首包体积（原 30+ 页面全打一个 bundle）
const DiscoverView = () => import('../views/DiscoverView.vue')
const FeaturedView = () => import('../views/FeaturedView.vue')
const ServiceView = () => import('../views/ServiceView.vue')
const ProductDetailView = () => import('../views/ProductDetailView.vue')
const CartView = () => import('../views/CartView.vue')
const CheckoutView = () => import('../views/CheckoutView.vue')
const OrderSuccessView = () => import('../views/OrderSuccessView.vue')
const OrderListView = () => import('../views/OrderListView.vue')
const OrderDetailView = () => import('../views/OrderDetailView.vue')
const MessageView = () => import('../views/MessageView.vue')
const FeedDetailView = () => import('../views/FeedDetailView.vue')
const NoticesView = () => import('../views/NoticesView.vue')
const NoticeDetailView = () => import('../views/NoticeDetailView.vue')

// 服务子页
const RoadRescueView = () => import('../views/RoadRescueView.vue')
const GuideView = () => import('../views/GuideView.vue')
const GuideVideoView = () => import('../views/GuideVideoView.vue')
const GuideManualView = () => import('../views/GuideManualView.vue')
const VehicleCheckView = () => import('../views/VehicleCheckView.vue')
const FeedbackView = () => import('../views/FeedbackView.vue')
const WarrantyView = () => import('../views/WarrantyView.vue')
const StoreListView = () => import('../views/StoreListView.vue')
const WorkOrderView = () => import('../views/WorkOrderView.vue')
const WorkOrderDetailView = () => import('../views/WorkOrderDetailView.vue')
const FaqView = () => import('../views/FaqView.vue')
const FaqDetailView = () => import('../views/FaqDetailView.vue')
const FaqFilterView = () => import('../views/FaqFilterView.vue')
const VehicleDetailView = () => import('../views/VehicleDetailView.vue')
const CustomizeView = () => import('../views/CustomizeView.vue')
const SearchView = () => import('../views/SearchView.vue')
const PointsView = () => import('../views/PointsView.vue')
const PointsGuideView = () => import('../views/PointsGuideView.vue')
const PointsMallView = () => import('../views/PointsMallView.vue')
const PublishView = () => import('../views/PublishView.vue')
const ActivityCenterView = () => import('../views/ActivityCenterView.vue')
const InteractionView = () => import('../views/InteractionView.vue')
const InteractionDetailView = () => import('../views/InteractionDetailView.vue')
const UserProfileView = () => import('../views/UserProfileView.vue')
const ProfileEditView = () => import('../views/ProfileEditView.vue')

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
  { path: '/order/:id', name: 'order-detail', component: OrderDetailView, meta: { hideTabBar: true, title: '订单详情' } },

  // 发现
  { path: '/message', name: 'message', component: MessageView, meta: { hideTabBar: true } },
  { path: '/notices', name: 'notices', component: NoticesView, meta: { hideTabBar: true, title: '官方公告' } },
  { path: '/notice/:id', name: 'notice-detail', component: NoticeDetailView, meta: { hideTabBar: true, title: '公告详情' } },
  { path: '/feed/:id', name: 'feed-detail', component: FeedDetailView, meta: { hideTabBar: true, title: '内容详情' } },
  { path: '/activity/:id', name: 'activity-detail', component: FeedDetailView, meta: { hideTabBar: true, title: '活动详情' } },
  { path: '/activity-center', name: 'activity-center', component: ActivityCenterView, meta: { hideTabBar: true, title: '活动中心' } },

  // 互动消息中心（点赞/评论/关注/系统，自有后端 /notifications）
  { path: '/interactions', name: 'interactions', component: InteractionView, meta: { hideTabBar: true, title: '互动消息' } },
  { path: '/interaction/:id', name: 'interaction-detail', component: InteractionDetailView, meta: { hideTabBar: true, title: '消息详情' } },
  // 个人主页：/user/:id 他人主页；/user/me 自己的主页（App「我的」tab 入口，明天 Flutter 接）
  { path: '/user/:id', name: 'user-profile', component: UserProfileView, meta: { hideTabBar: true, title: '个人主页' } },
  // 编辑资料（H5 自管，写入 user_profiles 唯一真相源）
  { path: '/profile/edit', name: 'profile-edit', component: ProfileEditView, meta: { hideTabBar: true, title: '编辑资料' } },

  // H5 兜底页（无原生时由 bridge 兜底路由到此）
  { path: '/vehicle/:id', name: 'vehicle', component: VehicleDetailView, meta: { hideTabBar: true, title: '车型详情' } },
  { path: '/purchase/customize', name: 'customize', component: CustomizeView, meta: { hideTabBar: true, title: '购车定制' } },
  { path: '/search', name: 'search', component: SearchView, meta: { hideTabBar: true, title: '搜索' } },
  { path: '/points', name: 'points', component: PointsView, meta: { hideTabBar: true, title: '我的积分' } },
  { path: '/points/guide', name: 'points-guide', component: PointsGuideView, meta: { hideTabBar: true, title: '积分玩法' } },
  { path: '/points/mall', name: 'points-mall', component: PointsMallView, meta: { hideTabBar: true, title: '积分商城' } },
  { path: '/publish', name: 'publish', component: PublishView, meta: { hideTabBar: true, title: '发布动态' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // 滚动行为与转场的交接（iOS 语义，2026-09-06 帧采样定位后重写）：
  //   前进 = 旧页保持滚动位置原样滑出，滚顶推迟到转场结束（App.vue after-enter 同帧做）；
  //   返回 = 列表带着原滚动位置滑入。scrollBehavior 在 DOM 更新后、下一帧绘制前（微任务）执行，
  //          此刻 keep-alive 列表已插回文档、高度稳定（返回已不重拉列表），直接 scrollTo 即可 ——
  //          列表滑入的第一帧就是原位置，没有「先显示顶部、中途再跳」的中间帧。
  //   ⚠️ 不能靠 <transition> 的 before-enter 恢复：enter 钩子在 DOM patch 时同步触发，
  //      而 scrollBehavior 是 router 在 nextTick 之后才调用的 —— before-enter 先跑，
  //      pending 永远被提前消费成 null（2026-09-06 探针实测：返回全程零 scrollTo，savedPosition 明明存在）。
  // 此前前进时在这里立即 scrollTo(0,0)，而列表是 static 页面、视觉位置完全由 scrollY 决定，
  // 实测（600px 处点卡片）转场开始帧 scrollY 600→0 硬跳，列表先跳回顶部再滑出 —— 「抖一下」的真凶。
  scrollBehavior(to, from, savedPosition) {
    const TABS = ['/discover', '/featured', '/service']
    // tab 之间浏览器前进/后退：无转场动画，让路由器直接恢复即可
    if (savedPosition && TABS.includes(to.path) && TABS.includes(from.path)) return savedPosition
    if (savedPosition) {
      // 返回：直接恢复（时机正确性见上方注释）
      window.scrollTo(0, savedPosition.top)
      // 兜底：万一有异步内容改变高度导致没滚到位，稍后补一次（列表返回不重拉，通常一次到位）
      setTimeout(() => {
        if (Math.abs(window.scrollY - savedPosition.top) > 8) window.scrollTo(0, savedPosition.top)
      }, 120)
      return false
    }
    // tab 互切：平级关系，各自保留自己的浏览位置
    if (TABS.includes(to.path) && TABS.includes(from.path)) return false
    // 前进：这里绝不能 scrollTo(0,0)——会旧页跳顶。详情页是 fixed 滚动容器，
    // 自带 scrollTop=0 起步；window 滚顶推迟到转场结束（App.vue after-enter）
    return false
  },
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

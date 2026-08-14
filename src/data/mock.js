// ============================================================
// Mock 数据 —— 仅用于演示，后续接你们 API 时整文件替换即可
// ============================================================

// ---------------- 发现（社区流）----------------
export const discoverTabs = ['推荐', '动态', '广场']

export const discoverQuick = [
  { key: 'custom', label: '立即定制', icon: 'scissors' },
  { key: 'notice', label: '官方公告', icon: 'megaphone' },
  { key: 'ai', label: '智能助手', icon: 'headset' },
  { key: 'points', label: '积分兑换', icon: 'gift' },
]

// 三个 tab 各自的车型筛选（与设计稿一致：推荐=全部、动态=最新、广场=P1-P6）
export const recommendFilters = ['全部', 'H10', 'M2', 'Z3']
export const dynamicFilters = ['最新', 'H10', 'M2', 'Z3']
export const plazaFilters = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

export const feedItems = [
  {
    id: 1,
    kind: 'official',
    author: 'PXID 官方产品经理',
    avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '新一代货运电动三轮车正式亮相：大空间载货、强动力续航，为外卖配送与短途物流场景打造。多档动力可调，城市路况轻松应对，是骑手们的新搭档。',
    cover: 'feed_r1.jpg',
    likes: 30,
    time: '05-14',
    filter: '全部',
  },
  {
    id: 2,
    kind: 'user',
    author: '一路向前',
    avatar: 'unsplash/photo-1494790108377-be9c29b29330_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '实测新一代货运电动三轮车：载货空间大、起步有力、续航稳定，日常跑单更省心。感兴趣的朋友可以到附近门店亲自体验。',
    cover: 'feed_d1.jpg',
    likes: 206,
    time: '05-13',
    filter: 'H10',
  },
  {
    id: 3,
    kind: 'official',
    author: 'PXID 官方产品经理',
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '新一代货运电动三轮车正式亮相：大空间载货、强动力续航，为外卖配送与短途物流场景打造。多档动力可调，城市路况轻松应对，是骑手们的新搭档。',
    cover: 'feed_r2.jpg',
    likes: 30,
    time: '05-12',
    filter: 'M2',
  },
  {
    id: 4,
    kind: 'user',
    author: '一路向前',
    avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '实测新一代货运电动三轮车：载货空间大、起步有力、续航稳定，日常跑单更省心。感兴趣的朋友可以到附近门店亲自体验。',
    cover: 'feed_d2.jpg',
    likes: 206,
    time: '05-11',
    filter: 'Z3',
  },
  {
    id: 5,
    kind: 'official',
    author: 'PXID 官方产品经理',
    avatar: 'unsplash/photo-1507003211169-0a1dd7228f2d_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '新一代货运电动三轮车正式亮相：大空间载货、强动力续航，为外卖配送与短途物流场景打造。多档动力可调，城市路况轻松应对，是骑手们的新搭档。',
    cover: 'feed_r3.jpg',
    likes: 30,
    time: '05-10',
    filter: '全部',
  },
  {
    id: 6,
    kind: 'user',
    author: '一路向前',
    avatar: 'unsplash/photo-1544723795-3fb6469f5b39_w_80_q_80.jpg',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    content: '实测新一代货运电动三轮车：载货空间大、起步有力、续航稳定，日常跑单更省心。感兴趣的朋友可以到附近门店亲自体验。',
    cover: 'feed_d3.jpg',
    likes: 206,
    time: '05-09',
    filter: '全部',
  },
]

// 广场：车型展示 P1-P6（封面取自设计稿 广场/ 子目录原图）
export const plazaShowcase = [
  { id: 'P1', name: 'P1', cover: 'plaza_p1.jpg' },
  { id: 'P2', name: 'P2', cover: 'plaza_p2.jpg' },
  { id: 'P3', name: 'P3', cover: 'plaza_p3.jpg' },
  { id: 'P4', name: 'P4', cover: 'plaza_p4.jpg' },
  { id: 'P5', name: 'P5', cover: 'plaza_p5.jpg' },
  { id: 'P6', name: 'P6', cover: 'plaza_p6.jpg' },
]

// 广场：热门活动 2 条（封面按 广场/ 子目录文件顺序：(7)→活动1、base→活动2）
export const activities = [
  { id: 1, title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖', date: '05-14', cover: 'plaza_p7.jpg', content: '新一代货运电动三轮车主题活动进行中：到店可预约试驾体验装载与续航表现，现场下单享专属礼遇。' },
  { id: 2, title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖', date: '05-14', cover: 'plaza_p8.jpg', content: '新一代货运电动三轮车品鉴会：深度体验大空间载货与强动力续航，参与互动即有机会赢取好礼。' },
]

// ---------------- 消息中心 ----------------
export const messageCategories = [
  { key: 'system', label: '系统消息', icon: 'bell' },
  { key: 'service', label: '服务消息', icon: 'headset' },
  { key: 'vehicle', label: '车辆消息', icon: 'car' },
  { key: 'interaction', label: '互动消息', icon: 'chat' },
]

export const messages = [
  {
    id: 1,
    sender: '官方产品经理',
    avatar: '',
    summary: '关于买车流程这里有一份说明',
    time: '05/14',
    unread: false,
  },
  {
    id: 2,
    sender: '官方资讯',
    avatar: '',
    summary: '品向M9 正式开售',
    time: '05/14',
    unread: false,
  },
  {
    id: 3,
    sender: '官方产品经理',
    avatar: '',
    summary: '关于买车流程这里有一份说明',
    time: '05/14',
    unread: false,
  },
  {
    id: 4,
    sender: '官方资讯',
    avatar: '',
    summary: '品向M9 正式开售',
    time: '05/14',
    unread: false,
  },
]

// ---------------- 精选（商城）----------------
export const featuredBanner = {
  title: '踏春出行季',
  sub: '装备直降 · 限时开启',
  cover: 'flower',
}

export const featuredQuick = [
  { key: 'hot', label: '热购榜单', icon: 'flame' },
  { key: 'new', label: '近期上新', icon: 'sparkles' },
  { key: 'points', label: '玩转积分', icon: 'award' },
]

export const collections = [
  { id: 'spring', title: '踏春装备', sub: '限时直降', cover: 'flower' },
  { id: 'p1parts', title: 'P1 原厂配件', sub: '适配专用', cover: 'gear' },
]

export const products = [
  { id: 1, name: '鸭舌帽 男士', price: 280, origin: 399, cover: 'unsplash/photo-1588850561407-ed78c282e89b_w_600_q_80.jpg', tag: '踏春装备', sales: 1203, collection: 'spring' },
  { id: 2, name: '原装后轮 适配P1', price: 6800, origin: 7200, cover: 'unsplash/photo-1571068316344-75bc76f77890_w_600_q_80.jpg', tag: 'P1配件', sales: 86, collection: 'p1parts' },
  { id: 3, name: '防晒冰丝袖套', price: 59, origin: 99, cover: 'unsplash/photo-1517649763962-0c623066013b_w_600_q_80.jpg', tag: '踏春装备', sales: 3420, collection: 'spring' },
  { id: 4, name: '智能中控屏 P1', price: 1299, origin: 1499, cover: 'unsplash/photo-1493238792000-8113da705763_w_600_q_80.jpg', tag: 'P1配件', sales: 210, collection: 'p1parts' },
  { id: 5, name: '骑行头盔 一体成型', price: 399, origin: 499, cover: 'unsplash/photo-1505705694340-019e1e335916_w_600_q_80.jpg', tag: '踏春装备', sales: 880, collection: 'spring' },
  { id: 6, name: '原装电池 48V', price: 1999, origin: 2399, cover: 'unsplash/photo-1593941707882-a5bba14938c7_w_600_q_80.jpg', tag: 'P1配件', sales: 56, collection: 'p1parts' },
  { id: 7, name: '车尾储物包', price: 129, origin: 169, cover: 'unsplash/photo-1532298229144-0ec0c57515c7_w_600_q_80.jpg', tag: '踏春装备', sales: 1540, collection: 'spring' },
  { id: 8, name: '蓝牙控车模块', price: 299, origin: 359, cover: 'unsplash/photo-1518770660439-4636190af475_w_600_q_80.jpg', tag: 'P1配件', sales: 430, collection: 'p1parts' },
]

// ---------------- 服务（售后 hub）----------------
export const serviceEntries = [
  { key: 'rescue', label: '道路救援', icon: 'wrench', desc: '一键呼叫' },
  { key: 'guide', label: '使用指南', icon: 'book-open', desc: '新手必看' },
  { key: 'check', label: '车辆体检', icon: 'gauge', desc: '远程诊断' },
  { key: 'feedback', label: '意见反馈', icon: 'message-circle', desc: '吐槽建议' },
  { key: 'policy', label: '三包政策', icon: 'shield-check', desc: '权益保障' },
  { key: 'workorders', label: '我的工单', icon: 'clipboard-list', desc: '查看进度' },
]

export const nearbyStore = {
  name: 'PXID 淮安体验店',
  rating: 4.8,
  reviews: 128,
  distance: '4.8km',
  phone: '0517-88886666',
  address: '江苏省淮安市清江浦区翔宇大道 88 号',
  lat: 33.5104,
  lng: 119.016,
}

// 附近门店列表（列表页用；按距离升序）
export const stores = [
  {
    name: 'PXID 淮安体验店',
    rating: 4.8,
    reviews: 128,
    distance: '4.8km',
    phone: '0517-88886666',
    address: '江苏省淮安市清江浦区翔宇大道 88 号',
    lat: 33.5104,
    lng: 119.016,
    hours: '09:00 - 21:00',
    tags: ['体验试驾', '售后维修', '配件购买'],
  },
  {
    name: 'PXID 苏州工业园区店',
    rating: 4.9,
    reviews: 89,
    distance: '372km',
    phone: '0512-55556666',
    address: '江苏省苏州市工业园区星湖街 328 号',
    lat: 31.323,
    lng: 120.735,
    hours: '10:00 - 21:00',
    tags: ['售后维修', '配件购买'],
  },
  {
    name: 'PXID 南京新街口旗舰店',
    rating: 4.7,
    reviews: 256,
    distance: '184km',
    phone: '025-66667777',
    address: '江苏省南京市秦淮区中山南路 100 号',
    lat: 32.041,
    lng: 118.791,
    hours: '09:30 - 22:00',
    tags: ['体验试驾', '以旧换新'],
  },
  {
    name: 'PXID 上海浦东服务中心',
    rating: 4.6,
    reviews: 312,
    distance: '405km',
    phone: '021-33334444',
    address: '上海市浦东新区张江高科技园区博云路 2 号',
    lat: 31.205,
    lng: 121.605,
    hours: '09:00 - 20:30',
    tags: ['售后维修', '道路救援接单'],
  },
]

// 问题筛选分类（与设计稿 问题筛选@3x.png 一致：APP相关/常见问题/咨询服务）
export const faqCategories = [
  {
    group: 'APP相关',
    items: [
      { key: 'app-ride', label: '骑行统计' },
      { key: 'app-vehicle', label: '车辆设置' },
      { key: 'app-location', label: '车辆定位' },
      { key: 'app-use', label: 'APP使用' },
      { key: 'app-alert', label: '告警推送' },
      { key: 'app-battery', label: '电池信息' },
    ],
  },
  {
    group: '常见问题',
    items: [
      { key: 'faq-battery', label: '电池续航' },
      { key: 'faq-control', label: '整车操控' },
      { key: 'faq-dashboard', label: '仪表故障显示' },
    ],
  },
  {
    group: '咨询服务',
    items: [
      { key: 'svc-maintain', label: '车辆保养' },
      { key: 'svc-warranty', label: '服务保障' },
      { key: 'svc-tutorial', label: '教学引导' },
    ],
  },
]

// 常见问题 12 条（与设计稿一致：Q + A 摘要；tags 用于筛选弹窗联动）
export const faqs = [
  { id: 1, q: '为什么APP搜索不到滑板车设备', a: '确认滑板车开机通电、电量充足；手机已开启蓝牙与定位', tags: ['app-use', 'app-location'], likes: 568 },
  { id: 2, q: '蓝牙绑定失败、配对不成功？', a: '不要在手机系统蓝牙手动配对；清除系统内旧的滑板车', tags: ['app-use'], likes: 324 },
  { id: 3, q: '绑定成功后频繁断开连接？', a: '骑行时保持手机靠近车身；开启APP后台运行权限；', tags: ['app-alert'], likes: 215 },
  { id: 4, q: '车辆无法起步、速度很慢、一直限速？', a: '车辆默认低速新手模式；可在APP内关闭限速模式；电', tags: ['app-vehicle'], likes: 189 },
  { id: 5, q: '车辆开机无反应、黑屏无法开机？', a: '电量过低进入休眠状态，连接充电器激活开机；', tags: ['app-battery'], likes: 142 },
  { id: 6, q: '骑行过程中刹车异响、轻盘卡顿？', a: '刹车较薄异响为正常现象；检查刹车片是否进灰、异物', tags: ['faq-control'], likes: 98 },
  { id: 7, q: '如何解绑车辆、更换绑定手机？', a: '进入车辆设置页面点击【解除绑定】即可解绑；若提示被', tags: ['app-use', 'app-vehicle'], likes: 76 },
  { id: 8, q: '电池欠压/老化问题', a: '电池欠压属于电量过低休眠，及时充电即可激活；若频繁', tags: ['faq-battery'], likes: 64 },
  { id: 9, q: '关于冬季续航里程下降', a: '低温环境下锂电池活性降低，续航缩水为正常物理现象，', tags: ['faq-battery'], likes: 112 },
  { id: 10, q: '关于电池循环次数', a: '电池循环次数指完整充放电周期，是电池寿命核心标准；', tags: ['faq-battery'], likes: 231 },
  { id: 11, q: '新车如何充电', a: '新车无需过度充电，电量剩余20%左右即可充电；', tags: ['svc-maintain'], likes: 88 },
  { id: 12, q: '常规电池保养', a: '日常保持电量20%-80%最佳状态，避免亏电存放、满电', tags: ['svc-maintain'], likes: 156 },
]

// ---------------- 我的工单 ----------------
// 状态 tab：与设计稿一致（待处理 tab 对应 status=待受理）
export const workOrderTabs = ['全部', '待处理', '服务中', '已完成', '已取消']

export const workOrderStatusMap = {
  待处理: '待受理',
  服务中: '服务中',
  已完成: '已完成',
  已取消: '已取消',
}

export const workOrders = [
  {
    id: 'GD20260525001',
    time: '2026-05-25 14:12',
    type: '报修',
    status: '服务中',
    model: 'P1',
    summary: '刹车失灵，制动距离明显变长',
    canCancel: true,
  },
  {
    id: 'GD20260524002',
    time: '2026-05-24 09:30',
    type: '保养',
    status: '待受理',
    model: 'H10',
    summary: '整车常规保养：电机、刹车、整车关键部位螺丝',
    canCancel: true,
  },
  {
    id: 'GD20260523003',
    time: '2026-05-23 16:45',
    type: '道路救援',
    status: '已完成',
    model: 'M2',
    summary: '轮胎爆胎，申请道路救援',
    canCancel: false,
  },
  {
    id: 'GD20260520004',
    time: '2026-05-20 11:20',
    type: '报修',
    status: '已取消',
    model: 'Z3',
    summary: '前车灯不亮，已自行解决故取消',
    canCancel: false,
  },
]

// 工单详情（按 id；字段随工单类型动态渲染：报修→故障描述+故障图片，保养→保养项目+维护建议）
export const workOrderDetails = {
  GD20260525001: {
    id: 'GD20260525001',
    time: '2026-05-25 14:12',
    steps: [
      { name: '创建', done: true, icon: 'clipboard' },
      { name: '检测开始', done: true, current: true, icon: 'search' },
      { name: '维修开始', done: false, icon: 'wrench' },
      { name: '完工提交', done: false, icon: 'check-circle' },
    ],
    model: 'P1',
    type: '报修',
    faultDesc: '刹车失灵，制动距离明显变长',
    faultImages: [
      'unsplash/photo-1558618666-fcd25c85cd64_w_300_q_80.jpg',
      'feed_r1.jpg',
      'unsplash/photo-1571068316344-75bc76f77890_w_300_q_80.jpg',
    ],
    warranty: '质保内',
    fee: 0,
    eta: '2026-05-28',
    address: '淮安市清江浦区深圳东路',
    likes: 1546,
  },
  GD20260524002: {
    id: 'GD20260524002',
    time: '2026-05-24 09:30',
    steps: [
      { name: '创建', done: true, icon: 'clipboard' },
      { name: '检测开始', done: true, current: true, icon: 'search' },
      { name: '维修开始', done: false, icon: 'wrench' },
      { name: '完工提交', done: false, icon: 'check-circle' },
    ],
    model: 'H10',
    type: '保养',
    maintainItems: '电机 刹车 整车关键部位螺丝',
    maintainAdvice: '刹车片磨损严重，建议更换',
    warranty: '不在质保期',
    fee: 56,
    eta: '2026-05-28',
    address: '淮安市清江浦区深圳东路',
    likes: 1546,
  },
  GD20260523003: {
    id: 'GD20260523003',
    time: '2026-05-23 16:45',
    steps: [
      { name: '创建', done: true, icon: 'clipboard' },
      { name: '检测开始', done: true, icon: 'search' },
      { name: '维修开始', done: true, icon: 'wrench' },
      { name: '完工提交', done: true, current: true, icon: 'check-circle' },
    ],
    model: 'M2',
    type: '道路救援',
    faultDesc: '轮胎爆胎，已现场更换备胎',
    warranty: '质保内',
    fee: 0,
    eta: '2026-05-23',
    address: '淮安市清江浦区翔宇大道',
    likes: 892,
  },
  GD20260520004: {
    id: 'GD20260520004',
    time: '2026-05-20 11:20',
    steps: [
      { name: '创建', done: true, icon: 'clipboard' },
      { name: '检测开始', done: false, icon: 'search' },
      { name: '维修开始', done: false, icon: 'wrench' },
      { name: '完工提交', done: false, icon: 'check-circle' },
    ],
    model: 'Z3',
    type: '报修',
    faultDesc: '前车灯不亮，用户已自行解决',
    warranty: '质保内',
    fee: 0,
    eta: '-',
    address: '淮安市清江浦区深圳东路',
    likes: 12,
  },
}

// ---------------- 使用指南 / 在线客服 ----------------
// 使用指南：车型切换（P1 ▼ 拉起车型选择）
export const guideModels = ['P1', 'P2', 'P3', 'H10', 'M2', 'Z3']
export const guideVehicleImg = {
  P1: 'feed_r2.jpg',
  P2: 'unsplash/photo-1571068316344-75bc76f77890_w_800_q_80.jpg',
  P3: 'unsplash/photo-1565193566173-7a0ee3dbe261_w_800_q_80.jpg',
  H10: 'feed_r3.jpg',
  M2: 'unsplash/photo-1517649763962-0c623066013b_w_800_q_80.jpg',
  Z3: 'unsplash/photo-1558618666-fcd25c85cd64_w_800_q_80.jpg',
}

// 新手指导视频
export const guideVideos = [
  { id: 1, title: 'P1 电动滑板车–开箱视频', duration: '02:34' },
  { id: 2, title: 'P1 功能操作指导', duration: '03:18' },
  { id: 3, title: 'P1 日常保养教学', duration: '01:56' },
]

// 产品说明书（长图文）
export const manualSections = [
  { page: '01', title: '目录', body: '安全使用须知 / 部件说明 / 充电与续航 / 日常保养 / 故障排查' },
  { page: '02', title: '安全使用须知', body: '骑行前请检查刹车、胎压与电量；禁止超载、禁止涉水骑行；未成年人须在成人监护下使用。' },
  { page: '03', title: '产品配件图示', body: '充电器、工具包、备用内胎、用户手册 各一件，详见包装清单。' },
  { page: '04', title: '功能图解', body: '仪表盘、灯光开关、档位调节、折叠锁扣的位置与使用方法。' },
  { page: '05', title: '充电与续航', body: '使用原装充电器，首次充满后再骑行；长期存放保持 50% 电量于干燥阴凉处。' },
]

// 在线客服
export const feedbackTabs = ['热门问题', '售后查询', '使用指导']
export const feedbackFaqs = [
  { id: 1, q: '门店地址查询' },
  { id: 2, q: '保修政策说明' },
  { id: 3, q: '如何申请道路救援' },
  { id: 4, q: '电池保养建议' },
  { id: 5, q: '车型参数对比' },
  { id: 6, q: '发票与售后流程' },
]

// ---------------- 精选 · 我的订单 ----------------
export const orderTabs = ['全部', '待付款', '待发货', '已发货', '已完成']

export const orders = [
  {
    id: 'PX20260812003',
    time: '2026-08-12 15:22',
    status: '已发货',
    items: [{ name: '原装后轮 适配P1', cover: 'gear', price: 6800, qty: 1 }],
    total: 6800,
  },
  {
    id: 'PX20260810007',
    time: '2026-08-10 11:03',
    status: '已完成',
    items: [{ name: '智能中控屏 P1', cover: 'device', price: 1299, qty: 1 }],
    total: 1299,
  },
]

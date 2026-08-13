// ============================================================
// Mock 数据 —— 仅用于演示，后续接你们 API 时整文件替换即可
// ============================================================

// ---------------- 发现（社区流）----------------
export const discoverTabs = ['推荐', '动态', '广场']

export const discoverQuick = [
  { key: 'custom', label: '立即定制', icon: '✂️' },
  { key: 'notice', label: '官方公告', icon: '📢' },
  { key: 'ai', label: '智能助手', icon: '🤖' },
  { key: 'points', label: '积分兑换', icon: '🎁' },
]

export const vehicleFilters = ['最新', 'H10', 'M2', 'Z3']

export const feedItems = [
  {
    id: 1,
    kind: 'official',
    author: '官方产品经理',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&q=80',
    title: '新一代货运电动三轮车 大空间载货、强动力续航，外卖',
    cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    likes: 30,
    time: '05-14',
    filter: '全部',
  },
  {
    id: 2,
    kind: 'user',
    author: '一路向前',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
    title: '城市通勤一个月真实续航记录，M2 真的很能打',
    cover: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600&q=80',
    likes: 206,
    time: '05-13',
    filter: 'M2',
  },
  {
    id: 3,
    kind: 'user',
    author: '都市穿梭者',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&q=80',
    title: 'H10 旗舰骑行质感分享，这做工对得起价格',
    cover: 'https://images.unsplash.com/photo-1485965120184-e224f7a1dbfe?w=600&q=80',
    likes: 88,
    time: '05-12',
    filter: 'H10',
  },
  {
    id: 4,
    kind: 'official',
    author: 'PXID 门店',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=80&q=80',
    title: 'Z3 折叠款开箱：三步收纳，地铁通勤神器',
    cover: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80',
    likes: 142,
    time: '05-11',
    filter: 'Z3',
  },
  {
    id: 5,
    kind: 'user',
    author: '老李骑行',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80',
    title: '春游踏青路线推荐，沿河绿道一路繁花',
    cover: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600&q=80',
    likes: 56,
    time: '05-10',
    filter: '全部',
  },
  {
    id: 6,
    kind: 'user',
    author: '外卖小哥阿强',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&q=80',
    title: '货运三轮实测：一天 80 公里，电量还剩 30%',
    cover: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
    likes: 311,
    time: '05-09',
    filter: '全部',
  },
]

// 广场：车型展示 P1-P6（名称条只标型号，与设计稿一致）
export const plazaShowcase = [
  { id: 'P1', name: 'P1', cover: 'https://images.unsplash.com/photo-1558981806-ec527fa84c3d?w=400&q=80' },
  { id: 'P2', name: 'P2', cover: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&q=80' },
  { id: 'P3', name: 'P3', cover: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80' },
  { id: 'P4', name: 'P4', cover: 'https://images.unsplash.com/photo-1485965120184-e224f7a1dbfe?w=400&q=80' },
  { id: 'P5', name: 'P5', cover: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80' },
  { id: 'P6', name: 'P6', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
]

// 广场：热门活动
export const activities = [
  { id: 1, title: '新一代货运电动三轮车 大空间载货', date: '05-14', cover: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80' },
  { id: 2, title: '踏春骑行季 · 装备直降专场', date: '05-10', cover: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=400&q=80' },
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
  cover: '🌷',
}

export const featuredQuick = [
  { key: 'hot', label: '热购榜单', icon: '🔥' },
  { key: 'new', label: '近期上新', icon: '✨' },
  { key: 'points', label: '玩转积分', icon: '🎁' },
]

export const collections = [
  { id: 'spring', title: '踏春装备', sub: '限时直降', cover: '🌸' },
  { id: 'p1parts', title: 'P1 原厂配件', sub: '适配专用', cover: '⚙️' },
]

export const products = [
  { id: 1, name: '鸭舌帽 男士', price: 280, origin: 399, cover: '🧢', tag: '踏春装备', sales: 1203, collection: 'spring' },
  { id: 2, name: '原装后轮 适配P1', price: 6800, origin: 7200, cover: '⚙️', tag: 'P1配件', sales: 86, collection: 'p1parts' },
  { id: 3, name: '防晒冰丝袖套', price: 59, origin: 99, cover: '🧤', tag: '踏春装备', sales: 3420, collection: 'spring' },
  { id: 4, name: '智能中控屏 P1', price: 1299, origin: 1499, cover: '📟', tag: 'P1配件', sales: 210, collection: 'p1parts' },
  { id: 5, name: '骑行头盔 一体成型', price: 399, origin: 499, cover: '⛑️', tag: '踏春装备', sales: 880, collection: 'spring' },
  { id: 6, name: '原装电池 48V', price: 1999, origin: 2399, cover: '🔋', tag: 'P1配件', sales: 56, collection: 'p1parts' },
  { id: 7, name: '车尾储物包', price: 129, origin: 169, cover: '🎒', tag: '踏春装备', sales: 1540, collection: 'spring' },
  { id: 8, name: '蓝牙控车模块', price: 299, origin: 359, cover: '🔵', tag: 'P1配件', sales: 430, collection: 'p1parts' },
]

// ---------------- 服务（售后 hub）----------------
export const serviceEntries = [
  { key: 'rescue', label: '道路救援', icon: '🚑', desc: '一键呼叫' },
  { key: 'guide', label: '使用指南', icon: '📖', desc: '新手必看' },
  { key: 'check', label: '车辆体检', icon: '🩺', desc: '远程诊断' },
  { key: 'feedback', label: '意见反馈', icon: '💬', desc: '吐槽建议' },
  { key: 'policy', label: '三包政策', icon: '📄', desc: '权益保障' },
  { key: 'workorders', label: '我的工单', icon: '📦', desc: '查看进度' },
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

export const faqs = [
  {
    id: 1,
    q: '关于电池循环次数',
    a: 'PXID 锂电池设计循环寿命约 800 次后仍保持 80% 容量，日常随用随充即可，避免长期亏电存放。',
  },
  {
    id: 2,
    q: '关于冬季续航里程下降',
    a: '低温会导致锂电池活性下降，续航通常减少 15%-30%，属正常现象；建议室内充电、出行前预热电池。',
  },
  {
    id: 3,
    q: '新车如何充电',
    a: '首次使用请先充满电再骑行；使用原装充电器，绿灯亮起后浮充 1 小时即可断电。',
  },
  {
    id: 4,
    q: '常规电池保养',
    a: '每月至少完成一次完整充放电；长期不用请保持 50% 电量存放于干燥阴凉处。',
  },
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
      { name: '创建', done: true },
      { name: '检测开始', done: true, current: true },
      { name: '维修开始', done: false },
      { name: '完工提交', done: false },
    ],
    model: 'P1',
    type: '报修',
    faultDesc: '刹车失灵，制动距离明显变长',
    faultImages: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80',
      'https://images.unsplash.com/photo-1485965120184-e224f7a1dbfe?w=300&q=80',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=300&q=80',
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
      { name: '创建', done: true },
      { name: '检测开始', done: true, current: true },
      { name: '维修开始', done: false },
      { name: '完工提交', done: false },
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
      { name: '创建', done: true },
      { name: '检测开始', done: true },
      { name: '维修开始', done: true },
      { name: '完工提交', done: true, current: true },
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
      { name: '创建', done: true },
      { name: '检测开始', done: false },
      { name: '维修开始', done: false },
      { name: '完工提交', done: false },
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
  P1: 'https://images.unsplash.com/photo-1558981806-ec527fa84c3d?w=800&q=80',
  P2: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80',
  P3: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
  H10: 'https://images.unsplash.com/photo-1485965120184-e224f7a1dbfe?w=800&q=80',
  M2: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
  Z3: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
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

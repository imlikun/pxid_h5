// ============================================================
// Mock 数据 —— 仅用于演示，后续接你们 API 时整文件替换即可
// ============================================================

import { CAR_MODEL_LABELS } from './carModels'

// ---------------- 发现（社区流）----------------
export const discoverTabs = ['推荐', '动态', '广场']

export const discoverQuick = [
  { key: 'custom', label: '立即定制', icon: 'scissors' },
  { key: 'notice', label: '官方公告', icon: 'megaphone' },
  { key: 'ai', label: '智能助手', icon: 'headset' },
  { key: 'points', label: '积分兑换', icon: 'gift' },
]

// 三个 tab 各自的车型筛选（统一用 PXID 真实在售型号）
export const recommendFilters = ['全部', ...CAR_MODEL_LABELS]
export const dynamicFilters = ['最新', ...CAR_MODEL_LABELS]
export const plazaFilters = [...CAR_MODEL_LABELS]
// 发布页车型选择（PXID 真实在售型号）
export const carModels = [...CAR_MODEL_LABELS]

export const feedItems = [
  // ① 官方新品发布（带种草商品卡）
  {
    id: 1,
    kind: 'official',
    itemType: 'feed',
    author: 'PXID 官方产品经理',
    avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg',
    title: 'MOTA Z3 性能电摩全球首发：极速 100km/h，三档随心切换',
    content: '新一代性能电摩 #MOTA Z3# 正式发布：峰值功率 8000W，极速可达 100km/h，三档动力随心切换，城市通勤与郊野撒欢一车搞定。前向双活塞碟刹 + CBS 联动制动，安全感拉满。即日起可到店预约试驾。',
    cover: 'feed_r1.jpg',
    images: ['feed_r1.jpg'],
    tags: ['新品发布', '性能电摩'],
    carModel: 'MOTA Z3',
    likes: 326,
    isLiked: false,
    comments: 58,
    time: '08-12',
    filter: 'MOTA Z3',
    productCard: { id: 1, name: 'MOTA Z3 性能电摩', price: 19999, cover: 'plaza_p1.jpg' },
  },
  // ② 真实测评（多图）
  {
    id: 2,
    kind: 'user',
    itemType: 'feed',
    author: '城市摆渡人',
    avatar: 'unsplash/photo-1438761681033-6461ffad8d80_w_80_q_80.jpg',
    title: 'PX-4 城市电摩通勤两周实测：续航稳、超车有底气',
    content: '提了 #PX-4# 跑了两周通勤，单程 18 公里，开二档来回还剩 40%。红绿灯起步比汽车还快，超车很有底气。坐垫偏硬，长途建议加个舒适坐垫。@PXID官方 能不能出个原厂尾箱？',
    cover: 'feed_d1.jpg',
    images: ['feed_d1.jpg', 'feed_r2.jpg', 'feed_d3.jpg'],
    tags: ['真实测评', '城市通勤'],
    carModel: 'PX-4',
    likes: 206,
    isLiked: false,
    comments: 48,
    time: '08-11',
    filter: 'PX-4',
    productCard: null,
  },
  // ③ 种草推荐（带商品卡）
  {
    id: 3,
    kind: 'user',
    itemType: 'feed',
    author: '露营玩家小林',
    avatar: 'unsplash/photo-1494790108377-be9c29b29330_w_80_q_80.jpg',
    title: '周末露营带上了 CoolPlay PX-2 胖胎电助力，爽翻',
    content: '#CoolPlay PX-2# 胖胎 + 力矩传感助力，沙滩碎石路都不虚。折叠塞进 SUV 后备箱，到营地骑着买冰棍。续航标称 80 公里，实测带娃带装备跑 60 没问题。种草给同样爱户外的你。',
    cover: 'feed_r2.jpg',
    images: ['feed_r2.jpg', 'feed_d2.jpg'],
    tags: ['种草', '户外露营'],
    carModel: 'CoolPlay PX-2',
    likes: 158,
    isLiked: false,
    comments: 33,
    time: '08-10',
    filter: 'CoolPlay PX-2',
    productCard: { id: 2, name: 'CoolPlay PX-2 胖胎电助力', price: 6999, cover: 'plaza_p2.jpg' },
  },
  // ④ 官方活动玩法
  {
    id: 4,
    kind: 'official',
    itemType: 'feed',
    author: 'PXID 运营中心',
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    title: 'P5 全地形电助力 越野打卡挑战赛招募，赢限定涂装',
    content: '#P5# 全地形电助力骑行挑战赛开启招募！线路覆盖林道、河滩与轻越野，途设 5 个打卡点。完赛即送限定车身贴，前 20 名赢定制涂装。报名走门店或在线客服，名额有限。',
    cover: 'feed_r3.jpg',
    images: ['feed_r3.jpg', 'feed_d1.jpg'],
    tags: ['官方活动', '越野打卡'],
    carModel: 'P5',
    likes: 92,
    isLiked: false,
    comments: 27,
    time: '08-09',
    filter: '全部',
    productCard: null,
  },
  // ⑤ 用车教程（用户）
  {
    id: 5,
    kind: 'user',
    itemType: 'feed',
    author: '越野老炮阿杰',
    avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg',
    title: 'MOTA Z1 越野电摩保养与改装入门，新手必看',
    content: '玩 #MOTA Z1# 半年，分享下保养心得：链条每 200 公里上油、胎压越野降到 1.2bar 增抓地、减震预载按体重调。改装只走正规渠道，别动控制器影响保修。评论区交流你的 setup。',
    cover: 'feed_d3.jpg',
    images: ['feed_d3.jpg', 'feed_r1.jpg', 'feed_r2.jpg'],
    tags: ['用车教程', '改装交流'],
    carModel: 'MOTA Z1',
    likes: 144,
    isLiked: false,
    comments: 61,
    time: '08-08',
    filter: '全部',
    productCard: null,
  },
  // ⑥ 骑行故事（用户）
  {
    id: 6,
    kind: 'user',
    itemType: 'feed',
    author: '城市漫游者',
    avatar: 'unsplash/photo-1544723795-3fb6469f5b39_w_80_q_80.jpg',
    title: '骑 Urban 03 舒适电滑板车，把城市当公园逛',
    content: '下班不想挤地铁，骑上 #Urban 03# 沿河慢行。宽胎 + 前减震，过减速带也不颠。GPS 共享定位让家人放心，APP 还能看轨迹。通勤也能很治愈。',
    cover: 'feed_d2.jpg',
    images: ['feed_d2.jpg'],
    tags: ['骑行故事', '城市漫游'],
    carModel: 'Urban 03',
    likes: 73,
    isLiked: false,
    comments: 19,
    time: '08-07',
    filter: '全部',
    productCard: null,
  },
  // ⑦ 官方技术解读（无车型卡，全部可见）
  {
    id: 7,
    kind: 'official',
    itemType: 'feed',
    author: 'PXID 研发中心',
    avatar: 'unsplash/photo-1507003211169-0a1dd7228f2d_w_80_q_80.jpg',
    title: '自研电控系统解读：让每一次出行更安全、更聪明',
    content: 'PXID 自研 BMS 电池管理 + 助力调校算法，带来更准的电量预估与更线性的动力输出；OTA 可远程升级骑行模式与故障诊断。安全，是每一台车出厂的底色。',
    cover: 'feed_r1.jpg',
    images: ['feed_r1.jpg', 'feed_r3.jpg'],
    tags: ['技术解读', '电控系统'],
    carModel: '',
    likes: 187,
    isLiked: false,
    comments: 24,
    time: '08-06',
    filter: '全部',
    productCard: null,
  },
]

// 广场：车型展示（固定本地车型，与精选/Shopify 无关，仅供发动态关联选车参考）
// cover 用本地占位图（public/ 下 plaza_p*/feed_r*），不连精选商店
export const plazaShowcase = [
  { id: 'scooter-F2', name: 'F2', cover: 'plaza_p2.jpg', itemType: 'buy-vehicle' },
  { id: 'ebike-P2', name: 'P2', cover: 'plaza_p4.jpg', itemType: 'buy-vehicle' },
  { id: 'motorcycle-P5', name: 'P5', cover: 'feed_r1.jpg', itemType: 'buy-vehicle' },
  { id: 'scooter-P1', name: 'P1', cover: 'plaza_p1.jpg', itemType: 'buy-vehicle' },
  { id: 'scooter-G1', name: 'G1', cover: 'plaza_p3.jpg', itemType: 'buy-vehicle' },
  { id: 'scooter-P3', name: 'P3', cover: 'plaza_p5.jpg', itemType: 'buy-vehicle' },
  { id: 'scooter-F1', name: 'F1', cover: 'plaza_p6.jpg', itemType: 'buy-vehicle' },
  { id: 'ebike-P4', name: 'P4', cover: 'plaza_p7.jpg', itemType: 'buy-vehicle' },
  { id: 'ebike-P6', name: 'P6', cover: 'plaza_p8.jpg', itemType: 'buy-vehicle' },
  { id: 'motorcycle-P7', name: 'P7', cover: 'feed_r2.jpg', itemType: 'buy-vehicle' },
  { id: 'motorcycle-P8', name: 'P8', cover: 'feed_r3.jpg', itemType: 'buy-vehicle' },
  { id: 'ebike-P9', name: 'P9', cover: 'feed_r4.jpg', itemType: 'buy-vehicle' },
]

// 真实车型 handle 全集（车型页「热门推荐」用；当前仍映射到 Shopify handle）
export const VEHICLE_HANDLES = ['ant5', 'p2', 'p4']

// 帖子 carModel（内部代号）→ Shopify handle 临时映射
// ⚠️ 临时兜底：mock 帖子的 carModel 是内部代号，与 Shopify handle 不对应；
//    后端把帖子 carModel 改为真实 Shopify handle 后本表可删。
export const carModelToHandle = {
  F2: 'ant5',
  P2: 'p2',
  P5: 'p4',
  P1: 'p2',
  H10: '500w-48v-motor-off-road-electric-scooter-with-seat',
  M2: 'long-range-20-inch-4-fat-tire-pedal-assist-ebike-ant6',
  Z3: 'p2',
  'MOTA Z3': 'p2',
  'PX-4': 'p4',
  'CoolPlay PX-2': 'p2',
  'MOTA Z1': 'ant5',
  'Urban 03': 'ant5-1',
  'scooter-F2': 'ant5',
}

// 广场：热门活动（接口 /activities 为空/异常时前端兜底填充，保证广场、活动中心、详情都不空）
export const activities = [
  {
    id: 1,
    title: '新一代货运电动三轮车 试驾体验周',
    cover: 'plaza_p7.jpg',
    startDate: '2026-09-10',
    endDate: '2026-09-20',
    date: '09-10 ~ 09-20',
    location: '品向智造体验中心（淮安）',
    signupCount: 128,
    quota: 200,
    content:
      '新一代货运电动三轮车主题活动进行中：到店可预约试驾，体验大空间载货与强动力续航表现，现场下单享专属礼遇。\n\n' +
      '活动亮点：\n· 实车试驾：装载 / 爬坡 / 续航全场景体验\n· 专属礼遇：现场下单赠原厂护杠与保养券\n· 老带新：推荐好友成交双方各得积分',
  },
  {
    id: 2,
    title: '品向 M9 品鉴会 · 城市出行新主张',
    cover: 'plaza_p8.jpg',
    startDate: '2026-09-15',
    endDate: '2026-09-28',
    date: '09-15 ~ 09-28',
    location: '品向城市展厅（上海）',
    signupCount: 86,
    quota: 150,
    content:
      '品向 M9 品鉴会：深度体验大空间载货与强动力续航，参与互动即有机会赢取好礼。\n\n' +
      '活动亮点：\n· 静态品鉴：M9 全系配色与改装方案展示\n· 动态体验：城市通勤与近郊出游双场景试驾\n· 互动抽奖：到场即参与，好礼送不停',
  },
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
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    summary: '关于买车流程这里有一份说明',
    time: '05/14',
    unread: false,
    category: 'system',
    type: 'notice',
    link: '/notice/N1',
    payload: { id: 'N1' },
  },
  {
    id: 2,
    sender: '官方资讯',
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    summary: '品向M9 正式开售',
    time: '05/14',
    unread: false,
    category: 'system',
    type: 'activity',
    link: '/activity/2',
    payload: { id: 2 },
  },
  {
    id: 3,
    sender: '官方产品经理',
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    summary: '关于买车流程这里有一份说明',
    time: '05/14',
    unread: false,
    category: 'service',
    type: 'order',
    link: '/order/list',
    payload: {},
  },
  {
    id: 4,
    sender: '官方资讯',
    avatar: 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg',
    summary: '品向M9 正式开售',
    time: '05/14',
    unread: false,
    category: 'interaction',
    type: 'like',
    link: '/feed/1',
    payload: { id: 1 },
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
  { id: 1, name: '鸭舌帽 男士', price: 280, origin: 399, cover: 'unsplash/photo-1588850561407-ed78c282e89b_w_600_q_80.jpg', tag: '踏春装备', sales: 1203, collection: 'spring', shopUrl: 'https://shop.pxid.com/products/cap-men' },
  { id: 2, name: '原装后轮 适配P1', price: 6800, origin: 7200, cover: 'unsplash/photo-1571068316344-75bc76f77890_w_600_q_80.jpg', tag: 'P1配件', sales: 86, collection: 'p1parts', shopUrl: 'https://shop.pxid.com/products/rear-wheel-p1' },
  { id: 3, name: '防晒冰丝袖套', price: 59, origin: 99, cover: 'unsplash/photo-1517649763962-0c623066013b_w_600_q_80.jpg', tag: '踏春装备', sales: 3420, collection: 'spring', shopUrl: 'https://shop.pxid.com/products/ice-sleeves' },
  { id: 4, name: '智能中控屏 P1', price: 1299, origin: 1499, cover: 'unsplash/photo-1493238792000-8113da705763_w_600_q_80.jpg', tag: 'P1配件', sales: 210, collection: 'p1parts', shopUrl: 'https://shop.pxid.com/products/smart-display-p1' },
  { id: 5, name: '骑行头盔 一体成型', price: 399, origin: 499, cover: 'unsplash/photo-1505705694340-019e1e335916_w_600_q_80.jpg', tag: '踏春装备', sales: 880, collection: 'spring', shopUrl: 'https://shop.pxid.com/products/helmet' },
  { id: 6, name: '原装电池 48V', price: 1999, origin: 2399, cover: 'unsplash/photo-1593941707882-a5bba14938c7_w_600_q_80.jpg', tag: 'P1配件', sales: 56, collection: 'p1parts', shopUrl: 'https://shop.pxid.com/products/battery-48v' },
  { id: 7, name: '车尾储物包', price: 129, origin: 169, cover: 'unsplash/photo-1532298229144-0ec0c57515c7_w_600_q_80.jpg', tag: '踏春装备', sales: 1540, collection: 'spring', shopUrl: 'https://shop.pxid.com/products/tail-bag' },
  { id: 8, name: '蓝牙控车模块', price: 299, origin: 359, cover: 'unsplash/photo-1518770660439-4636190af475_w_600_q_80.jpg', tag: 'P1配件', sales: 430, collection: 'p1parts', shopUrl: 'https://shop.pxid.com/products/bluetooth-module' },
]

// ---------------- 积分商城 ----------------
export const pointsBalance = 0

export const pointsProducts = [
  { id: 'pp-1', name: 'PXID 原装充电器 48V', tags: ['原厂正品', '快充'], price: 299, points: 2990, cover: 'unsplash/photo-1593941707882-a5bba14938c7_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/charger-48v' },
  { id: 'pp-2', name: '骑行头盔 一体成型', tags: ['安全认证', '透气'], price: 399, points: 3990, cover: 'unsplash/photo-1505705694340-019e1e335916_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/helmet' },
  { id: 'pp-3', name: '智能中控屏 P1', tags: ['原装适配', 'GPS'], price: 1299, points: 12990, cover: 'unsplash/photo-1493238792000-8113da705763_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/smart-display-p1' },
  { id: 'pp-4', name: '车尾储物包', tags: ['防水', '大容量'], price: 129, points: 1290, cover: 'unsplash/photo-1532298229144-0ec0c57515c7_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/tail-bag' },
  { id: 'pp-5', name: '防晒冰丝袖套', tags: ['UPF50+', '凉感'], price: 59, points: 590, cover: 'unsplash/photo-1517649763962-0c623066013b_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/ice-sleeves' },
  { id: 'pp-6', name: '蓝牙控车模块', tags: ['即插即用', 'APP联动'], price: 299, points: 2990, cover: 'unsplash/photo-1518770660439-4636190af475_w_600_q_80.jpg', shopUrl: 'https://shop.pxid.com/products/bluetooth-module' },
]

// ---------------- 服务（售后 hub）----------------
export const serviceEntries = [
  { key: 'rescue', label: '道路救援', icon: 'wrench', desc: '一键呼叫' },
  { key: 'guide', label: '使用指南', icon: 'guide', desc: '新手必看' },
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
      'unsplash/photo-1558618666-fcd25c85cd64_w_600_q_80.jpg',
      'feed_r1.jpg',
      'unsplash/photo-1571068316344-75bc76f77890_w_600_q_80.jpg',
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
  // 热门问题：综合高频（默认 tab）
  { id: 1, category: '热门问题', q: '如何查询附近门店？', a: '在 App「服务 → 附近门店」可按"距离最近 / 评分最高"查看附近门店，含地址、电话、路线；也可直接线下到店咨询。' },
  { id: 2, category: '热门问题', q: '车辆保修期多久？', a: '整车保修 2 年（关键部件如车架/电机 3 年），电池单独保修 1-2 年（按购车车型而定）；非人为故障免费维修，具体以购车合同为准。' },
  { id: 3, category: '热门问题', q: '电池续航里程怎么算？', a: '续航受载重、气温、路面、助力/纯电模式影响，标称值为参考值；低温（<10℃）续航缩水 20-40% 属正常物理现象，建议冬季室内停放。' },
  { id: 4, category: '热门问题', q: 'APP 连不上车怎么办？', a: '先确认车辆已开机通电、电量充足；手机蓝牙和定位都已开启；首次绑定不要在系统蓝牙里手动配对，进入 App 后会自动搜索附近车辆。' },
  { id: 5, category: '热门问题', q: '如何申请道路救援？', a: 'App「服务 → 道路救援」提交救援申请（车型 / 故障描述 / 联系电话），附近门店或救援点接单后会主动联系；紧急情况可直接拨打 400 客服热线。' },
  { id: 6, category: '热门问题', q: '发票怎么开？', a: '下单时勾选"需要发票"并填写公司抬头和税号；电子发票 3 个工作日内发到预留邮箱；纸质发票随货或后续邮寄，电子与纸质具有同等法律效力。' },
  // 售后查询：质保、维修、退换、配件、工单
  { id: 11, category: '售后查询', q: '保修政策说明', a: '整车 2 年，电池 1-2 年（按车型）；非人为故障免费维修；易损件（刹车片/内外胎/灯珠等）不在保修范围。详情见购车合同或咨询门店。' },
  { id: 12, category: '售后查询', q: '保修期外如何收费？', a: '门店检测后报价（人工 + 配件费），价格透明公示；用户确认后再开始维修，确认前可拒绝，不产生任何费用。' },
  { id: 13, category: '售后查询', q: '维修工单进度查询', a: 'App「服务 → 我的工单」可查看每个工单状态（待受理 / 服务中 / 已完成 / 已取消）；也可拨打 400 客服电话查询。' },
  { id: 14, category: '售后查询', q: '配件真伪验证', a: 'PXID 原厂配件包装有专属防伪码，可扫码或致电 400 验证；门店更换配件时，可要求出示 PXID 品牌包装，谨防假冒。' },
  { id: 15, category: '售后查询', q: '退换货流程与时效', a: '7 天无理由退货、15 天换货（不影响二次销售）；App「订单详情 → 申请退款 / 换货」提交，或联系在线客服协助处理，2 个工作日内响应。' },
  { id: 16, category: '售后查询', q: '事故车理赔对接', a: '门店协助定损拍照，联系对应保险公司报案；如需第三方鉴定报告，门店可配合出具相关维修记录与配件清单。' },
  // 使用指导：充电、保养、APP、车辆设置、安全
  { id: 21, category: '使用指导', q: '首次充电注意事项', a: '新车无需过度充电，电量剩余 20% 左右即可充；首次充满后再开始骑行；务必使用原装充电器，不要混用第三方。' },
  { id: 22, category: '使用指导', q: '电池保养建议', a: '日常保持电量 20%-80% 最佳；避免亏电长期存放；长期不用每月补电一次；远离高温（>40℃）和低温（<-10℃）极端存放环境。' },
  { id: 23, category: '使用指导', q: '冬季续航下降正常吗？', a: '属于正常物理现象：低温下锂电池活性降低，续航缩水 20-40%；建议室内停放，骑行前预热 5-10 分钟可缓解。' },
  { id: 24, category: '使用指导', q: '仪表盘故障码解读', a: '常见 E01 电机、E02 电池、E03 通讯故障；可在 App 内扫码仪表盘故障码图标查询详细说明；严重或重复出现请立即联系 400 或门店。' },
  { id: 25, category: '使用指导', q: '档位与动力模式切换', a: '默认低速新手模式（1 档），App「车辆设置 → 骑行偏好」可调 1-3 档；纯电 / 助力模式按仪表盘切换键切换；新手建议先适应低档。' },
  { id: 26, category: '使用指导', q: '安全骑行须知', a: '头盔必戴；不超载（最大载重见车型参数）；不涉水骑行（涉水深度 < 10cm）；夜间开启大灯尾灯；不与机动车抢道，遵守交规。' },
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

// ---------------- 动态流（关注流 UGC，独立数据源）----------------
export const moments = [
  { id: 101, itemType: 'moment', author: '骑手老王', avatar: 'unsplash/photo-1500648767791-00dcc994a43e_w_80_q_80.jpg', title: '今天跑了 120 公里，P1 载货版续航真顶', content: '早上 6 点出门，中午充了一次电，晚上回来还剩 18%。载了三箱水加两袋米，起步一点不肉。', images: ['feed_d1.jpg', 'feed_r2.jpg', 'feed_d3.jpg', 'feed_r3.jpg'], tags: ['日常跑单', '续航实测'], carModel: 'P1', likes: 88, isLiked: false, comments: 21, time: '2小时前', followed: false, focusCar: 'P1' },
  { id: 102, itemType: 'moment', author: '城市摆渡人', avatar: 'unsplash/photo-1438761681033-6461ffad8d80_w_80_q_80.jpg', title: 'H10 山地版爬坡能力实测，坡道起步不溜车', content: '住老小区天天爬坡，换 H10 之后坡道辅助很稳，半坡起步也不慌。', images: ['feed_r1.jpg', 'feed_d1.jpg'], tags: ['爬坡', '山地版'], carModel: 'H10', likes: 154, isLiked: true, comments: 36, time: '5小时前', followed: true, focusCar: 'H10' },
  { id: 103, itemType: 'moment', author: '夜行骑士', avatar: 'unsplash/photo-1472099645785-5658abf4ff4e_w_80_q_80.jpg', title: 'M2 夜间灯光升级，远近光切换太实用', content: '原厂灯够亮，自己加了一组辅灯跑夜路更安心。改装走正规渠道，别影响保修。', images: ['feed_r2.jpg'], tags: ['灯光改装', '夜骑'], carModel: 'M2', likes: 67, isLiked: false, comments: 14, time: '昨天', followed: false, focusCar: 'M2' },
  { id: 104, itemType: 'moment', author: '宝妈代步', avatar: 'unsplash/photo-1544005313-94ddf0286df2_w_80_q_80.jpg', title: 'Z3 接送娃神器，折叠放进后备箱无压力', content: '幼儿园门口停一堆车，Z3 折叠一下塞后备箱，接娃不堵心。续航对宝妈完全够用。', images: ['feed_d3.jpg', 'feed_r3.jpg'], tags: ['接送娃', '折叠'], carModel: 'Z3', likes: 201, isLiked: false, comments: 52, time: '昨天', followed: false, focusCar: 'Z3' },
]

// ---------------- 官方公告（独立入口 + 消息中心系统分类共用）----------------
export const notices = [
  {
    id: 'N1', type: 'recall', forceAck: true, isRead: false, views: 12840,
    title: '关于部分批次 H10 控制器召回升级的通知',
    summary: '为保障骑行安全，对 2026 年 3 月前生产的 H10 批次控制器启动免费召回升级，请相关车主尽快预约。',
    publisher: 'PXID 产品安全委员会', publishTime: '2026-08-10 10:00', effectiveTime: '2026-08-10 起长期有效',
    content:
      '尊敬的 H10 车主：\n\n经质量追溯，2026-03-01 前生产的部分 H10 车型（车架号以 H10A 开头）控制器固件在极端工况下可能出现输出波动，存在安全隐患。我们决定启动自愿召回升级，本次升级完全免费。\n\n【升级内容】\n更换为优化版控制器固件，提升高负载下的输出稳定性与热保护策略，骑行手感更线性。\n\n【预约方式】\n1. 前往任意 PXID 授权门店登记，全程免费，预计耗时约 30 分钟；\n2. 或联系在线客服预约上门取送（限部分城市）。\n\n【温馨提示】\n升级前请保持电量充足；完成后门店将提供检测报告。由此给您带来的不便，我们深表歉意，感谢您对 PXID 安全的信任。',
  },
  {
    id: 'N2', type: 'version', forceAck: false, isRead: false, views: 8920,
    title: 'PXID App 3.2.0 版本更新公告',
    summary: '新增发现页官方公告独立入口与动态红点，优化消息中心分类与车型详情页体验。',
    publisher: 'PXID 产品研发部', publishTime: '2026-08-08 18:00', effectiveTime: '2026-08-08 起',
    content:
      'PXID App 3.2.0 已陆续推送，本次更新重点如下：\n\n① 发现页新增「官方公告」独立入口，重要通知带红点提醒，不再错过召回与安全提示；\n② 动态流独立成栏，关注的人发布新动态时，底部「发现」图标显示红点；\n③ 消息中心按「互动 / 系统 / 订单 / 车辆」四类聚合未读，支持一键全部已读；\n④ 车型详情页新增官方参数与用户口碑分区，选车更省心。\n\n建议前往应用商店更新至最新版本，以获得更稳定的连接与更完整的服务。',
  },
  {
    id: 'N3', type: 'activity', forceAck: false, isRead: true, views: 5640,
    title: '踏春出行季 · 装备直降限时开启',
    summary: '精选商城踏春装备专场开启，头盔、袖套、储物包等限时直降，积分可叠加抵扣。',
    publisher: 'PXID 运营中心', publishTime: '2026-08-01 09:00', effectiveTime: '2026-08-01 至 2026-08-31',
    content:
      '春风十里，正是出门好时节。踏春出行季正式开启：\n\n【精选商城 · 踏春装备专场】\n头盔、冰丝袖套、车尾储物包等应季好物限时直降，满 199 减 30。\n\n【积分叠加】\n活动商品支持积分抵扣，100 积分抵 1 元，可与优惠券叠加使用，最高抵扣订单金额的 30%。\n\n【参与方式】\n打开 App 进入「精选」→ 踏春装备，下单即享。活动截止 2026-08-31，数量有限，先到先得。',
  },
  {
    id: 'N4', type: 'safety', forceAck: false, isRead: true, views: 3120,
    title: '雨季骑行安全提醒',
    summary: '雨季路面湿滑，请降低胎压、保持车距、避免涉水，刹车提前轻柔点刹。',
    publisher: 'PXID 用户运营', publishTime: '2026-07-20 11:00', effectiveTime: '2026-07-20 起',
    content:
      '南方梅雨、北方汛期都已到来，湿滑路面是骑行事故的高发场景。请收好这份雨季安全指南：\n\n① 胎压适当降低，增大接地面积，提升抓地力；\n② 涉水深度不超过轮毂中心，避免电机与控制器进水；\n③ 刹车提前轻柔点刹，禁止急刹，防止侧滑甩尾；\n④ 夜间湿滑路段开启大灯，保持安全车距（至少为晴天的 2 倍）。\n\n如车辆涉水后出现异常，请尽快到店检查电路，切勿带病骑行。',
  },
  {
    id: 'N5', type: 'maintain', forceAck: false, isRead: false, views: 2370,
    title: '夏季爱车保养月 · 免费全车检测开启',
    summary: '8 月暑运高峰，PXID 全国门店提供免费全车检测（刹车/胎压/电池/紧固件），预约即赠清凉礼包。',
    publisher: 'PXID 售后服务中心', publishTime: '2026-07-28 09:30', effectiveTime: '2026-07-28 至 2026-08-31',
    content:
      '高温酷暑是车辆故障的高发期。为让您的爱车安然度夏，PXID 售后「夏季保养月」正式开启：\n\n【免费全车检测】\n覆盖刹车系统、胎压与磨损、电池健康、关键紧固件四大项，由专业技师逐项排查，约 20 分钟完成。\n\n【预约有礼】\n通过 App「服务 → 车辆体检」在线预约到店，即赠清凉骑行礼包（冰丝袖套 + 车载清凉喷雾）。\n\n【保养建议】\n长期暴晒易加速橡胶件老化，建议停放于阴凉处；电池充电避开正午高温时段，可显著延长寿命。\n\n活动截止 2026-08-31，预约从速。',
  },
]

// ---------------- 立即定制 → 购车 Tab（前端展示，提交走原生）----------------
export const customizeOptions = {
  models: [
    { id: 'P1', name: 'P1 都市版', desc: '日常通勤 · 轻巧折叠' },
    { id: 'H10', name: 'H10 山地版', desc: '强劲动力 · 爬坡无忧' },
    { id: 'M2', name: 'M2 长续航版', desc: '远途代步 · 续航升级' },
    { id: 'Z3', name: 'Z3 亲子版', desc: '接送娃 · 安全舒适' },
  ],
  colors: ['极夜黑', '云朵白', '活力橙', '青松绿'],
  batteries: ['标准续航', '长续航'],
}

export const buyIntentOrders = [
  { id: 'YX20260810001', model: 'H10', color: '活力橙', battery: '长续航', contact: '138****6688', time: '2026-08-10 16:20', status: '已提交' },
]

// ---------------- 内容详情页评论种子（楼中楼）----------------
export const commentSeed = {
  1: [
    { id: 'c1', author: '外卖小哥阿强', avatar: 'unsplash/photo-1500648767791-00dcc994a43e_w_80_q_80.jpg', content: '这车续航真有说的这么顶吗？求真实车主现身说法', time: '05-14 10:22', likes: 8, isLiked: false, replies: [ { id: 'c1r1', author: '一路向前', avatar: 'unsplash/photo-1494790108377-be9c29b29330_w_80_q_80.jpg', content: '我天天跑，亲测够用，别拉太满就行', time: '05-14 11:05', likes: 3, isLiked: false } ] },
    { id: 'c2', author: '门店小妹', avatar: 'unsplash/photo-1438761681033-6461ffad8d80_w_80_q_80.jpg', content: '淮安体验店可预约试驾，欢迎到店', time: '05-14 14:30', likes: 5, isLiked: false, replies: [] },
  ],
  101: [
    { id: 'c3', author: '新手小白', avatar: 'unsplash/photo-1472099645785-5658abf4ff4e_w_80_q_80.jpg', content: '老王你这改装合规吗？我也在考虑', time: '2小时前', likes: 4, isLiked: false, replies: [] },
  ],
}

// ---------------- 接口占位（接 API 时整文件替换 mock）----------------
export const API_ENDPOINTS = {
  feedDetail: (id) => `/feed/${id}`,
  moments: '/moments',
  messageUnread: '/message/unread',
  notices: '/notices',
  noticeAck: (id) => `/notices/${id}/ack`,
  customizeSubmit: '/customize/submit',
  publish: '/publish',
  interact: '/interact',
  search: '/search',
}

export const defaultAvatar = 'unsplash/photo-1527980965255-d3b416303d12_w_80_q_80.jpg'
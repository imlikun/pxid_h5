// 发现页「真实感」种子数据：清空 demo 帖后灌入原创分享内容（用户视角为主 + 官方科普/品牌）。
// 图全部用仓库内 public 资源（banner/news/plaza/unsplash），不依赖外网抓取、不抄第三方内容。
// 用法： node server/seed-real-posts.js   （DB 默认同目录 feed.db；可 DB_PATH=/path/to/feed.db 指定）
const path = require('path');
const Database = require('better-sqlite3');

const DB = process.env.DB_PATH || path.join(__dirname, 'feed.db');
const db = new Database(DB, { fileMustExist: true });

const B = 'https://appin.site/nav/pxid-h5/';
const img = (p) => B + p;

const PERSONAS = {
  zhang: { name: '通勤老张', avatar: 'unsplash/photo-1438761681033-6461ffad8d80_w_80_q_80.jpg' },
  jie:   { name: '改装阿杰', avatar: 'unsplash/photo-1472099645785-5658abf4ff4e_w_80_q_80.jpg' },
  lee:   { name: '周末刷山Lee', avatar: 'unsplash/photo-1494790108377-be9c29b29330_w_80_q_80.jpg' },
  xu:    { name: '续航焦虑退散', avatar: 'unsplash/photo-1500648767791-00dcc994a43e_w_80_q_80.jpg' },
  yan:   { name: '颜值即正义', avatar: 'unsplash/photo-1507003211169-0a1dd7228f2d_w_80_q_80.jpg' },
  bai:   { name: '新手小白', avatar: 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg' },
  kai:   { name: '露营车友阿凯', avatar: 'unsplash/photo-1544005313-94ddf0286df2_w_80_q_80.jpg' },
  mo:    { name: '电摩老炮', avatar: 'unsplash/photo-1544723795-3fb6469f5b39_w_80_q_80.jpg' },
};
const OFFICIAL = { name: 'PXID 品向智造', avatar: 'news/pxid-logo.png' };

// 帖子：author=人设key或'official'；imgs=public下相对路径数组；ageDays=距今天数（越大越旧，先插旧的后插新的）
const POSTS = [
  // ===== 通勤实测（用户）=====
  { a:'zhang', pillar:'通勤实测', content:'被早高峰挤到崩溃后，我换了电助力。三环到五环15km，开车堵、地铁换乘累到腿软，入手PXID城市通勤款后真香——力矩传感踩踏线性，平路轻松25巡航，一周通勤都不用充电。现在到公司还不一身汗，谁懂啊。', imgs:['banner/banner-op1.jpg','unsplash/photo-1493238792000-8113da705763_w_600_q_80.jpg'], tags:['通勤','电助力自行车','续航实测'], car:'电助力自行车', likes:213, age:2, c:[['jie','同通勤党，求型号～'],['bai','续航标称多少呀？']] },
  { a:'xu', pillar:'通勤实测', content:'里程焦虑？我把8Ah换成20Ah后真香了。之前8安时爬坡掉电心慌，自己换了块20Ah电池，标称100km直接成真，现在悠然自得享受骑行，再也不盯电量表。动手党表示成本还更低。', imgs:['news/news-01-battery-passport.jpg','news/news-02-battery-enclosure.jpg'], tags:['续航','改装','电池'], car:'电动滑板车', likes:167, age:3, c:[['mo','自己换电池注意BMS匹配'],['kai','同款焦虑退散+1']] },
  { a:'lee', pillar:'通勤实测', content:'周末刷山实测：PXID电助力爬15%坡基本不费力。郊野绿道，力矩传感自动识别发力加大辅助，那种人车合一的丝滑感，下坡助力自动减小也不失控，比纯人力山地车舒服太多。', imgs:['banner/banner-shot1.jpg','unsplash/photo-1517649763962-0c623066013b_w_800_q_80.jpg'], tags:['骑行','周末','爬坡'], car:'电助力自行车', likes:142, age:5, c:[['zhang','坡度党狂喜'],['yan','图拍得绝']] },
  { a:'yan', pillar:'通勤实测', content:'颜值党通勤：星灰磨砂漆面回头率拉满。公司楼下被问了三次啥车，铝合金车架单手就能拎上楼，电梯里也不占地。通勤顺便还收获了好几个搭讪，值了。', imgs:['banner/banner-op2.jpg','banner/banner-op3.jpg'], tags:['颜值','通勤','改装'], car:'电助力自行车', likes:98, age:6, c:[['mo','颜值是第一生产力']] },
  { a:'bai', pillar:'通勤实测', content:'新手第一辆电助力，十分钟装好就骑走。手残党照说明书把车把脚踏座垫一装，前轮快拆，电池内置不怕淋，连工具都送了。不用去车行，通勤党友好度拉满。', imgs:['banner/banner-op3.jpg','banner/banner-op2.jpg'], tags:['新手','开箱','通勤'], car:'电助力自行车', likes:76, age:8, c:[['kai','新手友好yyds'],['jie','记得先充饱电再骑']] },
  { a:'zhang', pillar:'通勤实测', content:'冬天续航打几折？实测-5℃掉到7成。锂电通病，低温活性下降，我现在的对策：停地下车库、少急加速、回南天也别一直放户外。分享给怕冬天趴窝的兄弟。', imgs:['news/news-01-battery-passport.jpg','news/news-01-battery-passport.jpg'], tags:['冬季','续航','保养'], car:'电助力自行车', likes:189, age:10, c:[['xu','保暖贴安排上'],['lee','北方用户泪目']] },
  { a:'mo', pillar:'通勤实测', content:'电摩通勤100km/周，油费省出一杯奶茶。之前油摩一周油费80，换PXID电摩后电费几乎忽略不计，百公里一两块。城市通勤成本直接打下来，真香。', imgs:['banner/banner-moto.jpg','banner/banner-shot2.jpg'], tags:['电摩','通勤','省钱'], car:'电摩', likes:154, age:12, c:[['zhang','算账党狂喜'],['kai','通勤成本忽略不计']] },
  { a:'kai', pillar:'通勤实测', content:'最后三公里地狱终结：滑板车5分钟到地铁。从家到地铁站走路15分钟，滑板车5分钟，到站轻轻一折拎进站，放脚边不占地方。以前觉得通勤是折磨，现在反而当成放空时间。', imgs:['banner/banner-scooter.jpg','banner/banner-scooter.jpg'], tags:['电动滑板车','通勤','最后一公里'], car:'电动滑板车', likes:121, age:14, c:[['bai','最后一公里救星'],['xu','折叠党+1']] },

  // ===== 改装/颜值（用户）=====
  { a:'jie', pillar:'改装颜值', content:'给通勤车贴了隐形车衣，划痕拜拜。透明膜防刮，雨季泥点一擦就掉，漆面还是亮亮的。动手能力一般的也能自己贴，性价比极高。', imgs:['banner/banner-op1.jpg','banner/banner-op1.jpg'], tags:['改装','贴膜','颜值'], car:'电助力自行车', likes:88, age:4, c:[['yan','车衣真香'],['mo','细节控']] },
  { a:'yan', pillar:'改装颜值', content:'换了对宽胎，过减速带像踩软垫。原厂窄胎颠得龇牙咧嘴，换26寸宽胎抓地稳，过坑洼几乎无震感，比充气胎还省心。城市路况友好度直接上一档。', imgs:['unsplash/photo-1571068316344-75bc76f77890_w_800_q_80.jpg','banner/banner-op2.jpg'], tags:['改装','轮胎','舒适'], car:'电助力自行车', likes:103, age:7, c:[['kai','宽胎党报到'],['lee','舒适第一']] },
  { a:'mo', pillar:'改装颜值', content:'电摩加了个手机支架+行车记录，城市通勤安全感+。颠簸路段记录仪能取证，支架磁吸稳得一批，导航抬头就看。建议通勤党都安排。', imgs:['banner/banner-moto.jpg','banner/banner-shot3.jpg'], tags:['电摩','改装','配件'], car:'电摩', likes:132, age:9, c:[['zhang','记录仪必装'],['jie','支架哪买的']] },
  { a:'jie', pillar:'改装颜值', content:'自己调了助力曲线，运动模式爬坡不费力。APP里把助力档调高，分享下参数：平路3档、坡道直接拉5档，电机响应积极但不窜。动手能力强的可以试试。', imgs:['news/news-04-250w-motor.jpg','news/news-04-250w-motor.jpg'], tags:['改装','三电','助力'], car:'电助力自行车', likes:67, age:11, c:[['lee','参数收了'],['xu','APP还能调？']] },
  { a:'lee', pillar:'改装颜值', content:'车把缠了皮质把套，手感直接上一档。长途不磨手，出汗也不滑，复古棕配星灰车身意外地搭。几十块的小改装，舒服度提升巨大。', imgs:['banner/banner-shot1.jpg','banner/banner-shot1.jpg'], tags:['改装','舒适','骑行'], car:'电助力自行车', likes:54, age:13, c:[['yan','复古风爱了']] },
  { a:'kai', pillar:'改装颜值', content:'滑板车加了前灯+尾灯，夜骑敢出门了。之前怕黑只敢白天，现在亮度够照亮前面路，尾灯让后车一眼看见。夜间通勤安全感拉满。', imgs:['banner/banner-scooter.jpg','banner/banner-scooter.jpg'], tags:['改装','夜骑','安全'], car:'电动滑板车', likes:79, age:16, c:[['bai','夜骑必备'],['mo','安全第一']] },
  { a:'yan', pillar:'改装颜值', content:'DIY了一个木纹车筐，买菜兜风两不误。复古风，同事都说好看，前面塞个咖啡+便当刚刚好。动手能力一般也能搞定，性价比拉满。', imgs:['banner/banner-op3.jpg','banner/banner-op3.jpg'], tags:['改装','颜值','生活'], car:'电助力自行车', likes:91, age:18, c:[['zhang','买菜神器'],['kai','颜值即正义']] },

  // ===== 骑行生活·露营（用户）=====
  { a:'kai', pillar:'骑行生活', content:'带电助力去露营，装备全塞车后架。周末近郊营地，往返40km一天一充，后架绑个驮包啥都能带。比开车找车位省心，到营地还能骑着溜达。', imgs:['banner/banner-shot2.jpg','unsplash/photo-1571068316344-75bc76f77890_w_800_q_80.jpg'], tags:['露营','周末','电助力自行车'], car:'电助力自行车', likes:176, age:1, c:[['lee','露营搭子+1'],['yan','装备党羡慕']] },
  { a:'lee', pillar:'骑行生活', content:'城市绿道20km晨骑，比健身房舒服。早起沿河绿道，风吹过来一下就清醒了，助力巡航不累还能看景。坚持两周，腿围都紧了点。', imgs:['banner/banner-shot1.jpg','unsplash/photo-1517649763962-0c623066013b_w_800_q_80.jpg'], tags:['骑行','晨骑','生活'], car:'电助力自行车', likes:145, age:5, c:[['zhang','晨骑党报到'],['kai','绿道yyds']] },
  { a:'mo', pillar:'骑行生活', content:'电摩跑山一日游，续航焦虑？不存在。山路来回120km，中途补电一次，服务区喝杯咖啡的功夫就回血。风从耳边过，比开车爽太多。', imgs:['banner/banner-moto.jpg','banner/banner-shot3.jpg'], tags:['电摩','跑山','周末'], car:'电摩', likes:158, age:8, c:[['jie','跑山搭子'],['xu','补电点收藏了']] },
  { a:'zhang', pillar:'骑行生活', content:'带娃逛公园，后座儿童椅真香。周末亲子，娃坐后面超开心，绿道平缓不怕摔。以前开车找车位半小时，现在直接骑到湖边。', imgs:['banner/banner-op2.jpg','banner/banner-op2.jpg'], tags:['亲子','生活','通勤'], car:'电助力自行车', likes:112, age:11, c:[['bai','带娃神器'],['yan','亲子风']] },
  { a:'xu', pillar:'骑行生活', content:'滑板车+地铁组合，跨区探店无压力。滑板车解决最后一公里，地铁解决长距，到店折叠塞桌底。周末跨区吃吃喝喝，通勤成本忽略不计。', imgs:['banner/banner-scooter.jpg','unsplash/photo-1493238792000-8113da705763_w_600_q_80.jpg'], tags:['电动滑板车','城市','探店'], car:'电动滑板车', likes:84, age:14, c:[['kai','组合出行真聪明']] },
  { a:'kai', pillar:'骑行生活', content:'海边骑行，落日+海风=满分周末。沿海公路助力巡航省力，腾出手还能拍两张。往返30km电量还剩一半，回程逆风也不慌。', imgs:['banner/banner-shot3.jpg','unsplash/photo-1565193566173-7a0ee3dbe261_w_800_q_80.jpg'], tags:['骑行','海边','周末'], car:'电助力自行车', likes:201, age:17, c:[['lee','海边yyds'],['yan','图美哭了']] },
  { a:'yan', pillar:'骑行生活', content:'把车停咖啡馆门口，店员没多问。黑色极简风百搭不挑人，折叠立起来刚好塞进门边。城市漫步+一杯咖啡，周末松弛感拉满。', imgs:['banner/banner-op1.jpg','banner/banner-op1.jpg'], tags:['颜值','生活','城市'], car:'电助力自行车', likes:73, age:20, c:[['zhang','松弛感']] },
  { a:'bai', pillar:'骑行生活', content:'第一次夜骑公园，灯光亮到有点飘。新手夜骑体验，前灯铺路够宽，绿道没人刚好练手。提醒新手：慢点、戴头盔、走非机动车道。', imgs:['banner/banner-shot1.jpg','banner/banner-shot2.jpg'], tags:['夜骑','新手','生活'], car:'电助力自行车', likes:49, age:22, c:[['kai','夜骑注意安全'],['mo','头盔必戴']] },

  // ===== 新手攻略（官方）=====
  { a:'official', pillar:'新手攻略', content:'电助力/电摩/电动滑板车怎么选？一张表说清：通勤＜5km且要便携→滑板车；5-15km兼顾锻炼→电助力；长途/载重/不限牌城市→电摩。先想清楚场景再下单，别盲目冲参数。', imgs:['banner/banner-hero-poster.jpg','banner/banner-op1.jpg'], tags:['选购','攻略','科普'], car:'', likes:233, age:2, c:[['bai','收藏了'],['zhang','选车大纲']] },
  { a:'official', pillar:'新手攻略', content:'新手上牌避坑：这些城市电摩要驾照。各地政策不一，电摩多归机动车需驾驶证+上牌+保险；电助力多数按非机动车管理但也要看当地时速/重量红线。买前先查本地交管规定，合规上路最稳。', imgs:['banner/banner-moto.jpg','news/news-07-india-manufacturing.jpg'], tags:['上牌','政策','攻略'], car:'', likes:198, age:6, c:[['mo','政策贴及时'],['xu','已收藏']] },
  { a:'official', pillar:'新手攻略', content:'电池保养5条：让你的续航多撑两年。①浅充浅放别耗尽 ②长期不用保持50%电 ③冬季停室内保暖 ④别用非原装充电器 ⑤雨季充电口擦干。锂电怕过放和低温，管好这两点就赢一半。', imgs:['news/news-01-battery-passport.jpg','news/news-02-battery-enclosure.jpg'], tags:['保养','电池','攻略'], car:'', likes:176, age:13, c:[['zhang','记下了'],['kai','保养党']] },
  { a:'official', pillar:'新手攻略', content:'力矩传感vs速度传感，差在哪？速度传感看车轮转速给固定助力，易突兀；力矩传感读你踩踏力度等比例加力，像有人轻推你，爬坡也自然。预算够优先力矩，骑行质感天差地别。', imgs:['news/news-04-250w-motor.jpg','banner/banner-op2.jpg'], tags:['三电','科普','选购'], car:'', likes:164, age:19, c:[['jie','力矩党+1'],['lee','讲得清楚']] },

  // ===== 产品科普·三电（官方）=====
  { a:'official', pillar:'产品科普', content:'250W轮毂电机拆解：为什么起步不窜。电机控制器做软启动，踩下踏板先小电流再平滑升功率，避免一蹬就冲。配合力矩传感，城市启停像自动挡一样顺。', imgs:['news/news-04-250w-motor.jpg','banner/banner-op3.jpg'], tags:['三电','电机','科普'], car:'', likes:142, age:3, c:[['mo','硬核科普'],['yan','涨知识']] },
  { a:'official', pillar:'产品科普', content:'电池护照是什么？每块PXID电池可溯源。从电芯批次、出厂检测到循环次数，一扫二维码全知道，二手流转、售后维权都省心。这也是出海市场的合规刚需。', imgs:['news/news-01-battery-passport.jpg','news/news-02-battery-enclosure.jpg'], tags:['电池','制造','溯源'], car:'', likes:121, age:9, c:[['xu','溯源真需要'],['zhang','售后友好']] },
  { a:'official', pillar:'产品科普', content:'注塑车架是怎么造出来的？模具开发→注塑成型→去毛刺→CNC精修→电泳喷漆，一道道工序下来车架既轻又稳。PXID自有模具车间，打样到量产周期更短。', imgs:['news/news-05-injection-mold.jpg','banner/banner-shot1.jpg'], tags:['制造','车架','工艺'], car:'', likes:109, age:15, c:[['jie','工艺党狂喜'],['kai','自有模具牛']] },
  { a:'official', pillar:'产品科普', content:'专利趋势：电助力车今年哪些技术在卷。长续航高密度电芯、轻量化碳纤车架、智能助力算法、可换电架构是四大热点。PXID研发也在这几条线上持续加码。', imgs:['news/news-03-patent-trends.jpg','banner/banner-hero-poster.jpg'], tags:['行业','专利','科普'], car:'', likes:97, age:21, c:[['lee','趋势党'],['mo','卷得对']] },

  // ===== 品牌动态·工厂（官方）=====
  { a:'official', pillar:'品牌动态', content:'PXID亮相 Eurobike 2026，三款新品首发。从城市通勤款到轻量折叠款，展会现场被海外买家问爆。中国制造的电助力，这次在国际展上挺直了腰杆。', imgs:['news/news-06-eurobike-2026.jpg','banner/banner-hero-poster.jpg'], tags:['品牌','展会','新品'], car:'', likes:256, age:1, c:[['kai','为国货点赞'],['zhang','现场图绝了']] },
  { a:'official', pillar:'品牌动态', content:'我们的制造能力：从模具到整车的全链路。自有注塑/焊接/总装产线，模具开发到量产一站式，ODM客户打样最快两周出车。这也是PXID能做深定制的底气。', imgs:['news/news-05-injection-mold.jpg','news/news-07-india-manufacturing.jpg'], tags:['制造','工厂','品牌'], car:'', likes:188, age:7, c:[['jie','全链路牛'],['mo','制造党']] },
  { a:'official', pillar:'品牌动态', content:'印度制造基地投产，海外交付再提速。继自有产线后，海外本地化组装落地，亚太订单交付周期缩短，售后响应也更近。全球化不是口号，是产线。', imgs:['news/news-07-india-manufacturing.jpg','banner/banner-shot3.jpg'], tags:['出海','制造','品牌'], car:'', likes:167, age:12, c:[['yan','出海顺利'],['lee','交付提速']] },
  { a:'official', pillar:'品牌动态', content:'OEM/ODM合作开放：把你的设计变成车。无论是品牌方还是渠道商，从ID设计、三电方案到认证出海，PXID都能接。欢迎带需求来聊，一起把想法落地。', imgs:['banner/banner-op1.jpg','banner/banner-op2.jpg'], tags:['OEM','ODM','合作'], car:'', likes:143, age:18, c:[['kai','合作咨询'],['zhang','定制党']] },
  { a:'official', pillar:'品牌动态', content:'上半年专利受理量同比增长，研发继续加码。三电效率、轻量化车架、智能助力算法是投入重点。好产品不是喊出来的，是专利和产线堆出来的。', imgs:['news/news-03-patent-trends.jpg','news/news-04-250w-motor.jpg'], tags:['研发','专利','品牌'], car:'', likes:128, age:24, c:[['xu','研发党'],['mo','硬核']] },

  // ===== 补充用户帖（拉满丰满度）=====
  { a:'zhang', pillar:'通勤实测', content:'通勤两个月，电费账单吓我一跳：9块。算笔账，以前开车一个月油费+停车小五百，现在电助力充电9块搞定，省下的钱够吃好几顿火锅了。', imgs:['banner/banner-op1.jpg','news/news-01-battery-passport.jpg'], tags:['通勤','省钱','电助力自行车'], car:'电助力自行车', likes:134, age:4, c:[['yan','省出火锅'],['bai','算账党']] },
  { a:'xu', pillar:'骑行生活', content:'滑板车折叠后塞进办公桌底，同事都问链接。黑色极简风不挑场合，立起来刚好不挡路。办公室角落多了一台「通勤神器」，大家都种草了。', imgs:['banner/banner-scooter.jpg','banner/banner-scooter.jpg'], tags:['电动滑板车','便携','通勤'], car:'电动滑板车', likes:95, age:10, c:[['kai','便携党'],['zhang','种草了']] },
  { a:'jie', pillar:'改装颜值', content:'给电助力加了挡泥板，雨天不再甩泥。前后挡泥一装，下雨天裤脚干干净净，通勤幸福感直线上升。小改装大不同，建议南方梅雨季必装。', imgs:['banner/banner-op3.jpg','news/news-04-250w-motor.jpg'], tags:['改装','雨天','配件'], car:'电助力自行车', likes:71, age:16, c:[['yan','雨季必备'],['lee','细节控']] },
  { a:'lee', pillar:'骑行生活', content:'绿道夜骑装备清单（附灯+反光）。前灯铺路、尾灯警示、车轮反光条、反光背心，全套下来夜骑也安心。新手别裸骑，安全装备一步到位。', imgs:['banner/banner-shot1.jpg','banner/banner-shot1.jpg'], tags:['夜骑','安全','装备'], car:'电助力自行车', likes:88, age:19, c:[['kai','夜骑安全'],['mo','背心必穿']] },
  { a:'yan', pillar:'改装颜值', content:'把通勤车做成复古咖啡车风，路人回头。米黄车架+木纹车筐+棕色把套，骑在路上像移动咖啡馆。颜值即正义，通勤也能很chill。', imgs:['banner/banner-op2.jpg','banner/banner-op3.jpg'], tags:['颜值','改装','生活'], car:'电助力自行车', likes:102, age:23, c:[['zhang','复古风绝'],['kai','chill']] },
  { a:'kai', pillar:'骑行生活', content:'近郊古镇一日游，电助力比开车舒服。青石板路限速巡航，巷子里钻来钻去不堵，停哪都方便。来回35km电量刚好，回程还顺路喝了杯茶。', imgs:['banner/banner-shot2.jpg','unsplash/photo-1588850561407-ed78c282e89b_w_600_q_80.jpg'], tags:['骑行','周末','生活'], car:'电助力自行车', likes:119, age:26, c:[['lee','古镇搭子'],['yan','松弛感']] },
  { a:'mo', pillar:'通勤实测', content:'电摩冬季续航实测：比夏天少18%。-3℃通勤一周，满电少跑约18%，锂电池低温通病。对策：停车库、出发前先暖车、少急加速。数据给北方兄弟参考。', imgs:['banner/banner-moto.jpg','news/news-01-battery-passport.jpg'], tags:['电摩','冬季','续航'], car:'电摩', likes:96, age:28, c:[['xu','保暖安排'],['zhang','北方泪目']] },
  { a:'bai', pillar:'新手攻略', content:'新手最常问：电助力需要驾照吗？多数城市按非机动车管理、无需驾照，但要看当地对时速/重量的红线；电摩普遍要证。买前查本地规定最稳，别被商家一句"不用证"带偏。', imgs:['banner/banner-op1.jpg','banner/banner-op2.jpg'], tags:['新手','政策','答疑'], car:'电助力自行车', likes:64, age:30, c:[['official','政策贴参考'],['kai','答疑党']] },
  { a:'zhang', pillar:'骑行生活', content:'半年骑行总结：腰不酸了，钱包也鼓了。从开车通勤到电助力，油费停车省下一大笔，顺带把小肚子骑没了。最值的一笔通勤投资，没有之一。', imgs:['banner/banner-op2.jpg','unsplash/photo-1593941707882-a5bba14938c7_w_600_q_80.jpg'], tags:['通勤','总结','生活'], car:'电助力自行车', likes:147, age:33, c:[['lee','总结到位'],['yan','钱包鼓了']] },
];

// ---- 清空内容/互动表（保留账号关系，仅清发现页内容）----
db.exec('DELETE FROM feeds;');
db.exec('DELETE FROM comments;');
db.exec('DELETE FROM feed_likes;');
db.exec('DELETE FROM favorites;');
db.exec('DELETE FROM footprints;');

const insFeed = db.prepare(`INSERT INTO feeds
  (nickname, device_id, member_user_id, avatar, content, images, tags, car_model, region_code, lat, lng, mentions, video_url, cover_url, created_at, kind, status, operator)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insComment = db.prepare(`INSERT INTO comments
  (feed_id, parent_id, device_id, member_user_id, nickname, avatar, content, created_at)
  VALUES (?,0,?,?,?,?,?,?)`);

// 按 age 升序插入（旧的先插，新的后插→ id 大→显示在发现流顶部）
const ordered = [...POSTS].sort((a, b) => a.age - b.age);
const nowTs = Date.now();
let feedN = 0, commentN = 0;

for (const p of ordered) {
  const isOfficial = p.a === 'official';
  const who = isOfficial ? OFFICIAL : PERSONAS[p.a];
  const deviceId = isOfficial ? '__official__' : 'seed_' + p.a;
  const created = new Date(nowTs - p.age * 86400000 - Math.floor(Math.random() * 180) * 60000).toISOString();
  const images = JSON.stringify((p.imgs || []).map(img));
  const tags = JSON.stringify((p.tags || []).slice(0, 5));
  const info = insFeed.run(
    who.name, deviceId, '', img(who.avatar), p.content, images, tags, p.car || '',
    'CN', '', '', '[]', '', '', created, isOfficial ? 'official' : 'user', 'published', ''
  );
  // 直接写可信点赞数（显示用）
  db.prepare('UPDATE feeds SET likes=? WHERE id=?').run(p.likes || 0, info.lastInsertRowid);
  feedN++;

  for (const cm of (p.c || [])) {
    const cwho = PERSONAS[cm[0]] || OFFICIAL;
    const cdev = cm[0] === 'official' ? '__official__' : 'seed_' + cm[0];
    const ctime = new Date(new Date(created).getTime() + (1 + Math.floor(Math.random() * 12)) * 3600000).toISOString();
    insComment.run(info.lastInsertRowid, cdev, '', cwho.name, img(cwho.avatar), cm[1], ctime);
    commentN++;
  }
}

console.log(`[seed-real-posts] 清空并灌入完成：feeds=${feedN}, comments=${commentN}`);
const total = db.prepare('SELECT COUNT(*) c FROM feeds').get().c;
const cmTotal = db.prepare('SELECT COUNT(*) c FROM comments').get().c;
console.log(`[seed-real-posts] 当前库：feeds=${total}, comments=${cmTotal}`);

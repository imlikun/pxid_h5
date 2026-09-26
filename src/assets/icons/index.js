// 快捷入口图标映射
// 四宫格主体改用 Lucide 成熟矢量库（bike / megaphone / bot / award），描边色 #4D7CFF 品牌蓝
// key 保持与 discoverQuick 数据一致（scissors/megaphone/headset/gift），仅替换图标源
// flame / sparkles / award(3d) 为动态卡片标签仍在用的 3D 图标，保留且 key 不变
import flame from './flame-3d.svg'
import sparkles from './sparkles-3d.svg'
import award3d from './award-3d.svg'
import scissors from './lucide-bike.svg'
import megaphone from './lucide-megaphone.svg'
import headset from './lucide-bot.svg'
import gift from './lucide-award.svg'

export const QUICK_ICON_SVG = {
  flame,
  sparkles,
  award: award3d,
  scissors,
  megaphone,
  headset,
  gift,
}

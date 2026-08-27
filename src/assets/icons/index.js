// 快捷入口 2.5D 彩色图标映射：icon 名 → 打包后的 SVG 资源 URL
// Vite 会将 .svg import 编译为带 hash 的资源 URL，可直接给 <img :src> 使用
import flame from './flame-3d.svg'
import sparkles from './sparkles-3d.svg'
import award from './award-3d.svg'
import scissors from './scissors-3d.svg'
import megaphone from './megaphone-3d.svg'
import headset from './headset-3d.svg'
import gift from './gift-3d.svg'

// 命中则渲染彩色 2.5D 图标；未命中（其它 IconSvg 名称）回退到线性单色 IconSvg
export const QUICK_ICON_SVG = {
  flame,
  sparkles,
  award,
  scissors,
  megaphone,
  headset,
  gift,
}

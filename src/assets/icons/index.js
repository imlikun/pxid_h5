// 快捷入口 3D 彩色图标映射：icon 名 → 打包后的 SVG 资源 URL
// Vite 会将 .svg import 编译为带 hash 的资源 URL，可直接给 <img :src> 使用
// 3D 彩色旧版保留在 ./scissors-3d.svg 等，按需可回退
import flame from './flame-3d.svg'
import sparkles from './sparkles-3d.svg'
import award from './award-3d.svg'
import scissors from './scissors-3d.svg'
import megaphone from './megaphone-3d.svg'
import headset from './headset-3d.svg'
import gift from './gift-3d.svg'

export const QUICK_ICON_SVG = {
  flame,
  sparkles,
  award,
  scissors,
  megaphone,
  headset,
  gift,
}

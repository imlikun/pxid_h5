// 快捷入口 Apple 风格线性单色图标映射：icon 名 → 打包后的 SVG 资源 URL
// Vite 会将 .svg import 编译为带 hash 的资源 URL，可直接给 <img :src> 使用
// 3D 彩色旧版保留在 ./scissors-3d.svg 等，按需可回退
import flame from './flame-3d.svg'
import sparkles from './sparkles-3d.svg'
import award from './award-3d.svg'
import scissors from './scissors-apple.svg'
import megaphone from './megaphone-apple.svg'
import headset from './headset-apple.svg'
import gift from './gift-apple.svg'

export const QUICK_ICON_SVG = {
  flame,
  sparkles,
  award,
  scissors,
  megaphone,
  headset,
  gift,
}

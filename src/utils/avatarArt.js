// Original vector portraits for default/seed avatars. All shapes and colors are
// local, small at 28px, and deterministic; no external avatar service is needed.
const riders = [
  { bg: '#EAF0FC', halo: '#D5E2FA', helmet: '#5279D9', light: '#A8C4FF', jacket: '#F2B95E', collar: '#FFF5E2', skin: '#DDA47C', hair: '#3E3431', beard: true },
  { bg: '#F7EDF1', halo: '#EFD7E2', helmet: '#BA718F', light: '#EFC1D1', jacket: '#819ED1', collar: '#EAF0FB', skin: '#F2C9AD', hair: '#5E3F39', long: true },
  { bg: '#E8F2EE', halo: '#D0E7DA', helmet: '#629A86', light: '#B4DACC', jacket: '#E59977', collar: '#FFEADD', skin: '#BD805F', hair: '#382C2B', glasses: true },
  { bg: '#FCF0E4', halo: '#F5DEC2', helmet: '#D89456', light: '#F5CBA1', jacket: '#618D9D', collar: '#E3F3F5', skin: '#F3C5A2', hair: '#59382E' },
  { bg: '#EFEBFA', halo: '#DDD7F0', helmet: '#9082BC', light: '#CFC5EA', jacket: '#C38D9C', collar: '#FCE9EE', skin: '#AC7558', hair: '#342B2C', long: true },
  { bg: '#EAF3F7', halo: '#D2E6ED', helmet: '#6C9BAF', light: '#B6D8E5', jacket: '#A98EBF', collar: '#F1E9F7', skin: '#F5D4B8', hair: '#6B4C3B', spectacles: true },
  { bg: '#F0F2E6', halo: '#DFE5CD', helmet: '#88956A', light: '#C8D3AB', jacket: '#BA785F', collar: '#FDEADC', skin: '#CF9670', hair: '#46352F', beard: true },
  { bg: '#F4EDF9', halo: '#E7D9F0', helmet: '#9E79BA', light: '#D7B9E9', jacket: '#76A5A0', collar: '#E4F4EE', skin: '#F1BFA5', hair: '#49393D', long: true },
]

export const riderAvatarCount = riders.length
export function riderAvatarSvg(index = 0) {
  const p = riders[((index % riders.length) + riders.length) % riders.length]
  const eyes = p.glasses
    ? `<path d="M29 41h14v8H31a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2Zm24 0h14a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4H53v-8Z" fill="#344652"/><path d="M43 44h10" stroke="#344652" stroke-width="3"/><path d="m31 43 7 0m18 0h7" stroke="#A6BCC7" stroke-width="1.5" stroke-linecap="round"/>`
    : `<path d="M33 44h3m24 0h3" stroke="#433637" stroke-width="2.8" stroke-linecap="round"/>${p.spectacles ? '<g fill="none" stroke="#5D5866" stroke-width="1.7"><rect x="28" y="39" width="15" height="12" rx="5"/><rect x="53" y="39" width="15" height="12" rx="5"/><path d="M43 44h10"/></g>' : ''}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
    <rect width="96" height="96" fill="${p.bg}"/>
    <circle cx="48" cy="41" r="35" fill="${p.halo}"/>
    <path d="M11 96V85c0-14 16-22 37-22s37 8 37 22v11" fill="${p.jacket}"/>
    ${p.long ? `<path d="M25 36c0-18 46-18 46 0v40c-5-2-9-5-11-10H36c-3 5-6 8-11 10V36Z" fill="${p.hair}"/>` : ''}
    <path d="M38 61v12c5 6 15 6 20 0V61" fill="${p.skin}"/>
    <path d="m33 67 15 10-10 9-10-15m35-4L48 77l10 9 10-15" fill="${p.collar}"/>
    <path d="M48 78v18" stroke="${p.collar}" stroke-width="2"/>
    <circle cx="26" cy="43" r="5" fill="${p.skin}"/><circle cx="70" cy="43" r="5" fill="${p.skin}"/>
    <path d="M26 34c0-17 44-17 44 0v13c0 15-10 24-22 24S26 62 26 47V34Z" fill="${p.skin}"/>
    <path d="M27 34v12l4-9 6-5h22l7 6 3 8V34" fill="${p.hair}"/>
    ${p.beard ? `<path d="M30 54c4 7 10 9 18 9s14-2 18-9c-2 11-8 16-18 16s-16-5-18-16" fill="${p.hair}" opacity=".5"/>` : ''}
    ${eyes}
    <path d="m47 47-2 7h4" stroke="#AF795E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M42 59c3 3 9 3 12 0" stroke="#805547" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M25 35 36 61m35-26L60 61" stroke="${p.helmet}" stroke-width="2.2" fill="none"/>
    <path d="M22 35c0-18 10-26 26-26s26 8 26 26l-5 3H27l-5-3Z" fill="${p.helmet}"/>
    <path d="M23 34h50" stroke="${p.light}" stroke-width="3" stroke-linecap="round"/>
    <g stroke="${p.light}" stroke-width="3" stroke-linecap="round"><path d="m35 18-3 9m16-11v10m13-8 3 9"/></g>
    <path d="m61 83 8 2" stroke="${p.collar}" stroke-width="3" stroke-linecap="round"/>
  </svg>`
}

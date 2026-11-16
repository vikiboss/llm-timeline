/** 色相保持不变，把亮度抬到深色背景下可见的区间 */
export function readableColor(hex: string, minLum = 0.45): string {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const lum = () => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  // 逐步向白色混合，直到达到最小亮度
  for (let i = 0; i < 20 && lum() < minLum; i++) {
    r = Math.round(r + (255 - r) * 0.18)
    g = Math.round(g + (255 - g) * 0.18)
    b = Math.round(b + (255 - b) * 0.18)
  }
  return `rgb(${r} ${g} ${b})`
}

// ============================================================
// PXID 真实在售车型（提取自产品参数表）
// 覆盖 电摩 / 电助力 / 电动滑板车 三条产品线
// 同名车型（如 P5 在电摩与电助力均有）用「系列 + 空格 + 代号」作展示名，便于区分
// 后续接后端车型接口时，整文件替换为 API 数据即可（保持导出名不变）
// ============================================================

export const CAR_SERIES = [
  { key: 'motorcycle', name: '电摩' },
  { key: 'ebike', name: '电助力' },
  { key: 'scooter', name: '电动滑板车' },
]

// 11 个在售车型
export const CAR_MODELS = [
  // 电摩
  { id: 'motorcycle-P5', series: 'motorcycle', seriesName: '电摩', code: 'P5', label: '电摩 P5' },
  { id: 'motorcycle-P8', series: 'motorcycle', seriesName: '电摩', code: 'P8', label: '电摩 P8' },
  { id: 'motorcycle-P7', series: 'motorcycle', seriesName: '电摩', code: 'P7', label: '电摩 P7' },
  // 电助力
  { id: 'ebike-P6', series: 'ebike', seriesName: '电助力', code: 'P6', label: '电助力 P6' },
  { id: 'ebike-P5', series: 'ebike', seriesName: '电助力', code: 'P5', label: '电助力 P5' },
  { id: 'ebike-P4', series: 'ebike', seriesName: '电助力', code: 'P4', label: '电助力 P4' },
  { id: 'ebike-P2', series: 'ebike', seriesName: '电助力', code: 'P2', label: '电助力 P2' },
  // 电动滑板车
  { id: 'scooter-F2', series: 'scooter', seriesName: '电动滑板车', code: 'F2', label: '滑板车 F2' },
  { id: 'scooter-F1', series: 'scooter', seriesName: '电动滑板车', code: 'F1', label: '滑板车 F1' },
  { id: 'scooter-P1', series: 'scooter', seriesName: '电动滑板车', code: 'P1', label: '滑板车 P1' },
  { id: 'scooter-P3', series: 'scooter', seriesName: '电动滑板车', code: 'P3', label: '滑板车 P3' },
]

// 展示名列表（用于 发现 chips / 发布车型选择 / 广场筛选）
export const CAR_MODEL_LABELS = CAR_MODELS.map((m) => m.label)

// 按系列分组（便于后续做分组 chips）
export const CAR_MODELS_BY_SERIES = CAR_SERIES.map((s) => ({
  ...s,
  models: CAR_MODELS.filter((m) => m.series === s.key),
}))

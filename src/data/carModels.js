// ============================================================
// PXID 真实在售车型（提取自产品参数表）
// 覆盖 电摩 / 电助力 / 电动滑板车 三条产品线
// UI 展示只用纯代号（P5/F1…），避免「电摩 P5」前缀拉长排版；同名 P5
// （电摩+电助力各一）会重复出现，用户可按需后续合并。
// 排序：按代号字母序，整体读起来短且整齐。
// 后续接后端车型接口时，整文件替换为 API 数据即可（保持导出名不变）。
// ============================================================

export const CAR_SERIES = [
  { key: 'motorcycle', name: '电摩' },
  { key: 'ebike', name: '电助力' },
  { key: 'scooter', name: '电动滑板车' },
]

// 11 个在售车型（按 code 字母序：F1 F2 P1 P2 P3 P4 P5 P5 P6 P7 P8）
export const CAR_MODELS = [
  // F 系列（电动滑板车）
  { id: 'scooter-F1', series: 'scooter', seriesName: '电动滑板车', code: 'F1', label: 'F1' },
  { id: 'scooter-F2', series: 'scooter', seriesName: '电动滑板车', code: 'F2', label: 'F2' },
  // P 系列
  { id: 'scooter-P1', series: 'scooter', seriesName: '电动滑板车', code: 'P1', label: 'P1' },
  { id: 'ebike-P2', series: 'ebike', seriesName: '电助力', code: 'P2', label: 'P2' },
  { id: 'scooter-P3', series: 'scooter', seriesName: '电动滑板车', code: 'P3', label: 'P3' },
  { id: 'ebike-P4', series: 'ebike', seriesName: '电助力', code: 'P4', label: 'P4' },
  { id: 'motorcycle-P5', series: 'motorcycle', seriesName: '电摩', code: 'P5', label: 'P5' },
  { id: 'ebike-P5', series: 'ebike', seriesName: '电助力', code: 'P5', label: 'P5' },
  { id: 'ebike-P6', series: 'ebike', seriesName: '电助力', code: 'P6', label: 'P6' },
  { id: 'motorcycle-P7', series: 'motorcycle', seriesName: '电摩', code: 'P7', label: 'P7' },
  { id: 'motorcycle-P8', series: 'motorcycle', seriesName: '电摩', code: 'P8', label: 'P8' },
]

// 展示名列表（用于 发现 chips / 发布车型选择 / 广场筛选）
export const CAR_MODEL_LABELS = CAR_MODELS.map((m) => m.label)

// 按系列分组（便于后续做分组 chips，当前暂未用）
export const CAR_MODELS_BY_SERIES = CAR_SERIES.map((s) => ({
  ...s,
  models: CAR_MODELS.filter((m) => m.series === s.key),
}))
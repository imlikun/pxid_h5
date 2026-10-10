// Dates without a time represent the whole local calendar day.
function dateTime(value, end = false) {
  if (!value) return NaN
  const text = String(value)
  const suffix = /^\d{4}-\d{2}-\d{2}$/.test(text) ? (end ? 'T23:59:59.999' : 'T00:00:00') : ''
  return new Date(text + suffix).getTime()
}

export function activityPhase(activity, now = Date.now()) {
  const start = dateTime(activity.startDate || activity.start_date)
  const end = dateTime(activity.endDate || activity.end_date, true)
  if (Number.isFinite(end) && end < now) return 'past'
  if (Number.isFinite(start) && start > now) return 'upcoming'
  if (Number.isFinite(start) && Number.isFinite(end)) return 'live'
  return 'undated'
}

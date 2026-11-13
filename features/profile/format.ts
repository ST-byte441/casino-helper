const MINUS = '−'

export function formatMoney(n: number): string {
  const s = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n < 0 ? `${MINUS}$${s}` : `$${s}`
}

export function formatSigned(n: number): string {
  if (n === 0) return '$0'
  return n > 0 ? `+$${n.toLocaleString('en-US')}` : formatMoney(n)
}

export function signColor(n: number): string {
  return n > 0 ? '#4caf50' : n < 0 ? '#ff5555' : '#fff'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(ts: number, withYear = true): string {
  const d = new Date(ts)
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return withYear ? `${base}, ${d.getFullYear()}` : base
}

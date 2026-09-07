const SCALE = 10_000_000n;

// Display approval amounts without converting to Number or hiding sub-cent value.
export function formatAmount(value: string): string {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,7})?$/.test(value)) return '—';
  const [whole, fraction = ''] = value.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}
// Exact decimal arithmetic: never use floating point for funding decisions.
export function units(value: string): bigint {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,7})?$/.test(value))
    throw new Error('Amount must be a positive decimal string with at most 7 decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(7, '0'));
}
export function decimal(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  return `${sign}${abs / SCALE}.${(abs % SCALE).toString().padStart(7, '0')}`;
}
export const max = (a: bigint, b: bigint) => (a > b ? a : b);
export const min = (a: bigint, b: bigint) => (a < b ? a : b);
export function shortfall(batch: string, reserve: string, balance: string, allocated = '0') {
  const raw = max(0n, units(batch) + units(reserve) + units(allocated) - units(balance));
  // USDT0 OFT uses 6 shared decimals. Round UP so the destination is never underfunded.
  return decimal(((raw + 9n) / 10n) * 10n);
}

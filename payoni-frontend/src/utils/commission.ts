/**
 * Komisyon/taksit hesaplama yardımcıları.
 *
 * Yansıtma (pass-through) formülü:
 *   GrossAmount = NetAmount / (1 - rate/100)
 *
 * Örnek: 100.000 TL net + %24.8 → 100.000 / 0.752 = 132.978,72 TL
 * Banka 132.978,72 × %24.8 = 32.978,72 TL keser → merchant 100.000 TL alır.
 */

export function grossUp(netAmount: number, rate: number): number {
  if (rate <= 0) return netAmount
  return netAmount / (1 - rate / 100)
}

export function monthlyAmount(totalAmount: number, installments: number): number {
  return totalAmount / installments
}

export function commissionAmount(grossAmount: number, rate: number): number {
  return grossAmount * (rate / 100)
}

export function formatCurrencyTR(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

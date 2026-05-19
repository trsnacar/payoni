const STATUS_LABELS: Record<string, string> = {
  captured: 'Başarılı',
  pending: 'Bekliyor',
  failed: 'Başarısız',
  cancelled: 'İptal',
  refunded: 'İade',
  authorized: 'Onaylı',
}

const STATUS_CLASSES: Record<string, string> = {
  captured: 'badge-success',
  pending: 'badge-pending',
  failed: 'badge-failed',
  cancelled: 'badge-failed',
  refunded: 'badge-refunded',
  authorized: 'badge-pending',
}

interface Props {
  status: string
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={STATUS_CLASSES[status] || 'badge-pending'}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

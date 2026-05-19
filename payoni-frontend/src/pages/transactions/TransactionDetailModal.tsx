import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, Transaction } from '../../api/transactions'
import { paymentsApi } from '../../api/payments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'

interface Props {
  transactionId: string | null
  onClose: () => void
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Bekliyor', variant: 'secondary' },
  captured: { label: 'Başarılı', variant: 'default' },
  failed: { label: 'Başarısız', variant: 'destructive' },
  cancelled: { label: 'İptal', variant: 'outline' },
  refunded: { label: 'İade', variant: 'outline' },
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-all">{value}</span>
    </div>
  )
}

export function TransactionDetailModal({ transactionId, onClose }: Props) {
  const queryClient = useQueryClient()
  const [refundAmount, setRefundAmount] = useState('')
  const [showRefundInput, setShowRefundInput] = useState(false)

  const { data: tx, isLoading } = useQuery<Transaction>({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionsApi.get(transactionId!),
    enabled: !!transactionId,
  })

  const cancelMutation = useMutation({
    mutationFn: () => paymentsApi.cancel(transactionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const refundMutation = useMutation({
    mutationFn: () => paymentsApi.refund(transactionId!, refundAmount ? parseFloat(refundAmount) : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowRefundInput(false)
      setRefundAmount('')
    },
  })

  const status = tx ? STATUS_LABELS[tx.status] ?? { label: tx.status, variant: 'secondary' as const } : null

  return (
    <Dialog open={!!transactionId} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>İşlem Detayı</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-muted-foreground text-sm">Yükleniyor…</div>
        )}

        {tx && (
          <div className="space-y-4">
            {/* Tutar ve durum */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {parseFloat(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {tx.currency}
                </p>
                {tx.installments > 1 && (
                  <p className="text-xs text-muted-foreground">{tx.installments} taksit</p>
                )}
              </div>
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
            </div>

            <Separator />

            {/* Kart bilgileri */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Kart</p>
              <Row label="Kart No" value={tx.card_last4 ? `•••• •••• •••• ${tx.card_last4}` : null} />
              <Row label="Marka" value={tx.card_brand} />
              <Row label="Kart Sahibi" value={tx.card_holder} />
            </div>

            {/* Müşteri */}
            {(tx.customer_name || tx.customer_email) && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Müşteri</p>
                  <Row label="Ad Soyad" value={tx.customer_name} />
                  <Row label="E-posta" value={tx.customer_email} />
                </div>
              </>
            )}

            <Separator />

            {/* Gateway bilgileri */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">İşlem Bilgileri</p>
              <Row label="İşlem ID" value={tx.id} />
              <Row label="Gateway TX ID" value={tx.gateway_tx_id} />
              <Row label="3D Secure" value={tx.is_3d ? `Evet${tx.three_d_status ? ` (${tx.three_d_status})` : ''}` : 'Hayır'} />
              <Row label="Açıklama" value={tx.description} />
              {tx.refunded_amount && parseFloat(tx.refunded_amount) > 0 && (
                <Row
                  label="İade Edilen"
                  value={`${parseFloat(tx.refunded_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${tx.currency}`}
                />
              )}
            </div>

            {/* Hata */}
            {(tx.error_code || tx.error_message) && (
              <>
                <Separator />
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {tx.error_code && <p className="font-medium">Hata Kodu: {tx.error_code}</p>}
                  {tx.error_message && <p>{tx.error_message}</p>}
                </div>
              </>
            )}

            <Separator />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Oluşturulma: {new Date(tx.created_at).toLocaleString('tr-TR')}</span>
              <span>Güncelleme: {new Date(tx.updated_at).toLocaleString('tr-TR')}</span>
            </div>

            {/* İade / İptal */}
            {(tx.status === 'captured' || tx.status === 'pending') && (
              <>
                <Separator />
                <div className="space-y-2">
                  {tx.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm('Bu işlemi iptal etmek istediğinizden emin misiniz?')) {
                          cancelMutation.mutate()
                        }
                      }}
                    >
                      {cancelMutation.isPending ? 'İptal ediliyor...' : 'İşlemi İptal Et'}
                    </Button>
                  )}
                  {tx.status === 'captured' && (
                    showRefundInput ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder={`Tutar (boş = tam iade: ${tx.amount} ${tx.currency})`}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={refundMutation.isPending}
                          onClick={() => refundMutation.mutate()}
                        >
                          {refundMutation.isPending ? 'İade...' : 'İade Et'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowRefundInput(false); setRefundAmount('') }}>
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowRefundInput(true)}
                      >
                        İade İşlemi Başlat
                      </Button>
                    )
                  )}
                  {(cancelMutation.isError || refundMutation.isError) && (
                    <p className="text-xs text-red-600 text-center">İşlem başarısız. Tekrar deneyin.</p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>Kapat</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

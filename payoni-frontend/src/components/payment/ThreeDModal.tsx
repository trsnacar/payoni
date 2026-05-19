import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { transactionsApi } from '@/api/transactions'

interface Props {
  transactionId: string
  htmlForm?: string
  redirectUrl?: string
  onSuccess: (txId: string) => void
  onFailure: (txId: string, errorMessage?: string) => void
  onClose: () => void
}

export function ThreeDModal({ transactionId, htmlForm, redirectUrl, onSuccess, onFailure, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [statusMessage, setStatusMessage] = useState('3D Secure doğrulama bekleniyor...')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Write HTML form into iframe
    if (htmlForm && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlForm)
        doc.close()
      }
    }
  }, [htmlForm])

  useEffect(() => {
    // Poll transaction status every 2 seconds
    pollRef.current = setInterval(async () => {
      try {
        const tx = await transactionsApi.get(transactionId)
        if (tx.status === 'captured' || (tx.status as string) === 'authorized') {
          clearInterval(pollRef.current!)
          setStatusMessage('Ödeme başarılı! Yönlendiriliyor...')
          setTimeout(() => onSuccess(transactionId), 1000)
        } else if (tx.status === 'failed' || tx.status === 'cancelled') {
          clearInterval(pollRef.current!)
          setStatusMessage('Ödeme başarısız.')
          setTimeout(() => onFailure(transactionId, tx.error_message), 1500)
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [transactionId, onSuccess, onFailure])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>3D Secure Doğrulama</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground px-4">{statusMessage}</p>

        {redirectUrl ? (
          <iframe
            ref={iframeRef}
            src={redirectUrl}
            className="flex-1 w-full border-0 rounded-b-lg"
            title="3D Secure"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
          />
        ) : (
          <iframe
            ref={iframeRef}
            className="flex-1 w-full border-0 rounded-b-lg"
            title="3D Secure"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeysApi, ApiKey, ApiKeyCreated } from '../../api/apiKeys'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

export function ApiKeysPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
  })

  const createMutation = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setCreatedKey(data)
      setCreateOpen(false)
      setNewKeyName('')
      setNewKeyExpiry('')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: apiKeysApi.revoke,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setRevokeId(null)
    },
  })

  async function copyKey() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey.full_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Anahtarları</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Entegrasyonlarınız için API anahtarı oluşturun ve yönetin.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Yeni Anahtar</Button>
      </div>

      {/* Yeni anahtar gösterimi */}
      {createdKey && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-700">
            API anahtarınız oluşturuldu — bunu şimdi kopyalayın, bir daha gösterilmeyecek.
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-background rounded px-3 py-2 border overflow-x-auto">
              {createdKey.full_key}
            </code>
            <Button size="sm" variant="outline" onClick={copyKey}>
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>
              Kapat
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Anahtar Öneki</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Son Kullanım</TableHead>
              <TableHead>Son Kullanma</TableHead>
              <TableHead>Oluşturulma</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Henüz API anahtarı oluşturulmadı.
                </TableCell>
              </TableRow>
            )}
            {keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted rounded px-1.5 py-0.5">{key.key_prefix}…</code>
                </TableCell>
                <TableCell>
                  <Badge variant={key.is_active ? 'default' : 'secondary'}>
                    {key.is_active ? 'Aktif' : 'İptal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('tr-TR') : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.expires_at ? new Date(key.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(key.created_at).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  {key.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeId(key.id)}
                    >
                      İptal Et
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Oluştur dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni API Anahtarı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Anahtar Adı</Label>
              <Input
                id="key-name"
                placeholder="ör. Üretim Entegrasyonu"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-expiry">Son Kullanma (opsiyonel)</Label>
              <Input
                id="key-expiry"
                type="datetime-local"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button
              disabled={!newKeyName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: newKeyName.trim(),
                  expires_at: newKeyExpiry || undefined,
                })
              }
            >
              {createMutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İptal onaydialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(isOpen) => !isOpen && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API Anahtarını İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              Bu anahtarı iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve
              anahtarı kullanan tüm entegrasyonlar çalışmayı durduracak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeId && revokeMutation.mutate(revokeId)}
            >
              İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

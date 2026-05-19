import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, XCircle, Star, Trash2, TestTube, Pencil } from 'lucide-react'
import { posAccountsApi, type PosAccount } from '@/api/posAccounts'
import { formatDate } from '@/utils/format'
import AddPOSAccountModal from './AddPOSAccountModal'

export default function POSAccountsPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editAccount, setEditAccount] = useState<PosAccount | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['pos-accounts'],
    queryFn: posAccountsApi.list,
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => posAccountsApi.test(id).then((r) => ({ ...r, id })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-accounts'] })
      setTestResult(data)
      setTimeout(() => setTestResult(null), 5000)
    },
    onError: (_err, id) => {
      setTestResult({ id, success: false, message: 'Bağlantı testi başarısız' })
      setTimeout(() => setTestResult(null), 5000)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => posAccountsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-accounts'] }),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => posAccountsApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-accounts'] }),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">POS Hesapları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sanal POS hesaplarınızı yönetin</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          POS Ekle
        </button>
      </div>

      {testResult && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span>
            <strong>{testResult.success ? '✓ Bağlantı başarılı' : '✗ Bağlantı başarısız'}:</strong>{' '}
            {testResult.message}
          </span>
          <button onClick={() => setTestResult(null)} className="ml-4 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {isLoading && (
        <div className="card p-8 text-center text-gray-400">Yükleniyor...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 capitalize">
                    {account.display_name || account.provider_slug}
                  </span>
                  {account.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                      <Star size={10} />
                      Varsayılan
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-0.5 block capitalize">
                  {account.provider_slug} · {account.environment}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {account.is_active ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-gray-300" />
                )}
              </div>
            </div>

            {account.last_tested_at && (
              <div className="text-xs text-gray-400 mb-3">
                Son test: {formatDate(account.last_tested_at)}
                {account.last_test_success !== null && (
                  <span className={account.last_test_success ? ' text-green-600' : ' text-red-500'}>
                    {account.last_test_success ? ' ✓ Başarılı' : ' ✗ Başarısız'}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => testMutation.mutate(account.id)}
                disabled={testMutation.isPending}
                className="btn-secondary text-xs flex items-center gap-1 flex-1 justify-center"
              >
                <TestTube size={13} />
                Test Et
              </button>

              {!account.is_default && (
                <button
                  onClick={() => setDefaultMutation.mutate(account.id)}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1 justify-center"
                >
                  <Star size={13} />
                  Varsayılan Yap
                </button>
              )}

              <button
                onClick={() => setEditAccount(account)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Düzenle"
              >
                <Pencil size={14} />
              </button>

              <button
                onClick={() => {
                  if (confirm('Bu POS hesabını silmek istediğinizden emin misiniz?')) {
                    deleteMutation.mutate(account.id)
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && !accounts.length && (
          <div className="col-span-full card p-12 text-center">
            <CreditCardIcon className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-medium">Henüz POS hesabı eklenmemiş</p>
            <p className="text-sm text-gray-400 mt-1">İlk POS hesabınızı ekleyin</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              POS Ekle
            </button>
          </div>
        )}
      </div>

      {showAdd && <AddPOSAccountModal onClose={() => setShowAdd(false)} />}
      {editAccount && (
        <AddPOSAccountModal
          onClose={() => setEditAccount(null)}
          editData={{
            id: editAccount.id,
            display_name: editAccount.display_name,
            environment: editAccount.environment,
          }}
        />
      )}
    </div>
  )
}

function CreditCardIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

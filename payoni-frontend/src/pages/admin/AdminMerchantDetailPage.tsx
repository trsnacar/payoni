import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, AdminDocument } from '@/api/admin'
import {
  ArrowLeft, CheckCircle, XCircle, FileText,
  ExternalLink, AlertTriangle, Building2, User
} from 'lucide-react'

const DOC_LABELS: Record<string, string> = {
  tax_plate: 'Vergi Levhası',
  signature_circular: 'İmza Sirküsü',
  id_front: 'Kimlik Ön Yüzü',
  id_back: 'Kimlik Arka Yüzü',
  trade_registry: 'Ticari Sicil Gazetesi',
}

const DOC_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const DOC_STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value || '—'}</span>
    </div>
  )
}

export default function AdminMerchantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: merchant, isLoading } = useQuery({
    queryKey: ['admin-merchant', id],
    queryFn: () => adminApi.getMerchant(id!),
  })

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveMerchant(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-merchant', id] })
      qc.invalidateQueries({ queryKey: ['admin-merchants'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectMerchant(id!, rejectReason),
    onSuccess: () => {
      setRejectOpen(false)
      setRejectReason('')
      qc.invalidateQueries({ queryKey: ['admin-merchant', id] })
      qc.invalidateQueries({ queryKey: ['admin-merchants'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const docStatusMutation = useMutation({
    mutationFn: ({ docId, status, reason }: { docId: string; status: 'approved' | 'rejected'; reason?: string }) =>
      adminApi.updateDocStatus(docId, status, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-merchant', id] }),
  })

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
  }
  if (!merchant) {
    return <div className="p-8 text-center text-gray-500">Merchant bulunamadı.</div>
  }

  const isApproved = merchant.onboarding_status === 'approved'
  const isRejected = merchant.onboarding_status === 'rejected'
  const canAct = !isApproved && !isRejected

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/merchants')}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{merchant.business_name}</h1>
          <p className="text-sm text-gray-500">{merchant.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isApproved && (
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-sm font-medium">
              <CheckCircle size={15} /> Onaylandı
            </span>
          )}
          {isRejected && (
            <span className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-sm font-medium">
              <XCircle size={15} /> Reddedildi
            </span>
          )}
          {canAct && (
            <>
              <button
                onClick={() => { if (confirm('Bu başvuruyu onaylamak istediğinize emin misiniz?')) approveMutation.mutate() }}
                disabled={approveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCircle size={15} />
                {approveMutation.isPending ? 'Onaylanıyor...' : 'Onayla'}
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-semibold transition-colors"
              >
                <XCircle size={15} />
                Reddet
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Şirket Bilgileri */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">Şirket Bilgileri</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Şirket Türü" value={merchant.company_type} />
            <InfoRow label="Vergi No" value={merchant.tax_id} />
            <InfoRow label="Vergi Dairesi" value={merchant.tax_office} />
            <InfoRow label="Ticaret Sicil No" value={merchant.trade_registry_no} />
            <div className="col-span-2">
              <InfoRow label="Şirket Adresi" value={merchant.company_address} />
            </div>
          </div>
        </div>

        {/* Yetkili Kişi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">Yetkili Kişi</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Ad Soyad" value={merchant.authorized_name} />
            <InfoRow label="Unvan" value={merchant.authorized_title} />
            <InfoRow label="Telefon" value={merchant.authorized_phone} />
            <InfoRow label="E-posta" value={merchant.email} />
          </div>
        </div>
      </div>

      {/* Belgeler */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={16} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-700">Yüklenen Belgeler</h2>
        </div>

        {merchant.documents.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Henüz belge yüklenmemiş</p>
        ) : (
          <div className="space-y-3">
            {merchant.documents.map((doc: AdminDocument) => (
              <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{DOC_LABELS[doc.document_type] ?? doc.document_type}</p>
                  <p className="text-xs text-gray-400 truncate">{doc.original_filename}</p>
                  {doc.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5">{doc.rejection_reason}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DOC_STATUS_STYLE[doc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {DOC_STATUS_LABEL[doc.status] ?? doc.status}
                </span>
                <a
                  href={`/uploads/${doc.file_path.replace(/^.*\/uploads\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <ExternalLink size={15} />
                </a>
                {canAct && doc.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => docStatusMutation.mutate({ docId: doc.id, status: 'approved' })}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Onayla"
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Red sebebi (opsiyonel):') ?? ''
                        docStatusMutation.mutate({ docId: doc.id, status: 'rejected', reason })
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Reddet"
                    >
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Red Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Başvuruyu Reddet</h3>
                <p className="text-sm text-gray-500">Merchant'a red sebebi bildirilecek</p>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red sebebini açıklayın..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectOpen(false); setRejectReason('') }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Reddediliyor...' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

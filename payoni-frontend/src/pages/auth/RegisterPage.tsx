import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, User, FileText, CheckCircle,
  ChevronRight, ChevronLeft, Upload, X, Zap, Eye, EyeOff,
} from 'lucide-react'
import { authApi } from '@/api/auth'
import { merchantsApi } from '@/api/merchants'
import { useAuthStore } from '@/store/authStore'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface CompanyForm {
  company_type: string
  business_name: string
  tax_id: string
  tax_office: string
  trade_registry_no: string
  company_address: string
}

interface PersonForm {
  authorized_name: string
  authorized_title: string
  authorized_tc: string
  authorized_phone: string
  email: string
  password: string
  confirm_password: string
}

type DocKey = 'tax_plate' | 'signature_circular' | 'id_front' | 'id_back' | 'trade_registry'

const DOC_LABELS: Record<DocKey, { label: string; hint: string }> = {
  tax_plate:           { label: 'Vergi Levhası',        hint: 'Son 1 yıla ait güncel vergi levhası' },
  signature_circular:  { label: 'İmza Sirküleri',       hint: 'Noter onaylı imza sirküsü' },
  id_front:            { label: 'Kimlik Ön Yüz',        hint: 'Yetkili kişinin TC kimlik kartı ön yüzü' },
  id_back:             { label: 'Kimlik Arka Yüz',      hint: 'Yetkili kişinin TC kimlik kartı arka yüzü' },
  trade_registry:      { label: 'Ticari Sicil Gazetesi', hint: 'Şirketin ticaret siciline kayıt ilanı' },
}

const COMPANY_TYPES = [
  { value: 'limited',   label: 'Limited Şirketi (Ltd. Şti.)' },
  { value: 'anonim',    label: 'Anonim Şirket (A.Ş.)' },
  { value: 'sahis',     label: 'Şahıs Firması' },
  { value: 'komandit',  label: 'Komandit Şirket' },
  { value: 'kollektif', label: 'Kolektif Şirket' },
]

const AUTHORIZED_TITLES = [
  'Müdür', 'Genel Müdür', 'Yönetim Kurulu Başkanı',
  'Yönetim Kurulu Üyesi', 'Ortak', 'Yetkili'
]

const STEPS = [
  { num: 1, icon: Building2, label: 'Şirket Bilgileri' },
  { num: 2, icon: User,      label: 'Yetkili Kişi' },
  { num: 3, icon: FileText,  label: 'Belgeler' },
  { num: 4, icon: CheckCircle, label: 'Özet' },
]

// ─── Document upload kartı ────────────────────────────────────────────────────

function DocCard({
  docKey, file, onSelect, onRemove,
}: {
  docKey: DocKey
  file: File | null
  onSelect: (f: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { label, hint } = DOC_LABELS[docKey]

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { alert('Dosya boyutu 10 MB\'ı aşamaz'); return }
    onSelect(f)
    e.target.value = ''
  }

  return (
    <div
      className={`border-2 rounded-xl p-4 transition-all ${
        file ? 'border-emerald-400 bg-emerald-50' : 'border-dashed border-gray-200 hover:border-indigo-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            file ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-400'
          }`}>
            {file ? <CheckCircle size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{label} <span className="text-red-500">*</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            {file && (
              <p className="text-xs text-emerald-700 font-medium mt-1 truncate max-w-[200px]">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
            {!file && (
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — Maks. 10 MB</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {file ? (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Upload size={12} />
              Seç
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onFile} />
    </div>
  )
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setAccessToken)

  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [company, setCompany] = useState<CompanyForm>({
    company_type: '', business_name: '', tax_id: '',
    tax_office: '', trade_registry_no: '', company_address: '',
  })
  const [person, setPerson] = useState<PersonForm>({
    authorized_name: '', authorized_title: '', authorized_tc: '',
    authorized_phone: '', email: '', password: '', confirm_password: '',
  })
  const [docs, setDocs] = useState<Record<DocKey, File | null>>({
    tax_plate: null, signature_circular: null,
    id_front: null, id_back: null, trade_registry: null,
  })

  const setC = (k: keyof CompanyForm, v: string) => {
    setCompany((p) => ({ ...p, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }
  const setP = (k: keyof PersonForm, v: string) => {
    setPerson((p) => ({ ...p, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  const validateStep1 = () => {
    const e: Record<string, string> = {}
    if (!company.company_type) e.company_type = 'Şirket türü seçiniz'
    if (!company.business_name.trim()) e.business_name = 'Ticaret unvanı zorunludur'
    if (!/^\d{10}$/.test(company.tax_id.trim())) e.tax_id = 'Vergi numarası 10 haneli sayı olmalıdır'
    if (!company.tax_office.trim()) e.tax_office = 'Vergi dairesi zorunludur'
    if (!company.trade_registry_no.trim()) e.trade_registry_no = 'Ticaret sicil no zorunludur'
    if (!company.company_address.trim()) e.company_address = 'Şirket adresi zorunludur'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e: Record<string, string> = {}
    if (!person.authorized_name.trim()) e.authorized_name = 'Ad soyad zorunludur'
    if (!person.authorized_title) e.authorized_title = 'Unvan seçiniz'
    if (!/^\d{11}$/.test(person.authorized_tc.trim())) e.authorized_tc = 'TC kimlik numarası 11 haneli sayı olmalıdır'
    if (!person.authorized_phone.trim()) e.authorized_phone = 'Telefon numarası zorunludur'
    if (!person.email.trim()) e.email = 'E-posta zorunludur'
    if (person.password.length < 8) e.password = 'Şifre en az 8 karakter olmalıdır'
    if (person.password !== person.confirm_password) e.confirm_password = 'Şifreler eşleşmiyor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep3 = () => {
    const missing = (Object.keys(docs) as DocKey[]).filter((k) => !docs[k])
    if (missing.length > 0) {
      setErrors({ _docs: `Eksik belgeler: ${missing.map((k) => DOC_LABELS[k].label).join(', ')}` })
      return false
    }
    return true
  }

  const handleNext = () => {
    setSubmitError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setStep((s) => s + 1)
    window.scrollTo(0, 0)
  }

  const handleBack = () => {
    setStep((s) => s - 1)
    setErrors({})
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setSubmitError('')
    try {
      // 1. Kayıt
      const res = await authApi.register({
        email: person.email,
        password: person.password,
        business_name: company.business_name,
        company_type: company.company_type,
        tax_id: company.tax_id,
        tax_office: company.tax_office,
        trade_registry_no: company.trade_registry_no,
        company_address: company.company_address,
        authorized_name: person.authorized_name,
        authorized_title: person.authorized_title,
        authorized_tc: person.authorized_tc,
        authorized_phone: person.authorized_phone,
      })
      setToken(res.access_token)

      // 2. Belge yüklemeleri
      for (const [docType, file] of Object.entries(docs)) {
        if (file) {
          await merchantsApi.uploadDocument(docType, file)
        }
      }

      navigate('/pending-verification')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setSubmitError(e.response?.data?.detail || 'Başvuru gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors ${
      errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500'
        : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
    }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Payoni</span>
        </Link>
        <p className="text-sm text-gray-500">
          Hesabınız var mı?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">
            Giriş Yap
          </Link>
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Başlık */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Kurumsal Başvuru</h1>
            <p className="text-gray-500 text-sm mt-2">
              Tüm alanları eksiksiz doldurun. Belgeleriniz incelendikten sonra hesabınız aktifleştirilecektir.
            </p>
          </div>

          {/* Adım göstergesi */}
          <div className="flex items-center justify-between mb-8 px-2">
            {STEPS.map(({ num, icon: Icon, label }, i) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    step > num
                      ? 'bg-emerald-500 text-white'
                      : step === num
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}>
                    {step > num ? <CheckCircle size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    step === num ? 'text-indigo-600' : step > num ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                    step > num ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Form kartı */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

            {/* ── Adım 1: Şirket Bilgileri ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Şirket Bilgileri</h2>
                  <p className="text-sm text-gray-500 mt-1">Şirketinize ait resmi bilgileri giriniz.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Şirket Türü <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={company.company_type}
                    onChange={(e) => setC('company_type', e.target.value)}
                    className={inputClass('company_type')}
                  >
                    <option value="">Seçiniz…</option>
                    {COMPANY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.company_type && <p className="text-red-500 text-xs mt-1">{errors.company_type}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ticaret Unvanı <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={company.business_name}
                    onChange={(e) => setC('business_name', e.target.value)}
                    className={inputClass('business_name')}
                    placeholder="Örn: Örnek Teknoloji Ltd. Şti."
                  />
                  {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vergi Numarası <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company.tax_id}
                      onChange={(e) => setC('tax_id', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={inputClass('tax_id')}
                      placeholder="10 haneli vergi no"
                      maxLength={10}
                    />
                    {errors.tax_id && <p className="text-red-500 text-xs mt-1">{errors.tax_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vergi Dairesi <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={company.tax_office}
                      onChange={(e) => setC('tax_office', e.target.value)}
                      className={inputClass('tax_office')}
                      placeholder="Örn: Kadıköy V.D."
                    />
                    {errors.tax_office && <p className="text-red-500 text-xs mt-1">{errors.tax_office}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ticaret Sicil Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={company.trade_registry_no}
                    onChange={(e) => setC('trade_registry_no', e.target.value)}
                    className={inputClass('trade_registry_no')}
                    placeholder="Ticaret sicil numaranızı giriniz"
                  />
                  {errors.trade_registry_no && <p className="text-red-500 text-xs mt-1">{errors.trade_registry_no}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Şirket Adresi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={company.company_address}
                    onChange={(e) => setC('company_address', e.target.value)}
                    className={`${inputClass('company_address')} min-h-[90px] resize-none`}
                    placeholder="Tam adres (mahalle, cadde/sokak, bina no, posta kodu, ilçe/il)"
                  />
                  {errors.company_address && <p className="text-red-500 text-xs mt-1">{errors.company_address}</p>}
                </div>
              </div>
            )}

            {/* ── Adım 2: Yetkili Kişi ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Yetkili Kişi & Hesap Bilgileri</h2>
                  <p className="text-sm text-gray-500 mt-1">Şirket adına işlem yapacak yetkili kişinin bilgileri.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Ad Soyad <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={person.authorized_name}
                      onChange={(e) => setP('authorized_name', e.target.value)}
                      className={inputClass('authorized_name')}
                      placeholder="Yetkili adı soyadı"
                    />
                    {errors.authorized_name && <p className="text-red-500 text-xs mt-1">{errors.authorized_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Unvan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={person.authorized_title}
                      onChange={(e) => setP('authorized_title', e.target.value)}
                      className={inputClass('authorized_title')}
                    >
                      <option value="">Seçiniz…</option>
                      {AUTHORIZED_TITLES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.authorized_title && <p className="text-red-500 text-xs mt-1">{errors.authorized_title}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      TC Kimlik Numarası <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={person.authorized_tc}
                      onChange={(e) => setP('authorized_tc', e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className={inputClass('authorized_tc')}
                      placeholder="11 haneli TC kimlik no"
                      maxLength={11}
                    />
                    {errors.authorized_tc && <p className="text-red-500 text-xs mt-1">{errors.authorized_tc}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cep Telefonu <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={person.authorized_phone}
                      onChange={(e) => setP('authorized_phone', e.target.value)}
                      className={inputClass('authorized_phone')}
                      placeholder="0530 000 00 00"
                    />
                    {errors.authorized_phone && <p className="text-red-500 text-xs mt-1">{errors.authorized_phone}</p>}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Hesap Bilgileri</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        E-posta Adresi <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={person.email}
                        onChange={(e) => setP('email', e.target.value)}
                        type="email"
                        className={inputClass('email')}
                        placeholder="sirket@ornek.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Şifre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            value={person.password}
                            onChange={(e) => setP('password', e.target.value)}
                            type={showPass ? 'text' : 'password'}
                            className={`${inputClass('password')} pr-10`}
                            placeholder="En az 8 karakter"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Şifre Tekrar <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            value={person.confirm_password}
                            onChange={(e) => setP('confirm_password', e.target.value)}
                            type={showConfirm ? 'text' : 'password'}
                            className={`${inputClass('confirm_password')} pr-10`}
                            placeholder="Şifreyi tekrar giriniz"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Adım 3: Belgeler ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Gerekli Belgeler</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Tüm belgeler zorunludur. PDF, JPG veya PNG formatında, maksimum 10 MB yükleyebilirsiniz.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <strong>Not:</strong> Yüklediğiniz belgeler gizlilik politikamız çerçevesinde korunmakta olup
                  yalnızca kimlik doğrulama amacıyla kullanılmaktadır.
                </div>

                <div className="space-y-3">
                  {(Object.keys(docs) as DocKey[]).map((key) => (
                    <DocCard
                      key={key}
                      docKey={key}
                      file={docs[key]}
                      onSelect={(f) => setDocs((d) => ({ ...d, [key]: f }))}
                      onRemove={() => setDocs((d) => ({ ...d, [key]: null }))}
                    />
                  ))}
                </div>

                {errors._docs && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {errors._docs}
                  </p>
                )}
              </div>
            )}

            {/* ── Adım 4: Özet ── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Başvuru Özeti</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Bilgilerinizi kontrol edin ve başvuruyu gönderin.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Şirket Bilgileri</h3>
                    <dl className="space-y-2">
                      {[
                        ['Şirket Türü', COMPANY_TYPES.find((t) => t.value === company.company_type)?.label || company.company_type],
                        ['Ticaret Unvanı', company.business_name],
                        ['Vergi No', company.tax_id],
                        ['Vergi Dairesi', company.tax_office],
                        ['Ticaret Sicil No', company.trade_registry_no],
                        ['Adres', company.company_address],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-4">
                          <dt className="text-xs text-gray-500 w-36 shrink-0">{k}</dt>
                          <dd className="text-sm text-gray-900 font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Yetkili Kişi</h3>
                    <dl className="space-y-2">
                      {[
                        ['Ad Soyad', person.authorized_name],
                        ['Unvan', person.authorized_title],
                        ['TC Kimlik No', person.authorized_tc],
                        ['Telefon', person.authorized_phone],
                        ['E-posta', person.email],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-4">
                          <dt className="text-xs text-gray-500 w-36 shrink-0">{k}</dt>
                          <dd className="text-sm text-gray-900 font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Yüklenen Belgeler</h3>
                    <ul className="space-y-2">
                      {(Object.keys(docs) as DocKey[]).map((key) => (
                        <li key={key} className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-sm text-gray-700">
                            <span className="font-medium">{DOC_LABELS[key].label}</span>
                            {docs[key] && (
                              <span className="text-gray-400 ml-2">— {docs[key]!.name}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800">
                  Başvurunuz gönderildikten sonra ekibimiz belgelerinizi inceleyecek ve
                  <strong> 1-3 iş günü</strong> içinde e-posta ile bildirim yapacaktır.
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {submitError}
                  </div>
                )}
              </div>
            )}

            {/* Butonlar */}
            <div className={`flex mt-8 pt-6 border-t border-gray-100 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  <ChevronLeft size={16} />
                  Geri
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-semibold shadow-sm"
                >
                  Devam Et
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all text-sm font-semibold shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Gönderiliyor…
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Başvuruyu Tamamla
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Başvurunuzu göndererek{' '}
            <a href="#" className="text-indigo-600 hover:underline">Kullanım Şartlarını</a>{' '}
            ve{' '}
            <a href="#" className="text-indigo-600 hover:underline">KVKK Politikasını</a>{' '}
            kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  )
}

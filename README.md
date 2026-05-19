# Payoni — Türk Ödeme Agregator Platformu

> iyzico, PayTR, MorPara ve 45+ Türk ödeme sağlayıcısını tek çatı altında toplayan, çok kiracılı (multi-tenant) ödeme yönetim platformu.

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| **48+ POS Entegrasyonu** | Garanti, İş Bankası, Akbank, Yapı Kredi, iyzico, PayTR, MorPara ve daha fazlası |
| **Ödeme Linkleri** | Benzersiz short-code URL'leri, taksit desteği, kullanım limiti, son kullanma tarihi |
| **Embed Widget** | Web sitelerine tek satır kod ile gömülebilir ödeme formu |
| **3D Secure** | Tüm banka kartları için 3DS akışı; NestPay/Asseco protokol desteği |
| **Webhook Sistemi** | Exponential backoff ile otomatik yeniden deneme; HMAC imzalı bildirimler |
| **Analitik** | Gelir grafikleri, provider başarı oranı, CSV export |
| **API Key Yönetimi** | Merchant API anahtarları ile programatik erişim |
| **AES-256-GCM Şifreleme** | POS credential'ları veritabanında şifreli saklanır |

---

## Ekran Görüntüleri

```
Dashboard → POS Hesapları → Ödeme Linkleri → İşlemler → Analitik
```

---

## Teknoloji Yığını

### Backend
- **FastAPI** — Async REST API
- **SQLAlchemy (async)** + **PostgreSQL** — Veritabanı
- **Redis** + **Celery** — Görev kuyruğu & webhook retry
- **Pydantic v2** — Request/response validasyonu
- **AES-256-GCM** — POS credential şifreleme
- **JWT (HS256)** — Kimlik doğrulama

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** — Server state yönetimi
- **Zustand** — Client state (persist ile sayfa yenileme koruması)
- **Recharts** — Analitik grafikler
- **React Hook Form** — Form validasyonu

---

## Kurulum

### Gereksinimler
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### 1. Backend

```bash
cd payoni-backend

# .env dosyasını oluşturun
cp .env.example .env
# Değerleri doldurun (aşağıya bakın)

# Docker Compose ile tüm servisleri başlatın
docker-compose up -d

# Veya manuel:
pip install poetry
poetry install
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (ayrı terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Celery beat (periyodik görevler için)
celery -A app.tasks.celery_app beat --loglevel=info
```

### 2. Frontend

```bash
cd payoni-frontend
npm install
npm run dev
```

Uygulama: **http://localhost:5173**  
API Docs: **http://localhost:8000/docs**

---

## Ortam Değişkenleri

`payoni-backend/.env` dosyasını oluşturun:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/payoni
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars
PAYONI_MASTER_KEY=your-32-byte-aes-key-here!!!
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL async bağlantı URL'si |
| `REDIS_URL` | Redis URL'si (Celery broker + token blacklist) |
| `SECRET_KEY` | JWT imzalama anahtarı (en az 32 karakter) |
| `PAYONI_MASTER_KEY` | AES-256-GCM şifreleme anahtarı (tam 32 byte) |
| `FRONTEND_URL` | CORS ve ödeme linki üretimi için |

---

## Proje Yapısı

```
Payoni/
├── payoni-backend/
│   ├── docker-compose.yml
│   ├── pyproject.toml
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── dependencies.py
│       ├── core/
│       │   ├── security.py        # JWT, API key hash
│       │   ├── encryption.py      # AES-256-GCM
│       │   ├── exceptions.py
│       │   └── middleware.py      # Rate limiting, request ID
│       ├── models/                # SQLAlchemy ORM modelleri
│       ├── schemas/               # Pydantic request/response
│       ├── api/
│       │   ├── v1/                # Auth, POS, Ödeme, Analitik, ...
│       │   └── public/            # /pay/{code}, /embed/{id}
│       ├── gateways/
│       │   ├── base.py            # AbstractBaseGateway
│       │   ├── factory.py         # 48 provider haritası
│       │   ├── banks/             # Garanti, İşbank, Akbank, ...
│       │   └── aggregators/       # iyzico, PayTR, MorPara, ...
│       ├── services/              # Orkestrasyon katmanı
│       └── tasks/                 # Celery görevleri
│
└── payoni-frontend/
    ├── public/
    │   └── embed.js               # Merchant sitesine gömülen snippet
    └── src/
        ├── api/                   # Axios tabanlı API istemcileri
        ├── store/                 # Zustand (auth, persist)
        ├── pages/
        │   ├── dashboard/
        │   ├── pos-accounts/
        │   ├── payment-links/
        │   ├── transactions/
        │   ├── widgets/
        │   ├── analytics/
        │   └── public/            # PaymentLinkPage, EmbedPage
        └── components/
            └── payment/           # ThreeDModal, CardInput, PaymentForm
```

---

## Desteklenen Ödeme Sağlayıcıları

### Bankalar (21)
Garanti BBVA · İş Bankası · Akbank · Yapı Kredi · Ziraat · VakıfBank · Denizbank · Halkbank · QNB Finansbank · TEB · ING · Odeabank · HSBC · Fibabanka · Şekerbank · Burgan Bank · Alternatif Bank · Albaraka · Kuveyt Türk · Türkiye Finans · Ziraat Katılım

### Ödeme Aracıları (16)
iyzico · PayTR · MorPara · Sipay · Paratika · Payten/Ingenico · Moka · AhlPay · Tami · MoneyTolia · RubikPara · Param · PayFix · ParibuNet · Paycell · OPay

---

## Güvenlik

- POS credential'ları **AES-256-GCM** ile şifreli, kart numarası **hiç saklanmaz**
- JWT refresh token **Redis blacklist** ile revoke edilebilir
- API endpoint'leri **Redis sliding window** rate limiting ile korunur
- Merchant izolasyonu: her sorgu `merchant_id` filtresi içerir
- Embed widget **CORS origin whitelist** ile korunur

---

## API Dokümantasyonu

Geliştirme modunda Swagger UI: `http://localhost:8000/docs`

### Temel Endpoint'ler

```
POST /api/v1/auth/register|login|refresh|logout
GET|PUT  /api/v1/merchants/me
GET|POST|PUT|DELETE /api/v1/pos-accounts
POST /api/v1/payments/charge
POST /api/v1/payments/{id}/cancel|refund
GET|POST|PUT|DELETE /api/v1/payment-links
GET  /api/v1/transactions?status=&search=&date_from=&date_to=
GET  /api/v1/transactions/export  (CSV — 15 sütun)
GET  /api/v1/analytics/summary|revenue|providers|success-rate
POST /webhooks/{provider_slug}/callback
GET|POST /pay/{short_code}
GET|POST /embed/{widget_id}
```

---

## Embed Widget Kullanımı

Merchant sitesine tek satır kod yapıştırın:

```html
<div id="payoni-widget" data-widget-id="wgt_xxxx" data-amount="150.00"></div>
<script src="https://payoni.com/embed.js"></script>
```

JavaScript callback'leri:
```js
window.Payoni.onSuccess((txId) => console.log('Ödeme başarılı:', txId))
window.Payoni.onError((msg) => console.error('Hata:', msg))
```

---

## Lisans

MIT

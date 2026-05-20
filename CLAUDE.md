# Payoni — Claude Code Talimatları

## Otomatik Git Push Kuralı

**Her geliştirme sonunda mutlaka şunları yap:**

1. Değişiklikleri `git add` ile stage et
2. Anlamlı bir Türkçe commit mesajı ile `git commit` yap
3. `git push` ile GitHub'a gönder

Repo: `https://github.com/trsnacar/payoni`  
Branch: `master`

### Commit Mesajı Formatı
```
<kısa özet>

- <değişiklik 1>
- <değişiklik 2>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Örnek
```bash
git add .
git commit -m "feat: TransactionsPage arama ve tarih filtresi eklendi"
git push
```

## Proje Hakkında

Türk ödeme agregator platformu. Backend: FastAPI + PostgreSQL + Redis + Celery. Frontend: React + TypeScript + Tailwind.

Çalışma dizini: `C:\Users\trusan\Desktop\Yazılım Projelerim\Payoni`

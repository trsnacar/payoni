"""
E-posta bildirimleri: kayıt, belge alındı, onay, red.
SMTP_HOST boşsa e-posta gönderilmez, sadece loglanır.
"""
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.tasks.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str) -> None:
    if not settings.SMTP_HOST:
        logger.info("[EMAIL SKIP] To: %s | Subject: %s (SMTP_HOST yapılandırılmamış)", to_email, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    try:
        if settings.SMTP_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        else:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        logger.info("[EMAIL SENT] To: %s | Subject: %s", to_email, subject)
    except Exception as e:
        logger.error("[EMAIL ERROR] To: %s | %s", to_email, e)
        raise


def _base_template(title: str, body: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:24px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px;padding:10px 14px;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">⚡ Payoni</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
          {body}
        </td></tr>
        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Bu e-posta Payoni tarafından otomatik olarak gönderilmiştir.<br>
            © 2026 Payoni — Türk Ödeme Agregator Platformu
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def send_registration_email(self, to_email: str, business_name: str):
    subject = "Payoni'ye Hoş Geldiniz!"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Hoş Geldiniz! 🎉</h2>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
        <strong>{business_name}</strong> adına Payoni'ye başarıyla kayıt oldunuz.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
          Sonraki adım olarak gerekli kurumsal belgelerinizi yükleyerek başvurunuzu tamamlayabilirsiniz.
          Ekibimiz belgelerinizi inceleyecek ve genellikle <strong>1–3 iş günü</strong> içinde
          hesabınızı aktifleştirecektir.
        </p>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Sorularınız için <a href="mailto:destek@payoni.com" style="color:#4f46e5;">destek@payoni.com</a> adresine yazabilirsiniz.
      </p>
    """
    try:
        _send(to_email, subject, _base_template(subject, body))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def send_documents_received_email(self, to_email: str, business_name: str):
    subject = "Belgeleriniz Alındı — İnceleme Başladı"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Belgeleriniz Alındı ✅</h2>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
        Merhaba <strong>{business_name}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;margin:0 0 20px;">
        Tüm belgeleriniz başarıyla sistemimize iletildi. Uzman ekibimiz başvurunuzu
        incelemeye aldı.
      </p>
      <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#065f46;font-size:14px;font-weight:600;">
          ⏱ Tahmini inceleme süresi: <span style="color:#047857;">1–3 iş günü</span>
        </p>
      </div>
      <p style="color:#475569;font-size:14px;margin:0 0 8px;">İnceleme tamamlandığında:</p>
      <ul style="color:#475569;font-size:14px;padding-left:20px;margin:0 0 24px;">
        <li>Başvurunuz onaylanırsa hesabınız aktifleştirilecek ve bilgilendirileceksiniz.</li>
        <li>Eksik veya hatalı belge varsa size bildirilecektir.</li>
      </ul>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Sorularınız için <a href="mailto:destek@payoni.com" style="color:#4f46e5;">destek@payoni.com</a> adresine yazabilirsiniz.
      </p>
    """
    try:
        _send(to_email, subject, _base_template(subject, body))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def send_approval_email(self, to_email: str, business_name: str):
    subject = "Başvurunuz Onaylandı — Hesabınız Aktif!"
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Tebrikler! Hesabınız Aktif 🚀</h2>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
        Merhaba <strong>{business_name}</strong>,
      </p>
      <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;color:#065f46;font-size:15px;font-weight:600;">
          ✅ Başvurunuz onaylandı ve hesabınız aktifleştirildi.
        </p>
      </div>
      <p style="color:#475569;font-size:15px;margin:0 0 24px;">
        Artık Payoni dashboard'una erişebilir, POS hesaplarınızı bağlayabilir ve
        ödeme almaya başlayabilirsiniz.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="{dashboard_url}"
           style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                  color:#fff;font-size:15px;font-weight:600;padding:14px 32px;
                  border-radius:12px;text-decoration:none;">
          Dashboard'a Git →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Yardım için <a href="mailto:destek@payoni.com" style="color:#4f46e5;">destek@payoni.com</a> adresine yazabilirsiniz.
      </p>
    """
    try:
        _send(to_email, subject, _base_template(subject, body))
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=60)
def send_rejection_email(self, to_email: str, business_name: str, reason: str):
    subject = "Başvurunuz Hakkında Bilgilendirme"
    register_url = f"{settings.FRONTEND_URL}/register"
    body = f"""
      <h2 style="margin:0 0 8px;color:#1e293b;font-size:22px;">Başvuru Sonucu</h2>
      <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
        Merhaba <strong>{business_name}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;margin:0 0 20px;">
        Başvurunuzu dikkatle inceledik. Maalesef bu aşamada başvurunuzu onaylayamıyoruz.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#991b1b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Red Sebebi</p>
        <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.6;">{reason}</p>
      </div>
      <p style="color:#475569;font-size:14px;margin:0 0 20px;">
        Belirtilen eksiklikleri gidererek yeniden başvurabilirsiniz.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="{register_url}"
           style="display:inline-block;background:#f1f5f9;color:#4f46e5;
                  font-size:14px;font-weight:600;padding:12px 28px;
                  border-radius:12px;text-decoration:none;border:1px solid #e2e8f0;">
          Yeniden Başvur
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        Sorularınız için <a href="mailto:destek@payoni.com" style="color:#4f46e5;">destek@payoni.com</a> adresine yazabilirsiniz.
      </p>
    """
    try:
        _send(to_email, subject, _base_template(subject, body))
    except Exception as exc:
        raise self.retry(exc=exc)

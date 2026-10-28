import nodemailer, { type Transporter } from "nodemailer";

export interface PointDeductionEmailOptions {
  toEmail: string;
  studentName: string;
  studentNim: number;
  prodi?: string;
  pillarName: string;
  severityName: string;
  delta: number; // e.g. -10 or -15
  scoreAfter: number;
  reason: string;
  category?: string; // e.g. "Ketidakhadiran (Absensi)" or "Pelanggaran Disiplin"
}

function getScoreCategory(score: number): { label: string; color: string; badgeBg: string; badgeText: string } {
  if (score >= 90) {
    return {
      label: "Sangat Baik (Konsisten menjaga budaya disiplin)",
      color: "#059669",
      badgeBg: "#ecfdf5",
      badgeText: "#065f46",
    };
  }
  if (score >= 75) {
    return {
      label: "Baik (Perlu tetap dipertahankan)",
      color: "#2563eb",
      badgeBg: "#eff6ff",
      badgeText: "#1e40af",
    };
  }
  if (score >= 60) {
    return {
      label: "Perlu Pembinaan (Memerlukan pembinaan lebih lanjut)",
      color: "#d97706",
      badgeBg: "#fffbeb",
      badgeText: "#92400e",
    };
  }
  return {
    label: "Tindak Lanjut Khusus (Memerlukan penanganan intensif oleh kampus)",
    color: "#dc2626",
    badgeBg: "#fef2f2",
    badgeText: "#991b1b",
  };
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Data dari file upload/DB tidak boleh masuk HTML email apa adanya.
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

let transporterInstance: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  if (!transporterInstance) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporterInstance;
}

export async function sendPointDeductionEmail(
  options: PointDeductionEmailOptions,
): Promise<{ sent: boolean; messageId?: string; simulated?: boolean }> {
  const {
    toEmail,
    studentName,
    studentNim,
    prodi = "Mahasiswa",
    pillarName,
    severityName,
    delta,
    scoreAfter,
    reason,
    category = "Pengurangan Poin Disiplin",
  } = options;

  if (!toEmail || !toEmail.includes("@")) {
    console.warn(`[Mailer] Email tidak valid atau kosong untuk NIM ${studentNim}: "${toEmail}". Pengiriman dilewati.`);
    return { sent: false };
  }

  const categoryInfo = getScoreCategory(scoreAfter);
  const deductionPoints = Math.abs(delta);
  const fromAddress = process.env.EMAIL_FROM || '"Budaya Disiplin Kampus" <no-reply@poltek-simas-berau.ac.id>';
  const subject = `[Pemberitahuan] Pengurangan Poin Budaya Disiplin - ${studentName} (${studentNim})`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">
                Sistem Budaya Disiplin Mahasiswa
              </h1>
              <p style="margin: 6px 0 0; color: #fecaca; font-size: 13px; font-weight: 500;">
                Pemberitahuan Resmi Pencatatan Pengurangan Poin
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
                Yth. Sdr/i <strong>${escapeHtml(studentName)}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                Kami informasikan bahwa terdapat pencatatan pengurangan poin budaya disiplin pada akun Anda berdasarkan data yang telah diverifikasi oleh bagian akademik / tim kedisiplinan kampus.
              </p>

              <!-- Box Poin -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px; text-align: center; border-right: 1px solid #fecaca;" width="50%">
                    <div style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em;">Poin Berkurang</div>
                    <div style="font-size: 28px; font-weight: 900; color: #b91c1c; margin-top: 4px;">-${deductionPoints}</div>
                  </td>
                  <td style="padding: 18px 20px; text-align: center;" width="50%">
                    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Sisa Saldo Poin</div>
                    <div style="font-size: 28px; font-weight: 900; color: #0f172a; margin-top: 4px;">${scoreAfter}</div>
                  </td>
                </tr>
              </table>

              <!-- Detail Pelanggaran -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em;">
                  Rincian Pelanggaran
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;">
                  <tr>
                    <td width="35%" style="color: #64748b; font-weight: 600;">NIM</td>
                    <td style="color: #0f172a; font-weight: 700;">: ${escapeHtml(studentNim)}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Program Studi</td>
                    <td style="color: #0f172a;">: ${escapeHtml(prodi)}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Pilar Disiplin</td>
                    <td style="color: #0f172a; font-weight: 700;">: ${escapeHtml(pillarName)}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Tingkat</td>
                    <td style="color: #0f172a;">: <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">${escapeHtml(severityName)}</span></td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600; vertical-align: top;">Keterangan</td>
                    <td style="color: #0f172a; font-weight: 600;">: ${escapeHtml(reason)}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Status Predikat</td>
                    <td style="color: ${categoryInfo.color}; font-weight: 700;">: ${categoryInfo.label}</td>
                  </tr>
                </table>
              </div>

              <!-- Edukasi & Tindak Lanjut -->
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #475569;">
                Harap senantiasa menjaga kedisiplinan dan tata tertib selama menempuh perkuliahan. Sanksi pembinaan bersifat edukatif untuk menumbuhkan etos disiplin profesional Anda.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px;">
                💡 <em>Jika Anda merasa terdapat kekeliruan data presensi atau catatan pelanggaran ini, silakan berkonsultasi dengan Dosen Pembimbing Akademik (DPA) Anda atau mengajukan formulir klarifikasi/sanggahan di Portal Budaya Disiplin Mahasiswa.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email ini dikirimkan secara otomatis oleh Sistem Budaya Disiplin Mahasiswa.<br>
                Mohon tidak membalas langsung ke alamat email ini (no-reply).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
[Pemberitahuan Resmi Pengurangan Poin Budaya Disiplin]

Yth. ${studentName} (NIM: ${studentNim}),
Program Studi: ${prodi}

Kami informasikan bahwa terdapat pencatatan pengurangan poin budaya disiplin pada akun Anda:
- Pilar Disiplin : ${pillarName}
- Tingkat        : ${severityName}
- Keterangan     : ${reason}
- Poin Berkurang : -${deductionPoints} Poin
- Sisa Saldo Poin: ${scoreAfter} Poin
- Status Predikat: ${categoryInfo.label}

Jika Anda merasa terdapat kekeliruan data, silakan berkonsultasi dengan Dosen Pembimbing Akademik (DPA) Anda atau mengajukan klarifikasi melalui Portal Budaya Disiplin Mahasiswa.

--
Sistem Budaya Disiplin Mahasiswa
(Email otomatis, mohon tidak membalas)
  `.trim();

  const transporter = getTransporter();

  if (!transporter) {
    // Mode Simulasi / Dev jika SMTP_HOST/SMTP_USER/SMTP_PASS belum diisi di .env
    console.info(`[Mailer (Dev/Simulated)] Notifikasi email pengurangan poin disimulasikan untuk:
  - Kepada      : ${toEmail} (${studentName} - NIM ${studentNim})
  - Subjek      : ${subject}
  - Berkurang   : -${deductionPoints} Poin (Sisa: ${scoreAfter})
  - Keterangan  : ${reason}
  * (Untuk mengirimkan email riil ke inbox, lengkapi SMTP_HOST, SMTP_USER, dan SMTP_PASS di file backend/.env)`);
    return { sent: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.info(`[Mailer] Notifikasi email berhasil terkirim ke ${toEmail} (Message ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Gagal mengirimkan email ke ${toEmail}:`, err);
    return { sent: false };
  }
}

export interface NotificationEmailOptions {
  toEmail: string;
  recipientName: string;
  judul: string;
  isi: string;
}

// Email umum untuk setiap baris Pemberitahuan / PemberitahuanStaf.
export async function sendNotificationEmail(
  options: NotificationEmailOptions,
): Promise<{ sent: boolean; messageId?: string; simulated?: boolean }> {
  const { toEmail, recipientName, judul, isi } = options;

  if (!toEmail || !toEmail.includes("@")) {
    console.warn(`[Mailer] Email tidak valid atau kosong untuk ${recipientName}: "${toEmail}". Pengiriman dilewati.`);
    return { sent: false };
  }

  const fromAddress = process.env.EMAIL_FROM || '"Budaya Disiplin Kampus" <no-reply@poltek-simas-berau.ac.id>';
  const subject = `[Pemberitahuan] ${judul}`;
  const portalUrl = process.env.PORTAL_URL?.trim();
  const portalLink = portalUrl || null;

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">Sistem Budaya Disiplin Mahasiswa</h1>
              <p style="margin: 6px 0 0; color: #fecaca; font-size: 13px;">Pemberitahuan Baru</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">Yth. <strong>${escapeHtml(recipientName)}</strong>,</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px; font-size: 15px; font-weight: 800; color: #0f172a;">${escapeHtml(judul)}</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569; white-space: pre-line;">${escapeHtml(isi)}</p>
              </div>
              ${portalLink
                ? `<p style="margin: 0; text-align: center;"><a href="${escapeHtml(portalLink)}" style="display: inline-block; background-color: #991b1b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 8px;">Buka Portal</a></p>`
                : `<p style="margin: 0; font-size: 13px; color: #64748b;">Silakan masuk ke Portal Budaya Disiplin untuk melihat detailnya.</p>`}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email ini dikirimkan secara otomatis oleh Sistem Budaya Disiplin Mahasiswa.<br>
                Mohon tidak membalas langsung ke alamat email ini (no-reply).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
Yth. ${recipientName},

${judul}

${isi}

${portalLink ? `Buka portal: ${portalLink}` : "Silakan masuk ke Portal Budaya Disiplin untuk melihat detailnya."}

--
Sistem Budaya Disiplin Mahasiswa
(Email otomatis, mohon tidak membalas)
  `.trim();

  const transporter = getTransporter();

  if (!transporter) {
    console.info(`[Mailer (Dev/Simulated)] Notifikasi email disimulasikan untuk:
  - Kepada : ${toEmail} (${recipientName})
  - Subjek : ${subject}
  * (Untuk mengirimkan email riil ke inbox, lengkapi SMTP_HOST, SMTP_USER, dan SMTP_PASS di file backend/.env)`);
    return { sent: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.info(`[Mailer] Notifikasi email berhasil terkirim ke ${toEmail} (Message ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Gagal mengirimkan email ke ${toEmail}:`, err);
    return { sent: false };
  }
}

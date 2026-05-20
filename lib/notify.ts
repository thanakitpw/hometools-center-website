import 'server-only';

const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.QUOTE_NOTIFY_EMAIL;
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_TARGET = process.env.LINE_NOTIFY_USER_ID;

export type QuoteNotification = {
  kind: 'quote' | 'contact';
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  message?: string | null;
  items?: Array<{ slug?: string; name?: string; qty?: number; note?: string }>;
  source_page?: string | null;
};

function buildHtml(n: QuoteNotification) {
  const label = n.kind === 'quote' ? 'ขอใบเสนอราคา' : 'ติดต่อจากเว็บไซต์';
  const itemsHtml = n.items?.length
    ? `<h3>รายการสินค้า</h3><ul>${n.items.map(i =>
        `<li>${escapeHtml(i.name || i.slug || '')}${i.qty ? ` × ${i.qty}` : ''}${i.note ? ` — ${escapeHtml(i.note)}` : ''}</li>`
      ).join('')}</ul>`
    : '';
  return `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>${label} — Home Tool Center</h2>
      <p><b>ชื่อ:</b> ${escapeHtml(n.name)}</p>
      <p><b>โทร:</b> ${escapeHtml(n.phone)}</p>
      ${n.email ? `<p><b>อีเมล:</b> ${escapeHtml(n.email)}</p>` : ''}
      ${n.company ? `<p><b>บริษัท:</b> ${escapeHtml(n.company)}</p>` : ''}
      ${n.message ? `<p><b>ข้อความ:</b><br>${escapeHtml(n.message).replace(/\n/g, '<br>')}</p>` : ''}
      ${itemsHtml}
      ${n.source_page ? `<p style="color:#666;font-size:12px;margin-top:24px;">หน้า: ${escapeHtml(n.source_page)}</p>` : ''}
    </div>`;
}

function buildLineText(n: QuoteNotification) {
  const label = n.kind === 'quote' ? '📋 ขอใบเสนอราคา' : '✉️ ติดต่อจากเว็บ';
  const lines = [
    `${label}`,
    `ชื่อ: ${n.name}`,
    `โทร: ${n.phone}`,
    n.email && `อีเมล: ${n.email}`,
    n.company && `บริษัท: ${n.company}`,
    n.message && `ข้อความ: ${n.message}`,
    n.items?.length && `รายการ:\n${n.items.map(i => `• ${i.name || i.slug || ''}${i.qty ? ` ×${i.qty}` : ''}`).join('\n')}`,
  ].filter(Boolean);
  return lines.join('\n');
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendEmail(n: QuoteNotification) {
  if (!RESEND_KEY || !NOTIFY_EMAIL) return { skipped: 'email' };
  const subject = n.kind === 'quote'
    ? `[Quote Request] ${n.name} — ${n.phone}`
    : `[Contact] ${n.name} — ${n.phone}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Home Tool Center <onboarding@resend.dev>', // change to verified domain later
      to: [NOTIFY_EMAIL],
      subject,
      html: buildHtml(n),
      reply_to: n.email || undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', text);
    return { error: text };
  }
  return { ok: true };
}

async function sendLine(n: QuoteNotification) {
  if (!LINE_TOKEN || !LINE_TARGET) return { skipped: 'line' };
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LINE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: LINE_TARGET,
      messages: [{ type: 'text', text: buildLineText(n) }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Line error:', text);
    return { error: text };
  }
  return { ok: true };
}

export async function notify(n: QuoteNotification) {
  const [email, line] = await Promise.allSettled([sendEmail(n), sendLine(n)]);
  return { email, line };
}

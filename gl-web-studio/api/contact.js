// Função serverless da Vercel: recebe o formulário e envia um e-mail via Resend.
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   RESEND_API_KEY -> chave da conta Resend (nunca no código público)
//   CONTACT_TO     -> e-mail onde recebe os pedidos
const CAMPOS = {
  nome: ['Nome', 100], email: ['E-mail', 150], telefone: ['Telefone', 40],
  negocio: ['Nome do negócio', 120], tipo_negocio: ['Tipo de negócio', 120],
  servico: ['Serviço pretendido', 60], tipo_website: ['Tipo de website', 60],
  mensagem: ['Mensagem', 2000]
};
const MAX_PEDIDO = 10000; // caracteres
const limpar = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let b = req.body;
  try {
    if (typeof b === 'string') {
      if (b.length > MAX_PEDIDO) return res.status(413).json({ ok: false });
      b = JSON.parse(b || '{}');
    }
  } catch (e) { return res.status(400).json({ ok: false }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ ok: false });
  if (JSON.stringify(b).length > MAX_PEDIDO) return res.status(413).json({ ok: false });
  if (b.bot) return res.status(200).json({ ok: true }); // anti-spam (campo escondido)

  const d = {};
  for (const k in CAMPOS) d[k] = limpar(b[k], CAMPOS[k][1]);
  if (!d.nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || !d.mensagem)
    return res.status(400).json({ ok: false });
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_TO) {
    console.error('contact: variáveis RESEND_API_KEY / CONTACT_TO em falta');
    return res.status(500).json({ ok: false });
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GL Web Studio <onboarding@resend.dev>',
        to: [process.env.CONTACT_TO],
        reply_to: d.email,
        subject: ('Novo pedido de orçamento — ' + d.nome).replace(/[\r\n]+/g, ' '),
        html: Object.keys(CAMPOS).map((k) => `<p><b>${CAMPOS[k][0]}:</b> ${esc(d[k]).replace(/\n/g, '<br>') || '-'}</p>`).join('')
      }),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    });
    if (!r.ok) console.error('contact: Resend respondeu', r.status);
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    console.error('contact:', e && e.name);
    return res.status(502).json({ ok: false });
  }
};

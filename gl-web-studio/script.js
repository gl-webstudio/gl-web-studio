// GL Web Studio — script.js
document.documentElement.classList.add('js');

// Compatibilidade: browsers mais antigos usam addListener em vez de addEventListener
const aoMudar = (mq, fn) => (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn));

// Menu móvel (☰ → ×)
const nav = document.getElementById('nav');
const menu = document.querySelector('.menu');
if (nav && menu) {
  const setMenu = (aberto) => {
    nav.classList.toggle('open', aberto);
    menu.setAttribute('aria-expanded', aberto);
    menu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  };
  menu.addEventListener('click', () => {
    const abrir = !nav.classList.contains('open');
    setMenu(abrir);
    if (abrir) nav.querySelector('a').focus();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !e.target.closest('.bar')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menu.focus(); }
  });
  aoMudar(matchMedia('(min-width:901px)'), (e) => { if (e.matches) setMenu(false); });
}

// Ano no rodapé
const ano = document.getElementById('ano');
if (ano) ano.textContent = new Date().getFullYear();

// Entrada suave das secções e botão WhatsApp flutuante (escondido junto do formulário)
const contacto = document.getElementById('contacto');
const fab = document.querySelector('.fab');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((x) => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll('main section:not(.hero) .wrap').forEach((el) => { el.classList.add('rv'); io.observe(el); });
  if (fab && contacto) {
    new IntersectionObserver(([x]) => fab.classList.toggle('hide', x.isIntersecting), { threshold: 0.15 }).observe(contacto);
  }
}

// Formulário: validação + envio para /api/contact (função da Vercel)
const form = document.getElementById('form');
const msg = document.getElementById('msg');
if (form && msg) {
  const say = (t, tipo) => { msg.textContent = t; msg.className = tipo || ''; };
  form.noValidate = true; // a validação é feita abaixo (sem JavaScript, o navegador valida sozinho)
  form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.querySelectorAll(':invalid').forEach((f) => f.setAttribute('aria-invalid', 'true'));
      form.reportValidity();
      return say('Verifique os campos assinalados e tente novamente.', 'err');
    }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'A enviar…';
    say('A enviar o seu pedido…');
    const dados = {};
    new FormData(form).forEach((v, k) => { dados[k] = v; });
    const ctl = window.AbortController ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 15000) : null;
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
        signal: ctl ? ctl.signal : undefined
      });
      if (r.status === 400) return say('Verifique os dados indicados e tente novamente.', 'err');
      if (!r.ok) throw new Error('falhou');
      form.reset();
      say('Pedido enviado com sucesso. Respondemos o mais brevemente possível.', 'ok');
    } catch (err) {
      say('Não foi possível enviar o pedido. Tente novamente ou contacte-nos por WhatsApp ou e-mail.', 'err');
    } finally {
      clearTimeout(t); btn.disabled = false; btn.textContent = 'Enviar pedido';
    }
  });
}

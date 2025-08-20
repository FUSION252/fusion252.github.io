/**
 * Fusion252 Mídia - Core JS
 * - Chat leve e funcional
 * - Hook para IA real (ativaremos na Vercel)
 * - Loaders de anúncios com fallback seguro
 */

// Abre/fecha chat
const launcher = () => {
  const panel = document.getElementById('chat-panel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
};

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('chat-launcher');
  if (btn) btn.addEventListener('click', launcher);
});

// Chat básico funcional (sem API)
async function sendMessage(){
  const input = document.getElementById('chat-text');
  if(!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = "";
  appendMsg('user', text);

  // Quando migrarmos, trocar por fetch('/api/ai', { body: text })
  const reply = aiLocalReply(text);
  appendMsg('bot', reply);
}

function appendMsg(role, text){
  const body = document.getElementById('chat-body');
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'user' ? 'user':'bot');
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

// Heurística local para manter UX funcional
function aiLocalReply(q){
  const lower = q.toLowerCase();
  if(lower.includes('olá')||lower.includes('hello')) return 'Olá! Como posso ajudar no site Fusion252 Mídia?';
  if(lower.includes('anúncio')||lower.includes('ads')) return 'Rodamos AdSense, Media.net e Monetag. Quer dicas de posicionamento?';
  if(lower.includes('contato')) return 'Você pode falar pelo formulário de contato ou e-mail fusion252@proton.me.';
  if(lower.includes('receita')) return 'Que tipo de receita você quer? Doce, salgada, fitness?';

  return 'Entendi sua mensagem! Nossa IA completa responde após a migração para Vercel. Por enquanto, posso orientar navegação e dúvidas gerais.';
}

// --- Loaders de anúncio ---
// AdSense
function loadAdSense(clientId){
  if(!clientId || clientId.includes('XXXX')) return; // evita erro sem ID
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(clientId);
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

function renderAds(){
  if(window.adsbygoogle){
    document.querySelectorAll('.adsbygoogle').forEach(el=>{
      try{ (adsbygoogle = window.adsbygoogle || []).push({}); }catch(e){}
    });
  }
}

// Media.net
function loadMediaNet(siteId){
  if(!siteId || siteId.includes('YOUR_MEDIA_NET_SITE_ID')) return;
  window._mNHandle = window._mNHandle || {};
  window._mNHandle.queue = window._mNHandle.queue || [];
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://contextual.media.net/dmedianet.js?cid=' + encodeURIComponent(siteId);
  document.head.appendChild(s);
}

// Monetag
function loadMonetag(tagUrl){
  if(!tagUrl || !/^https?:\/\//.test(tagUrl)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = tagUrl;
  document.head.appendChild(s);
}
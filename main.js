// === IARA ASSISTENTE VIRTUAL ===
// Modo automático + manual por voz + notícias NewsAPI

// === Widget visível ===
const iaraWidget = document.createElement("div");
iaraWidget.id = "iara-widget";
iaraWidget.innerHTML = `
  <div id="iara-status">🌙 Iara está dormindo</div>
  <button id="iara-btn">🎤 Falar</button>
`;
document.body.appendChild(iaraWidget);

// Estilos
const style = document.createElement("style");
style.innerHTML = `
  #iara-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 240px;
    background: #111827;
    color: #fff;
    border-radius: 12px;
    padding: 12px;
    font-family: system-ui, sans-serif;
    box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    z-index: 9999;
    text-align: center;
  }
  #iara-status {
    font-size: 14px;
    margin-bottom: 8px;
    color: #9aa4b2;
  }
  #iara-btn {
    background: #6ee7ff;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: bold;
  }
  #iara-noticias {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 320px;
    max-height: 400px;
    overflow-y: auto;
    background: #f9fafb;
    color: #111;
    border-radius: 12px;
    padding: 12px;
    font-family: system-ui, sans-serif;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    z-index: 9998;
  }
  .iara-card {
    margin-bottom: 10px;
    font-size: 14px;
  }
  .iara-card a {
    color: #2563eb;
    text-decoration: none;
    font-weight: bold;
  }
`;
document.head.appendChild(style);

// === Estado inicial ===
let iaraAtiva = false;

// === Funções principais ===
function acordarIara() {
  iaraAtiva = true;
  document.getElementById("iara-status").textContent = "✨ Iara está acordada!";
  alert("🔑 Iara ativada com sucesso!");
}

function adormecerIara() {
  iaraAtiva = false;
  document.getElementById("iara-status").textContent = "🌙 Iara está dormindo";
  alert("😴 Iara voltou para modo silencioso.");
}

// === Rotinas automáticas (sempre ativas) ===
function rotinaAutomatica() {
  console.log("🤖 Iara está rodando rotina automática...");
  // Aqui você pode plugar APIs de anúncios, buscar conteúdo novo etc.
}
setInterval(rotinaAutomatica, 6 * 60 * 60 * 1000);
rotinaAutomatica();

// === Busca de notícias na NewsAPI ===
async function buscarNoticias(termo) {
  const apiKey = "1918515472574c349f7c23720794e36e"; // sua chave
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(termo)}&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Remove notícias antigas se já existirem
    const antigo = document.getElementById("iara-noticias");
    if (antigo) antigo.remove();

    if (data.articles && data.articles.length > 0) {
      const container = document.createElement("div");
      container.id = "iara-noticias";
      container.innerHTML = "<h3>📰 Últimas notícias</h3>";

      data.articles.forEach(art => {
        const card = document.createElement("div");
        card.className = "iara-card";
        card.innerHTML = `
          <strong>${art.title}</strong><br>
          <em>${art.source.name}</em><br>
          <a href="${art.url}" target="_blank">Ler mais</a>
          <hr>
        `;
        container.appendChild(card);
      });

      document.body.appendChild(container);
    } else {
      alert("Nenhuma notícia encontrada.");
    }
  } catch (err) {
    console.error("Erro ao buscar notícias:", err);
    alert("Erro ao buscar notícias.");
  }
}

// === Reconhecimento de voz ===
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "pt-BR";

document.getElementById("iara-btn").addEventListener("click", () => {
  recognition.start();
});

recognition.onresult = (event) => {
  const comando = event.results[0][0].transcript.toLowerCase();
  console.log("🎤 Você disse:", comando);

  if (comando.includes("acordar iara")) {
    acordarIara();
  } else if (comando.includes("adormecer iara")) {
    adormecerIara();
  } else if (iaraAtiva) {
    if (comando.includes("notícia") || comando.includes("notícias")) {
      const termo = comando.replace("buscar notícias sobre", "").trim();
      buscarNoticias(termo || "últimas");
    } else {
      alert(`🤖 Iara recebeu o comando: ${comando}`);
    }
  } else {
    alert("❌ Iara está dormindo. Diga 'acordar Iara' para ativar.");
  }
};
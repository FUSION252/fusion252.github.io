/* ===========================
   IARA – UI + VOZ + CHAT
   (sem alterar seu index.html)
   ===========================

   O QUE ESTE ARQUIVO FAZ:
   - Cria bolinha flutuante "Iara" (arrastável).
   - Cria janela de chat (arrastável), minimalista e moderna.
   - Chat só abre com comando de voz: "acordar iara".
   - Fecha/minimiza com "adormecer iara".
   - Responde em texto + fala (speechSynthesis).
   - Mantém TODAS as rotinas já existentes.
     -> Se você já possuía um núcleo em window.IaraCore, ele é usado aqui.
        Ganchos suportados:
          - IaraCore.handleCommand(text) -> Promise<{text, html?}>
          - IaraCore.onAwake?() / IaraCore.onSleep?()
          - IaraCore.onMessage?({role, content})
          - IaraCore.init?(config)
   - Histórico em localStorage ("iara_history_v1").
   - Sem dependências externas.
*/

(function () {
  // ========= CONFIG =========
  const IARA_CONFIG = {
    // Se quiser exigir frase secreta junto ao "acordar iara", preencha abaixo (ex.: "estrela azul")
    // Para desativar, deixe como null.
    passphrase: (window.IARA_CONFIG && window.IARA_CONFIG.PASSPHRASE) || null,

    // Voz (TTS)
    tts: {
      enabled: true,
      lang: "pt-BR",
      rate: 1.0,
      pitch: 1.0
    },

    // Reconhecimento de voz
    asr: {
      lang: "pt-BR",
      continuous: true,
      interimResults: false
    },

    // IDs / classes
    ids: {
      fab: "iara-fab",
      chat: "iara-chat",
      header: "iara-chat-header",
      body: "iara-chat-body",
      input: "iara-chat-input",
      send: "iara-chat-send",
      mic: "iara-chat-mic",
      close: "iara-chat-close"
    }
  };

  // ========= UTIL =========
  const $ = (sel) => document.querySelector(sel);
  const create = (tag, props = {}, children = []) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    children.forEach((c) => el.appendChild(c));
    return el;
  };

  const speak = (text) => {
    try {
      if (!IARA_CONFIG.tts.enabled) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = IARA_CONFIG.tts.lang;
      utter.rate = IARA_CONFIG.tts.rate;
      utter.pitch = IARA_CONFIG.tts.pitch;
      window.speechSynthesis.cancel(); // evita fila enorme
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // silencioso
    }
  };

  const store = {
    key: "iara_history_v1",
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    save(items) {
      try {
        localStorage.setItem(this.key, JSON.stringify(items));
      } catch {}
    }
  };

  // ========= STATE =========
  let isAwake = false;     // Iara "ligada" (voz autorizou)
  let chatOpen = false;    // janela aberta
  let dragging = null;     // arraste atual
  let recognition = null;  // ASR
  let history = store.load();

  // ========= DOM INJECTION =========
  function injectUI() {
    // Bolinha (FAB)
    if (!document.getElementById(IARA_CONFIG.ids.fab)) {
      const fab = create("div", {
        id: IARA_CONFIG.ids.fab,
        className: "iara-fab",
        innerHTML: `<span>Iara</span>`
      });
      document.body.appendChild(fab);
      makeDraggable(fab);
      // Clique na bolinha NÃO abre o chat para terceiros.
      // Apenas se já estiver "isAwake" (após comando de voz seu), aí permite abrir/fechar.
      fab.addEventListener("click", () => {
        if (!isAwake) return; // silencioso para público
        toggleChat(true);
      });
    }

    // Chat
    if (!document.getElementById(IARA_CONFIG.ids.chat)) {
      const header = create("div", {
        id: IARA_CONFIG.ids.header,
        className: "iara-chat-header"
      });
      header.innerHTML = `
        <div class="iara-title">Iara</div>
        <div class="iara-actions">
          <button id="${IARA_CONFIG.ids.mic}" title="Falar com a Iara">🎤</button>
          <button id="${IARA_CONFIG.ids.close}" title="Minimizar">✖</button>
        </div>
      `;

      const body = create("div", {
        id: IARA_CONFIG.ids.body,
        className: "iara-chat-body"
      });

      const inputWrap = create("div", { className: "iara-chat-input-wrap" });
      inputWrap.innerHTML = `
        <input id="${IARA_CONFIG.ids.input}" type="text" placeholder="Escreva sua mensagem..." />
        <button id="${IARA_CONFIG.ids.send}" title="Enviar">➤</button>
      `;

      const chat = create("div", { id: IARA_CONFIG.ids.chat, className: "iara-chat hidden" }, [header, body, inputWrap]);
      document.body.appendChild(chat);

      // Arrastável pelo cabeçalho
      makeDraggable(chat, header);

      // Eventos
      $(`#${IARA_CONFIG.ids.close}`).addEventListener("click", () => {
        toggleChat(false);
        // Continua acordada, mas minimiza no bolinha
      });
      $(`#${IARA_CONFIG.ids.send}`).addEventListener("click", sendFromInput);
      $(`#${IARA_CONFIG.ids.input}`).addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendFromInput();
      });
      $(`#${IARA_CONFIG.ids.mic}`).addEventListener("click", () => {
        // Pressionar o mic força um ciclo de fala (se já estiver acordada)
        if (!isAwake) {
          tipSystem("Diga “acordar Iara” para ativar.");
          return;
        }
        tipSystem("Ouvindo… fale seu comando.");
      });

      // Carregar histórico
      history.forEach((m) => appendMessage(m.role, m.content, m.html));
      if (history.length === 0) {
        tipSystem('Diga **"acordar Iara"** para abrir. Depois, você pode falar ou digitar normalmente.');
      }
    }
  }

  function toggleChat(open) {
    const chat = $(`#${IARA_CONFIG.ids.chat}`);
    if (!chat) return;
    chat.classList.toggle("hidden", !open);
    chatOpen = open;
    if (open) chat.scrollTop = chat.scrollHeight;
  }

  function makeDraggable(el, handle) {
    const dragHandle = handle || el;
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0, draggingNow = false;

    const onDown = (e) => {
      draggingNow = true;
      const rect = el.getBoundingClientRect();
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onUp);
    };
    const onMove = (e) => {
      if (!draggingNow) return;
      const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
      el.style.left = (clientX - offsetX) + "px";
      el.style.top  = (clientY - offsetY) + "px";
      el.style.right = "auto"; // garante posição livre
      el.style.bottom = "auto";
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      draggingNow = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };

    dragHandle.addEventListener("mousedown", onDown);
    dragHandle.addEventListener("touchstart", onDown, { passive: true });
  }

  // ========= CHAT =========
  function appendMessage(role, content, html) {
    const body = $(`#${IARA_CONFIG.ids.body}`);
    if (!body) return;
    const wrap = create("div", { className: `iara-msg ${role}` });
    const bubble = create("div", { className: "iara-bubble" });

    if (html) {
      bubble.innerHTML = html;
    } else {
      bubble.textContent = content;
    }

    wrap.appendChild(bubble);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;

    // Histórico
    history.push({ role, content, html: html || null, at: Date.now() });
    store.save(history);
  }

  function tipSystem(text) {
    appendMessage("system", text);
  }

  function sendFromInput() {
    if (!isAwake) {
      tipSystem('Diga **"acordar Iara"** para ativar o painel.');
      return;
    }
    const inp = $(`#${IARA_CONFIG.ids.input}`);
    const val = (inp.value || "").trim();
    if (!val) return;
    inp.value = "";
    handleUserMessage(val);
  }

  async function handleUserMessage(text) {
    appendMessage("user", text);

    // Repasse opcional ao seu núcleo (se existir)
    if (window.IaraCore && typeof window.IaraCore.onMessage === "function") {
      try { window.IaraCore.onMessage({ role: "user", content: text }); } catch {}
    }

    // Se seu projeto já possui um cérebro: use-o
    if (window.IaraCore && typeof window.IaraCore.handleCommand === "function") {
      try {
        const res = await window.IaraCore.handleCommand(text);
        const outText = (res && res.text) ? res.text : String(res || "Pronto.");
        const outHtml = res && res.html ? res.html : null;
        appendMessage("assistant", outText, outHtml);
        speak(outText);
        return;
      } catch (e) {
        appendMessage("assistant", "Houve um erro ao processar o comando no núcleo existente.");
        return;
      }
    }

    // Fallback inteligente simples (caso não exista IaraCore):
    const reply = await fallbackBrain(text);
    appendMessage("assistant", reply);
    speak(reply);
  }

  // ========= FALLBACK BRAIN (simples) =========
  async function fallbackBrain(text) {
    // Regra básica: se pedir "notícia" sem IaraCore, responda orientação
    if (/notícia|noticias|news/i.test(text)) {
      return "Para buscar notícias em tempo real, conecte a Iara à sua NewsAPI no núcleo (IaraCore). Sem isso, posso escrever posts, responder dúvidas e organizar tarefas.";
    }
    if (/anúncio|ads|publicidade/i.test(text)) {
      return "Posso orientar como posicionar ou atualizar anúncios. Se seu núcleo (IaraCore) tiver automação, executo direto.";
    }
    if (/crie|escreva|faça|gerar|escrever/i.test(text)) {
      return "Certo! Descreva o que você quer (tema, tom e tamanho) que eu preparo aqui e você publica com 1 clique.";
    }
    return "Entendido! Posso executar sua solicitação. Se quiser que eu publique direto no site ou atualize anúncios, deixe isso claro no comando.";
  }

  // ========= VOZ (ASR) =========
  function initASR() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      tipSystem("Seu navegador não suporta reconhecimento de voz — o chat funciona por texto e a voz de resposta continua ativa.");
      return;
    }
    recognition = new SR();
    recognition.lang = IARA_CONFIG.asr.lang;
    recognition.continuous = IARA_CONFIG.asr.continuous;
    recognition.interimResults = IARA_CONFIG.asr.interimResults;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = (last[0].transcript || "").toLowerCase().trim();

      // Desperta: "acordar iara"
      if (transcript.includes("acordar iara")) {
        if (IARA_CONFIG.passphrase) {
          // se exigir frase secreta, ela deve estar no mesmo comando
          if (!transcript.includes(IARA_CONFIG.passphrase.toLowerCase())) {
            tipSystem("Frase secreta ausente. Repita com sua frase de acesso.");
            return;
          }
        }
        isAwake = true;
        if (window.IaraCore && typeof window.IaraCore.onAwake === "function") {
          try { window.IaraCore.onAwake(); } catch {}
        }
        toggleChat(true);
        appendMessage("assistant", "Pronta! O que você deseja fazer?");
        speak("Pronta! O que você deseja fazer?");
        return;
      }

      // Dorme: "adormecer iara"
      if (transcript.includes("adormecer iara")) {
        isAwake = false;
        if (window.IaraCore && typeof window.IaraCore.onSleep === "function") {
          try { window.IaraCore.onSleep(); } catch {}
        }
        toggleChat(false);
        speak("Até já.");
        return;
      }

      // Mensagem por voz, se acordada
      if (isAwake) {
        handleUserMessage(transcript);
      }
    };

    recognition.onerror = () => {
      // tenta religar suavemente
      try { recognition.stop(); } catch {}
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 1200);
    };
    recognition.onend = () => {
      // mantém contínuo
      try { recognition.start(); } catch {}
    };

    try { recognition.start(); } catch {}
  }

  // ========= INIT =========
  function init() {
    injectUI();

    // Integra o núcleo existente, se houver
    if (window.IaraCore && typeof window.IaraCore.init === "function") {
      try { window.IaraCore.init(IARA_CONFIG); } catch {}
    }

    initASR();

    // Deixa a bolinha visível desde o início (pública, mas inofensiva)
    const fab = $(`#${IARA_CONFIG.ids.fab}`);
    if (fab) {
      // posição inicial (canto inferior direito, sem fixar via CSS)
      if (!fab.style.left && !fab.style.right) {
        fab.style.right = "16px";
        fab.style.bottom = "16px";
      }
    }
  }

  // Aguarda o DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

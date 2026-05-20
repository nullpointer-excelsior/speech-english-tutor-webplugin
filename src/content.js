// Content script: injects translation popup into the page
(function () {
  if (globalThis.__ttsTranslationPopupLoaded) {
    return;
  }
  globalThis.__ttsTranslationPopupLoaded = true;

  let popup = null;
  let sourceText = "";
  let isPlaying = false;
  let currentTimeSeconds = 0;
  let durationSeconds = 0;

  function createPopup() {
    const el = document.createElement("div");
    el.id = "tts-translation-popup";
    el.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      max-width: 320px;
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #6c7086;
      border-radius: 10px;
      padding: 14px 16px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: none;
    `;

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move;user-select:none;";
    header.innerHTML = `
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a6adc8;pointer-events:none;">Translation</span>
      <button id="tts-popup-close" style="background:none;border:none;color:#a6adc8;cursor:pointer;font-size:16px;line-height:1;padding:0;">✕</button>
    `;

    const body = document.createElement("div");
    body.id = "tts-translation-body";
    body.textContent = "Loading…";

    const controls = document.createElement("div");
    controls.id = "tts-popup-controls";
    controls.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:12px;";
    controls.innerHTML = `
      <button id="tts-popup-play" style="background:#313244;border:1px solid #45475a;border-radius:8px;color:#cdd6f4;padding:6px 10px;cursor:pointer;font-size:12px;">Pause</button>
      <input id="tts-popup-progress" type="range" min="0" max="100" step="1" value="0" style="flex:1;accent-color:#89b4fa;cursor:pointer;" />
      <span id="tts-popup-time" style="font-size:11px;color:#a6adc8;min-width:72px;text-align:right;">0:00 / 0:00</span>
    `;

    el.appendChild(header);
    el.appendChild(body);
    el.appendChild(controls);
    document.body.appendChild(el);

    el.querySelector("#tts-popup-close").addEventListener("click", hidePopup);
    el.querySelector("#tts-popup-play").addEventListener("click", togglePlayback);
    el.querySelector("#tts-popup-progress").addEventListener("input", handleProgressInput);
    el.querySelector("#tts-popup-progress").addEventListener("change", handleProgressCommit);

    // Make popup draggable
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener("mousedown", (e) => {
      if (e.target.id === "tts-popup-close") return;
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      header.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      header.style.cursor = "move";
    });

    return el;
  }

  function showPopupTopRight({ reposition = true } = {}) {
    if (!popup) popup = createPopup();
    popup.style.display = "block";

    if (!reposition) {
      return;
    }

    const padding = 12;
    const popupWidth = popup.offsetWidth || 320;
    const left = Math.max(padding, window.innerWidth - popupWidth - padding);
    const top = padding;

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function hidePopup() {
    if (popup) {
      popup.style.display = "none";
      chrome.runtime.sendMessage({ type: "TTS_STOP" });
      resetPlaybackUi();
    }
  }

  function setPopupContent(text) {
    if (popup) {
      popup.querySelector("#tts-translation-body").textContent = text;
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function setPlayingState(playing) {
    isPlaying = Boolean(playing);
    if (!popup) return;

    const playButton = popup.querySelector("#tts-popup-play");
    playButton.textContent = isPlaying ? "Pause" : "Play";
  }

  function updateProgressUi(currentTime, duration) {
    currentTimeSeconds = Number.isFinite(currentTime) ? currentTime : 0;
    durationSeconds = Number.isFinite(duration) ? duration : 0;

    if (!popup) return;

    const progress = popup.querySelector("#tts-popup-progress");
    const time = popup.querySelector("#tts-popup-time");
    const progressValue = durationSeconds > 0 ? Math.round((currentTimeSeconds / durationSeconds) * 100) : 0;
    progress.value = String(Math.max(0, Math.min(100, progressValue)));
    time.textContent = `${formatTime(currentTimeSeconds)} / ${formatTime(durationSeconds)}`;
  }

  function resetPlaybackUi() {
    setPlayingState(false);
    updateProgressUi(0, 0);
  }

  function setSourceTextForPlayback(text) {
    sourceText = (text || "").trim();
    resetPlaybackUi();

    if (!popup) return;

    const playButton = popup.querySelector("#tts-popup-play");
    const progress = popup.querySelector("#tts-popup-progress");
    const disabled = sourceText.length === 0;
    playButton.disabled = disabled;
    progress.disabled = disabled;
  }

  function playSourceText() {
    if (!sourceText) return;

    chrome.runtime.sendMessage({
      type: "TTS_SPEAK",
      text: sourceText,
    });

    setPlayingState(true);
  }

  function togglePlayback() {
    if (!sourceText) return;

    if (isPlaying) {
      chrome.runtime.sendMessage({ type: "TTS_PAUSE" });
      setPlayingState(false);
      return;
    }

    const isFinished = durationSeconds > 0 && currentTimeSeconds >= durationSeconds;

    if (isFinished || durationSeconds === 0) {
      playSourceText();
      return;
    }

    chrome.runtime.sendMessage({ type: "TTS_RESUME" });
    setPlayingState(true);
  }

  function handleProgressInput(event) {
    if (!popup) return;

    const value = Number(event.target.value);
    const previewTime = durationSeconds > 0 ? (value / 100) * durationSeconds : 0;
    const time = popup.querySelector("#tts-popup-time");
    time.textContent = `${formatTime(previewTime)} / ${formatTime(durationSeconds)}`;
  }

  function handleProgressCommit(event) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;

    chrome.runtime.sendMessage({
      type: "TTS_SEEK",
      progress: Math.max(0, Math.min(100, value)),
    });
  }

  // Single listener routing all messages from the background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ alive: true });
      return true;
    }

    if (message.type === "SHOW_LOADING") {
      showPopupTopRight();
      setPopupContent("Loading…");
      setSourceTextForPlayback("");
      sendResponse({ received: true });
      return true;
    }

    if (message.type === "SHOW_TRANSLATION") {
      showPopupTopRight();
      setPopupContent("Translating…");
      setSourceTextForPlayback(message.text);
      playSourceText();

      chrome.runtime.sendMessage(
        { type: "TRANSLATE", text: message.text },
        (response) => {
          if (chrome.runtime.lastError) {
            setPopupContent("Error: " + chrome.runtime.lastError.message);
            return;
          }
          if (response.error) {
            setPopupContent("Error: " + response.error);
          } else {
            setPopupContent(response.translation);
          }
        }
      );

      sendResponse({ received: true });
      return true;
    }

    if (message.type === "OFFSCREEN_AUDIO_PROGRESS") {
      updateProgressUi(message.currentTime, message.duration);
      setPlayingState(!message.paused);
      sendResponse({ received: true });
      return true;
    }

    if (message.type === "OFFSCREEN_AUDIO_ENDED") {
      setPlayingState(false);
      updateProgressUi(message.duration, message.duration);
      sendResponse({ received: true });
      return true;
    }
  });

  // Close popup on outside click
  document.addEventListener("mousedown", (e) => {
    if (popup && popup.style.display !== "none" && !popup.contains(e.target)) {
      hidePopup();
    }
  });
})();

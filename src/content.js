// Content script: injects translation popup into the page
(function () {
  if (globalThis.__ttsTranslationPopupLoaded) {
    return;
  }
  globalThis.__ttsTranslationPopupLoaded = true;

  let popup = null;

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
      "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    header.innerHTML = `
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a6adc8;">Translation</span>
      <button id="tts-popup-close" style="background:none;border:none;color:#a6adc8;cursor:pointer;font-size:16px;line-height:1;padding:0;">✕</button>
    `;

    const body = document.createElement("div");
    body.id = "tts-translation-body";
    body.textContent = "Loading…";

    el.appendChild(header);
    el.appendChild(body);
    document.body.appendChild(el);

    el.querySelector("#tts-popup-close").addEventListener("click", hidePopup);
    return el;
  }

  function showPopup(x, y) {
    if (!popup) popup = createPopup();
    popup.style.display = "block";

    // Position near cursor, keep inside viewport
    const padding = 12;
    const pw = 320;
    const left = Math.min(x + padding, window.innerWidth - pw - padding);
    popup.style.left = `${left}px`;
    popup.style.top = `${y + padding}px`;
  }

  function hidePopup() {
    if (popup) popup.style.display = "none";
  }

  function setPopupContent(text) {
    if (popup) {
      popup.querySelector("#tts-translation-body").textContent = text;
    }
  }

  // Single listener routing all messages from the background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ alive: true });
      return true;
    }

    if (message.type === "SHOW_TRANSLATION") {
      const sel = window.getSelection();
      let x = window.innerWidth / 2;
      let y = 100;

      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        // Use viewport coordinates directly — popup is position:fixed
        x = rect.left;
        y = rect.bottom;
      }

      showPopup(x, y);
      setPopupContent("Translating…");

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
  });

  // Close popup on outside click
  document.addEventListener("mousedown", (e) => {
    if (popup && popup.style.display !== "none" && !popup.contains(e.target)) {
      hidePopup();
    }
  });
})();

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Content Script", () => {
  beforeEach(async () => {
    document.body.innerHTML = "";
    vi.resetModules();
    vi.clearAllMocks();
    
    // Reset the global flag to allow re-loading the script
    delete globalThis.__ttsTranslationPopupLoaded;

    await import("./content.js?t=" + Date.now());
    
    // Small delay to ensure DOM is updated
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it("does not inject the popup immediately on load (lazy initialization)", () => {
    const popup = document.getElementById("tts-translation-popup");
    expect(popup).toBeNull();
  });

  it("shows translation when SHOW_TRANSLATION message is received", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const sendResponse = vi.fn();

    const message = { type: "SHOW_TRANSLATION", text: "Hello" };
    onMessageListener(message, {}, sendResponse);

    const popup = document.getElementById("tts-translation-popup");
    expect(popup.style.display).toBe("block");
    
    const body = document.getElementById("tts-translation-body");
    expect(body.textContent).toBe("Translating…");

    // It should also send a TRANSLATE message to background
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRANSLATE", text: "Hello" }),
      expect.any(Function)
    );

    expect(popup.style.top).toBe("12px");
    expect(popup.style.right).toBe("12px");
  });

  it("keeps top-right margin after long translation content", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

    onMessageListener({ type: "SHOW_TRANSLATION", text: "Hello" }, {}, vi.fn());

    const translateCall = chrome.runtime.sendMessage.mock.calls.find(
      ([payload]) => payload?.type === "TRANSLATE"
    );
    const callback = translateCall[1];
    callback({ translation: "A".repeat(2000) });

    const popup = document.getElementById("tts-translation-popup");
    expect(popup.style.right).toBe("12px");
    expect(popup.style.top).toBe("12px");
  });

  it("closes the popup when close button is clicked", () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    onMessageListener({ type: "SHOW_TRANSLATION", text: "Hello" }, {}, vi.fn());

    const closeButton = document.getElementById("tts-popup-close");
    closeButton.click();

    const popup = document.getElementById("tts-translation-popup");
    expect(popup.style.display).toBe("none");
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "TTS_STOP" });
  });

  it("handles audio progress updates", () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    onMessageListener({ type: "SHOW_TRANSLATION", text: "Hello" }, {}, vi.fn());
    
    onMessageListener({
      type: "OFFSCREEN_AUDIO_PROGRESS",
      currentTime: 5,
      duration: 10,
      paused: false
    }, {}, vi.fn());

    const time = document.getElementById("tts-popup-time");
    expect(time.textContent).toContain("0:05 / 0:10");
    
    const playButton = document.getElementById("tts-popup-play");
    expect(playButton.textContent).toBe("Pause");
  });
});

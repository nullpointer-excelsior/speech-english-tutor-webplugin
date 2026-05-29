import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Offscreen Document", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Use a class for Blob mock
    global.Blob = class {
      constructor(content, options) {
        this.content = content;
        this.options = options;
      }
    };

    await import("./offscreen.js?t=" + Date.now());
  });

  it("handles AUDIO_PLAY message", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    const message = {
      target: "offscreen",
      type: "AUDIO_PLAY",
      audioBase64: "SGVsbG8=", // "Hello" in base64
      tabId: 123,
      format: "mp3",
    };

    onMessageListener(message);

    expect(global.atob).toHaveBeenCalledWith("SGVsbG8=");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.Audio).toHaveBeenCalled();
  });

  it("handles AUDIO_STOP message", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    // First start playing to have something to stop
    onMessageListener({
      target: "offscreen",
      type: "AUDIO_PLAY",
      audioBase64: "SGVsbG8=",
      tabId: 123,
      format: "mp3",
    });

    // Wait for the async playAudio to proceed to creating the Audio instance
    await vi.waitFor(() => {
      expect(global.Audio).toHaveBeenCalled();
    });

    onMessageListener({
      target: "offscreen",
      type: "AUDIO_STOP",
    });

    const audioInstance = global.Audio.mock.results[0].value;
    expect(audioInstance.pause).toHaveBeenCalled();
    expect(audioInstance.currentTime).toBe(0);
  });

  it("handles AUDIO_PAUSE and AUDIO_RESUME messages", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    onMessageListener({
      target: "offscreen",
      type: "AUDIO_PLAY",
      audioBase64: "SGVsbG8=",
      tabId: 123,
      format: "mp3",
    });

    await vi.waitFor(() => {
      expect(global.Audio).toHaveBeenCalled();
    });

    const audioInstance = global.Audio.mock.results[0].value;

    onMessageListener({ target: "offscreen", type: "AUDIO_PAUSE" });
    expect(audioInstance.pause).toHaveBeenCalled();

    onMessageListener({ target: "offscreen", type: "AUDIO_RESUME" });
    expect(audioInstance.play).toHaveBeenCalled();
  });

  it("rejects unknown format in AUDIO_PLAY", () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    onMessageListener({
      target: "offscreen",
      type: "AUDIO_PLAY",
      audioBase64: "SGVsbG8=",
      tabId: 123,
      format: "unknown",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Unsupported audio format:", "unknown");
    expect(global.Audio).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

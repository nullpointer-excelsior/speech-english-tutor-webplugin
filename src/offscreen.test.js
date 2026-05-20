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

  it("handles PLAY_AUDIO message", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    const message = {
      target: "offscreen",
      type: "PLAY_AUDIO",
      audioBase64: "SGVsbG8=", // "Hello" in base64
      tabId: 123
    };

    onMessageListener(message);

    expect(global.atob).toHaveBeenCalledWith("SGVsbG8=");
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.Audio).toHaveBeenCalled();
  });

  it("handles STOP_AUDIO message", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    // First start playing to have something to stop
    onMessageListener({
      target: "offscreen",
      type: "PLAY_AUDIO",
      audioBase64: "SGVsbG8=",
      tabId: 123
    });

    // Wait for the async playAudio to proceed to creating the Audio instance
    await vi.waitFor(() => {
      expect(global.Audio).toHaveBeenCalled();
    });

    onMessageListener({
      target: "offscreen",
      type: "STOP_AUDIO"
    });

    const audioInstance = global.Audio.mock.results[0].value;
    expect(audioInstance.pause).toHaveBeenCalled();
    expect(audioInstance.currentTime).toBe(0);
  });

  it("handles PAUSE_AUDIO and RESUME_AUDIO messages", async () => {
    const onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    
    onMessageListener({
      target: "offscreen",
      type: "PLAY_AUDIO",
      audioBase64: "SGVsbG8=",
      tabId: 123
    });

    await vi.waitFor(() => {
      expect(global.Audio).toHaveBeenCalled();
    });

    const audioInstance = global.Audio.mock.results[0].value;

    onMessageListener({ target: "offscreen", type: "PAUSE_AUDIO" });
    expect(audioInstance.pause).toHaveBeenCalled();

    onMessageListener({ target: "offscreen", type: "RESUME_AUDIO" });
    expect(audioInstance.play).toHaveBeenCalled();
  });
});

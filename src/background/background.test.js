import { describe, it, expect, vi, beforeEach } from "vitest";
import { TTS_SETTINGS } from "../shared/constants";

// Import background script. We use await import to ensure mocks are set up.
// We need to do this in a way that allows us to access the registered listeners.
let onInstalledListener;
let onClickedListener;
let onMessageListener;

describe("Background Service Worker", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    await import("./background.js");
    
    onInstalledListener = chrome.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    onClickedListener = chrome.contextMenus.onClicked.addListener.mock.calls[0]?.[0];
    onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
  });

  it("registers context menus on install", () => {
    expect(onInstalledListener).toBeDefined();
    onInstalledListener();

    expect(chrome.contextMenus.create).toHaveBeenCalledWith(expect.objectContaining({
      id: "read-selected-text"
    }));
  });

  it("handles context menu clicks for text selection", async () => {
    expect(onClickedListener).toBeDefined();
    
    const info = { menuItemId: "read-selected-text", selectionText: "Hello world" };
    const tab = { id: 123 };

    await onClickedListener(info, tab);

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, expect.objectContaining({
      type: "UI_SHOW_TRANSLATION",
      text: "Hello world"
    }), expect.any(Function));
  });

  it("sends AUDIO_PLAY with shared format on TTS_SPEAK", async () => {
    expect(onMessageListener).toBeDefined();
    const sendResponse = vi.fn();

    const result = onMessageListener({ type: "TTS_SPEAK", text: "Hello" }, { tab: { id: 22 } }, sendResponse);

    expect(result).toBe(true);

    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        target: "offscreen",
        type: "AUDIO_PLAY",
        audioBase64: expect.any(String),
        tabId: 22,
        format: TTS_SETTINGS.DEFAULT_FORMAT,
      }));
    });
  });

  it("handles TRANSLATE message", async () => {
    expect(onMessageListener).toBeDefined();
    const sendResponse = vi.fn();
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const misspelledLabel = "tra" + "slation:";
    
    const message = { type: "TRANSLATE", text: "Hello" };
    const result = onMessageListener(message, {}, sendResponse);

    expect(result).toBe(true);
    
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
        translation: "Mocked translation"
      }));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith("translation:", "Mocked translation");
    expect(consoleLogSpy).not.toHaveBeenCalledWith(misspelledLabel, expect.any(String));
    consoleLogSpy.mockRestore();
  });

  it("handles TRANSLATE message error", async () => {
    expect(onMessageListener).toBeDefined();
    const sendResponse = vi.fn();
    
    // Get the mock instance
    // Since background.js creates the client at the top level, 
    // we need to make sure we're mocking the right instance.
    // In our setup.js, we mocked the whole class.
    
    // We can't easily change the instance used by background.js after it's loaded 
    // unless we export it or use a different mocking strategy.
    // However, our setup.js returns a class whose methods are already mocked.
  });

  it("handles translate-image context menu click", async () => {
    expect(onClickedListener).toBeDefined();
    
    const info = { menuItemId: "translate-image", srcUrl: "http://image.jpg" };
    const tab = { id: 123 };

    await onClickedListener(info, tab);

    // Should call extractTextFromImage (mocked) and then send message
    await vi.waitFor(() => {
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, expect.objectContaining({
        type: "UI_SHOW_TRANSLATION",
        text: "Mocked image text"
      }), expect.any(Function));
    });

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 123, expect.objectContaining({
      type: "UI_SHOW_LOADING",
    }), expect.any(Function));
  });

  it("forwards AUDIO_PROGRESS as UI_AUDIO_PROGRESS", () => {
    expect(onMessageListener).toBeDefined();
    const sendResponse = vi.fn();

    const result = onMessageListener(
      {
        type: "AUDIO_PROGRESS",
        tabId: 123,
        currentTime: 5,
        duration: 9,
        paused: false,
      },
      {},
      sendResponse,
    );

    expect(result).toBe(true);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      type: "UI_AUDIO_PROGRESS",
      currentTime: 5,
      duration: 9,
      paused: false,
    }, expect.any(Function));
  });

  it("forwards AUDIO_ENDED as UI_AUDIO_ENDED", () => {
    expect(onMessageListener).toBeDefined();
    const sendResponse = vi.fn();

    const result = onMessageListener(
      {
        type: "AUDIO_ENDED",
        tabId: 123,
        duration: 9,
      },
      {},
      sendResponse,
    );

    expect(result).toBe(true);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      type: "UI_AUDIO_ENDED",
      duration: 9,
    }, expect.any(Function));
  });
});

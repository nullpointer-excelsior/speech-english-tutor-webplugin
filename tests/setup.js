import { vi } from "vitest";

// Mock Chrome API
const chromeMock = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    getContexts: vi.fn().mockResolvedValue([]),
    lastError: null,
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  tabs: {
    sendMessage: vi.fn((tabId, message, callback) => {
      if (callback) callback();
    }),
  },
  offscreen: {
    createDocument: vi.fn().mockResolvedValue(true),
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([{ result: true }]),
  },
};

vi.stubGlobal("chrome", chromeMock);

// Mock OpenAI
vi.mock("openai", () => {
  class MockOpenAI {
    constructor() {
      this.audio = {
        speech: {
          create: vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
          }),
        },
      };
      this.chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "Mocked translation" } }],
          }),
        },
      };
      this.responses = {
        create: vi.fn().mockResolvedValue({
          output_text: "Mocked image text",
        }),
      };
    }
  }
  return { default: MockOpenAI };
});

// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_OPENAI_API_KEY: "mock-key",
    },
  },
};

// Mock Audio
global.Audio = vi.fn().mockImplementation(function () {
  this.play = vi.fn().mockResolvedValue(undefined);
  this.pause = vi.fn();
  this.addEventListener = vi.fn();
  this.removeEventListener = vi.fn();
  this.currentTime = 0;
  this.duration = 10;
  this.paused = true;
});

// Mock URL methods
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

global.atob = vi.fn().mockReturnValue("mock-binary");
global.btoa = vi.fn().mockReturnValue("mock-base64");

// Background service worker: handles TTS and translation requests
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: false,
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Speak selected text",
    contexts: ["selection"],
  });
});

// Context menu click: speak text and request translation popup
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    chrome.tts.stop();
    chrome.tts.speak(info.selectionText, { rate: 1.0, enqueue: false });

    await ensureContentScript(tab.id);

    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_TRANSLATION",
      text: info.selectionText,
    });
  }
});

// Inject content script if not already present in the tab
async function ensureContentScript(tabId) {
  try {
    // Ping the content script — if it responds, it's already injected
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
  } catch {
    // No receiver → inject now
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"],
    });
  }
}

// Handle translation request from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "TRANSLATE") {
    translateText(message.text)
      .then((translation) => sendResponse({ translation }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep channel open for async response
  }
});

async function translateText(text) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a translator. Translate the given text to Spanish. Reply with only the translation, no explanations.",
      },
      { role: "user", content: text },
    ],
    max_tokens: 256,
  });
  const r = response.choices[0].message.content.trim();
  console.log("traslation:", r)
  return r
}

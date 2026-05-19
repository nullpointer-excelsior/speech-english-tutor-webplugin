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

    if (!tab?.id) {
      return;
    }

    await sendTranslationPopup(tab.id, info.selectionText);
  }
});

async function sendTranslationPopup(tabId, text) {
  const delivered = await trySendMessage(tabId, {
    type: "SHOW_TRANSLATION",
    text,
  });

  if (delivered) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"],
    });
  } catch {
    return;
  }

  await trySendMessage(tabId, {
    type: "SHOW_TRANSLATION",
    text,
  });
}

function trySendMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, () => {
      if (chrome.runtime.lastError) {
        console.warn("tabs.sendMessage failed:", chrome.runtime.lastError.message);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
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

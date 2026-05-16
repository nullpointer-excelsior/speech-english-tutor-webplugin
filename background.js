// Create the context menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Speak selected text",
    contexts: ["selection"]
  });
});

// Listen for clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    // Stop any ongoing speech before speaking new text
    chrome.tts.stop();

    // Speak the selected text
    chrome.tts.speak(info.selectionText, {
      rate: 1.0,
      enqueue: false
    });
  }
});

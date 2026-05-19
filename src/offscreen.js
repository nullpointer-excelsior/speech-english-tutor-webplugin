// Offscreen document: handles audio playback
let currentAudio = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;

  if (message.type === "PLAY_AUDIO") {
    playAudio(message.audioBase64);
  }

  if (message.type === "STOP_AUDIO") {
    stopAudio();
  }
});

async function playAudio(base64Audio) {
  stopAudio();

  try {
    const byteChars = atob(base64Audio);
    const byteArray = new Uint8Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i += 1) {
      byteArray[i] = byteChars.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);
    
    currentAudio.addEventListener("ended", () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    }, { once: true });

    currentAudio.addEventListener("error", (e) => {
      console.error("Offscreen audio playback error:", e);
      URL.revokeObjectURL(url);
      currentAudio = null;
    }, { once: true });

    await currentAudio.play();
  } catch (error) {
    console.error("Failed to play audio in offscreen:", error);
  }
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// Offscreen document: handles audio playback
let currentAudio = null;
let currentObjectUrl = null;
let currentTabId = null;
let progressIntervalId = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;

  if (message.type === "PLAY_AUDIO") {
    playAudio(message.audioBase64, message.tabId);
  }

  if (message.type === "STOP_AUDIO") {
    stopAudio();
  }

  if (message.type === "PAUSE_AUDIO") {
    pauseAudio();
  }

  if (message.type === "RESUME_AUDIO") {
    resumeAudio();
  }

  if (message.type === "SEEK_AUDIO") {
    seekAudio(message.progress);
  }
});

async function playAudio(base64Audio, tabId) {
  stopAudio();

  try {
    const byteChars = atob(base64Audio);
    const byteArray = new Uint8Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i += 1) {
      byteArray[i] = byteChars.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: "audio/mpeg" });
    const objectUrl = URL.createObjectURL(blob);

    currentAudio = new Audio(objectUrl);
    currentObjectUrl = objectUrl;
    currentTabId = Number.isInteger(tabId) ? tabId : null;
    startProgressLoop();
    
    currentAudio.addEventListener("ended", () => {
      sendPlaybackEnded();
      cleanupAudio();
    }, { once: true });

    currentAudio.addEventListener("error", (e) => {
      console.error("Offscreen audio playback error:", e);
      cleanupAudio();
    }, { once: true });

    await currentAudio.play();
  } catch (error) {
    console.error("Failed to play audio in offscreen:", error);
    cleanupAudio();
  }
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    sendPlaybackProgress();
  }

  cleanupAudio();
}

function pauseAudio() {
  if (!currentAudio) return;
  currentAudio.pause();
  sendPlaybackProgress();
}

async function resumeAudio() {
  if (!currentAudio) return;

  try {
    await currentAudio.play();
    sendPlaybackProgress();
  } catch (error) {
    console.error("Failed to resume audio in offscreen:", error);
  }
}

function seekAudio(progress) {
  if (!currentAudio || !Number.isFinite(progress) || !Number.isFinite(currentAudio.duration) || currentAudio.duration <= 0) {
    return;
  }

  const boundedProgress = Math.max(0, Math.min(100, progress));
  currentAudio.currentTime = (boundedProgress / 100) * currentAudio.duration;
  sendPlaybackProgress();
}

function startProgressLoop() {
  stopProgressLoop();
  progressIntervalId = setInterval(sendPlaybackProgress, 250);
}

function stopProgressLoop() {
  if (progressIntervalId === null) return;
  clearInterval(progressIntervalId);
  progressIntervalId = null;
}

function sendPlaybackProgress() {
  if (!Number.isInteger(currentTabId) || !currentAudio) return;

  chrome.runtime.sendMessage({
    type: "OFFSCREEN_AUDIO_PROGRESS",
    tabId: currentTabId,
    currentTime: Number.isFinite(currentAudio.currentTime) ? currentAudio.currentTime : 0,
    duration: Number.isFinite(currentAudio.duration) ? currentAudio.duration : 0,
    paused: currentAudio.paused,
  });
}

function sendPlaybackEnded() {
  if (!Number.isInteger(currentTabId) || !currentAudio) return;

  chrome.runtime.sendMessage({
    type: "OFFSCREEN_AUDIO_ENDED",
    tabId: currentTabId,
    duration: Number.isFinite(currentAudio.duration) ? currentAudio.duration : 0,
  });
}

function cleanupAudio() {
  stopProgressLoop();

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  currentAudio = null;
  currentTabId = null;
}

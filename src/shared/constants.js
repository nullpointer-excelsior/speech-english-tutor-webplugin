export const AUDIO_MIME_TYPES = {
  mp3: "audio/mpeg",
  opus: "audio/opus",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
};

export const TTS_SETTINGS = {
  DEFAULT_FORMAT: "mp3",
  DEFAULT_VOICE: "marin",
  DEFAULT_MODEL: "gpt-4o-mini-tts",
};

export const UI_STATES = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  READY: "READY",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
};

export const POPUP_PADDING = 12;

export const MESSAGES = {
  // UI -> Background
  TTS_SPEAK: "TTS_SPEAK",
  TTS_PAUSE: "TTS_PAUSE",
  TTS_RESUME: "TTS_RESUME",
  TTS_STOP: "TTS_STOP",
  TTS_SEEK: "TTS_SEEK",
  TRANSLATE: "TRANSLATE",
  
  // Background -> UI
  UI_SHOW_LOADING: "UI_SHOW_LOADING",
  UI_SHOW_TRANSLATION: "UI_SHOW_TRANSLATION",
  UI_AUDIO_PROGRESS: "UI_AUDIO_PROGRESS",
  UI_AUDIO_ENDED: "UI_AUDIO_ENDED",

  // Background -> Offscreen
  AUDIO_PLAY: "AUDIO_PLAY",
  AUDIO_STOP: "AUDIO_STOP",
  AUDIO_PAUSE: "AUDIO_PAUSE",
  AUDIO_RESUME: "AUDIO_RESUME",
  AUDIO_SEEK: "AUDIO_SEEK",

  // Offscreen -> Background
  AUDIO_PROGRESS: "AUDIO_PROGRESS",
  AUDIO_ENDED: "AUDIO_ENDED"
};

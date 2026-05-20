import { describe, expect, it } from "vitest";

import { AUDIO_MIME_TYPES, TTS_SETTINGS } from "./constants";

describe("constants", () => {
  it("defines supported audio MIME types", () => {
    expect(AUDIO_MIME_TYPES).toEqual({
      mp3: "audio/mpeg",
      opus: "audio/opus",
      aac: "audio/aac",
      flac: "audio/flac",
      wav: "audio/wav",
    });
  });

  it("defines TTS defaults", () => {
    expect(TTS_SETTINGS).toEqual({
      DEFAULT_FORMAT: "mp3",
      DEFAULT_VOICE: "marin",
      DEFAULT_MODEL: "gpt-4o-mini-tts",
    });
  });
});

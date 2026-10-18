import { describe, expect, it } from "vitest";
import { enlaceVideo, idYoutube } from "./video";

describe("idYoutube", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=10",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ])("reconoce %s", (url) => {
    expect(idYoutube(url)).toBe("dQw4w9WgXcQ");
  });

  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=corto",
    "https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "no es una url",
  ])("rechaza %s", (url) => {
    expect(idYoutube(url)).toBeUndefined();
  });
});

describe("enlaceVideo", () => {
  it("normaliza YouTube e Instagram", () => {
    expect(enlaceVideo(" https://youtu.be/dQw4w9WgXcQ?t=10 ")).toEqual({
      fuente: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(enlaceVideo("https://instagram.com/reels/DdUGySaIYsG")).toEqual({
      fuente: "INSTAGRAM",
      url: "https://www.instagram.com/reel/DdUGySaIYsG/",
    });
    expect(enlaceVideo("https://www.instagram.com/p/DdS3mOfFocQ/?igsh=x")?.fuente).toBe(
      "INSTAGRAM",
    );
  });

  it.each([
    "https://www.instagram.com/alcaldia_iribarren/",
    "http://instagram.com/p/abc/",
    "https://evil.com/instagram.com/p/abc/",
    "https://vimeo.com/123456",
    "",
  ])("rechaza %s", (url) => {
    expect(enlaceVideo(url)).toBeUndefined();
  });
});

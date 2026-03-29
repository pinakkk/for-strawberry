# For My Cutie Inayu 🥹💖

A small interactive 3D love-letter experience built with Three.js. It renders a glossy pulsating 3D heart with floating particles and animated text, syncs word-by-word lyrics to music, and includes a styled letter modal. Designed to run in the browser with smooth animations and mobile-friendly UI.

- Stack: HTML, CSS, JavaScript, Three.js (r128), OrbitControls, FontLoader, TextGeometry
- Effects: Pulsating 3D heart, floating mini-hearts/notes, animated lights, word-by-word lyric reveal, cinematic camera intro, “I Love You” 3D text
- UI: Play/Pause music, toggle pulse, reset camera, open letter modal

## Features
- 3D heart with music-reactive pulsation and dynamic lighting
- Floating mini-hearts and decorative 3D texts around the scene
- Word-by-word lyric animation timed to your audio
- Cinematic camera intro with OrbitControls after intro
- Letter modal (💌) with polished paper styling and gentle animations
- Mobile responsive lyrics and modal
- Simple watermark/integrity check

## Project structure
- index.html — main page, UI controls, watermark badge/integrity script
- assets/style.css — layout, controls, lyrics, letter modal, responsive rules
- assets/heart.js — Three.js scene, animations, audio/lyrics logic
- license — Apache License 2.0
- README.md — this file
- music.mp3 — place your audio file in the project root (same folder as index.html)

## Getting started
1. Place your audio at:
   - c:\Users\91767\OneDrive\Desktop\for-strawberry\music.mp3
   The code expects ./music.mp3 relative to index.html.
2. Serve the folder with a local web server (recommended to avoid CORS/font issues):
   - VS Code Live Server
   - Python: python -m http.server 8080
   - Node http-server: npx http-server -p 8080
3. Open http://localhost:8080 (or your port).
4. Click “Play Music” to start audio and lyrics.

Note: Browsers often block autoplay. Use the Play button to grant audio permission.

## Controls
- Play Music (🎵/⏸️): toggles audio and shows/hides lyrics
- Stop/Start Pulse (💓): toggles heart pulsation
- Reset View (📷): replays cinematic camera intro and re-enables controls afterward
- View Letter (💌): opens the letter modal (music pauses for the moment)

## Customization
- Lyrics and timing (milliseconds):
  - Edit the lyrics array in assets/heart.js
  ```javascript
  const lyrics = [
    { time: 0, text: "..." },
    { time: 2000, text: "..." }
  ];
  ```

- Audio file:
  - Replace music.mp3 in the project root. Keep the same filename or update assets/heart.js:
  ```javascript
  audio.src = './music.mp3';
  ```

- “I Love You inayu 🥺🫶🏻” text:
  - Edit createLoveText() in assets/heart.js (text, size, position, color).

- Heart colors:
  - Edit the heartColors array in assets/heart.js to adjust main/emissive/specular tones.

- Floating texts:
  - Edit textStrings and create3DTexts() in assets/heart.js.

- Styling:
  - Modify assets/style.css (controls, lyrics container, letter modal, responsiveness).

## Notes on fonts
- The project loads the Three.js example font helvetiker_regular via CDN. When running from a local file URL, some browsers block cross-origin font requests. Use a local server if you see font-loading errors.

## Watermark and integrity
- index.html injects a small badge (“made by rehan”) and checks for a dummy flag. If removed or altered, the page shows a warning.
- For normal customization, keep those lines intact.

## Troubleshooting
- Audio does not play:
  - Ensure music.mp3 exists at the project root and you clicked the Play button.
  - Some browsers require user interaction before audioContext.resume().
- No lyrics appear:
  - Lyrics only show while audio is playing and after the first button click.
  - Check timings in the lyrics array (milliseconds).
- Font fails to load:
  - Run via a local server to avoid CORS. The script falls back to simple geometry if loading fails.
- Performance:
  - Reduce particle counts or text meshes in assets/heart.js.
  - Lower renderer pixelRatio or disable shadows for older devices.

## License
This project is licensed under the Apache License 2.0. See the license file in this folder.

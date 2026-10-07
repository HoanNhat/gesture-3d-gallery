# 🦅 Ethan Vale — I See Through the Wild · 3D Gallery

An archival, museum-grade 3D wildlife photography exhibition powered by **Three.js** and real-time computer vision hand tracking via **MediaPipe Hands**. Conceived with an editorial fine-art aesthetic inspired by physical monograph publications, archival plates float in an organic 3D orbital cloud navigated through spatial hand gestures, mouse dragging, or keyboard shortcuts.

---

## ✨ Design & Features

- **Editorial Fine-Art Aesthetics**:
  - Deep rich obsidian backdrop (`#070708`) with subtle atmospheric dust motes.
  - Exquisite typography pairing: **Cormorant Garamond** & **Playfair Display** editorial serifs with crisp, clean **Inter** sans-serif.
  - Floating centerpiece headline: *"I See Through the Wild"*.
  - Curator note card in bottom-left featuring portrait, bio, and Ethan Vale's signature philosophy:
    > *"Wildlife photography is less about taking pictures and more about learning when not to move. Every frame in this archive was captured in natural conditions without intervention."*
  - Bottom-right collection archive stamp: *"Field Notes 2026. Vol. IV · Archival Monograph"*.

- **3D Floating Orbital Cloud**:
  - 12 curated high-resolution wildlife & nature plates floating in a multi-tiered orbital formation around the centerpiece title.
  - Organic depth staggering, natural tilt, and subtle floating undulation.
  - Natural museum key & rim lighting with ACESFilmic tone mapping.
  - Direct 3D Raycasting: Click or tap any photographic plate to examine its field notes immediately.

- **Curator Studio & Custom Artwork Management**:
  - **Direct Upload**: Drag & drop or browse photos from your computer (JPEG, PNG, WebP) with instantaneous preview and WebGL memory optimization.
  - **Archival Metadata Form**: Complete editorial curation fields for each specimen:
    - Specimen Title (required)
    - Series / Monograph Subtitle
    - Date Captured
    - Field Location
    - Optics & Exposure Specifications (Camera model, lens, shutter speed, ISO)
    - Photographer / Curator attribution
    - Curatorial Field Notes & Expedition Narrative
  - **Seamless 3D Integration**: Adding or removing images dynamically updates Three.js `Gallery3D`, recalculating orbital cloud distribution and centering newly archived plates.
  - **IndexedDB Local Persistence**: Powered by `GalleryDB` with automatic fallback to `localStorage` to avoid browser quota limitations when storing photographic data URLs.
  - **Collection Inventory Management**:
    - Manage archive tab listing custom and default plates with plate badges.
    - Discreet specimen deletion with modal and 3D sync.
    - One-click "Restore Default Archive" button.
    - Minimalist museum notification toast on successful archive or deletion.

- **Artwork Detail Modal & Rich Archival Metadata**:
  - Two-column exhibition detail view with full-scale photograph preview.
  - Comprehensive field metadata: Specimen ID, Date Captured, Field Location, Optics & Exposure specs (e.g. Leica SL2, Hasselblad X2D), Photographer attribution, and Curatorial Field Notes.
  - Sequential plate navigation (<kbd>←</kbd> / <kbd>→</kbd>) directly within the modal.

- **Discrete Optical Tracker HUD**:
  - Minimalist, semi-transparent matte black card in the top-right corner.
  - Ultra-clean monochromatic and champagne amber landmark points without distracting neon glows or scanlines.
  - Collapsible, toggleable, and out of the way of the art.

- **Rich Hand Gesture Recognition**:
  - 👈 / 👉 **Swipe Left / Right**: Step sequentially to previous or next archival plate.
  - 👌 **Pinch Zoom**: Continuous zoom in and out by bringing thumb and index fingertips together.
  - ✋ **Open Palm Orbit**: Fluidly rotate and navigate around the 3D orbital cloud.
  - ✊ **Closed Fist**: Freeze rotation and lock orbital perspective.
  - ✌️ **Victory / Examine**: Open full curatorial details and field notes for the current plate.
  - ☝️ **Index Point**: Smoothly reset camera to the initial archive perspective.

---

## 🚀 Getting Started

### ⚠️ Requirement: Local HTTP Server

> [!IMPORTANT]
> Modern web browsers **block webcam access (`navigator.mediaDevices.getUserMedia`)** when opening files directly using the `file://` protocol due to browser security policies.
> **Serve this project over `http://localhost` or `http://127.0.0.1`.**

### Running Locally

```bash
# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js npx serve
npx serve .

# Option 3: VS Code Live Server
# Right-click index.html -> "Open with Live Server"
```

Open `http://localhost:8000` (or the corresponding port) in your web browser.

---

## ✋ Gestures & Controls Reference

### Hand Gestures (Webcam)

| Gesture | Icon | Action | Description |
| :--- | :---: | :--- | :--- |
| **Swipe Left** | 👈 | **Previous Plate** | Flick hand horizontally towards the left across the camera frame. |
| **Swipe Right** | 👉 | **Next Plate** | Flick hand horizontally towards the right across the camera frame. |
| **Pinch Zoom** | 👌 | **Zoom In / Out** | Bring thumb and index fingertips together to zoom out, pull apart to zoom in. |
| **Open Palm** | ✋ | **Orbit Cloud** | Move open palm around to continuously rotate the 3D exhibition. |
| **Closed Fist** | ✊ | **Freeze Rotation** | Close fist to hold the current perspective in place. |
| **Victory / Peace** | ✌️ | **Examine Specimen** | Show two fingers upward to open full field notes and metadata modal. |
| **Index Point** | ☝️ | **Reset View** | Raise index finger to smoothly return to the starting specimen. |

### Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>←</kbd> or <kbd>A</kbd> | Previous specimen |
| <kbd>→</kbd> or <kbd>D</kbd> | Next specimen |
| <kbd>Enter</kbd> or <kbd>E</kbd> | Open / close detail examination modal |
| <kbd>+</kbd> / <kbd>=</kbd> | Zoom in |
| <kbd>-</kbd> / <kbd>_</kbd> | Zoom out |
| <kbd>R</kbd> | Reset camera view |
| <kbd>C</kbd> | Toggle optical camera tracking on / off |
| <kbd>F</kbd> | Toggle fullscreen mode |
| <kbd>H</kbd> or <kbd>?</kbd> | Open / close Gesture Navigation Guide |
| <kbd>Esc</kbd> | Close detail modal or guide modal |
| <kbd>Space</kbd> | Examine current specimen or close detail view |

### Mouse & Touch Controls

- **Left Click + Drag**: Orbit the 3D archival cloud with smooth momentum damping.
- **Scroll Wheel**: Smooth camera zoom.
- **Click Any Plate**: Centers that specimen and instantly opens its full detail view.
- **Bottom Dock**: Step previous/next, counter (`01 / 12`), examine button, zoom, reset, camera toggle.

---

## 📁 Project Architecture

```
gesture-3d-gallery/
├── index.html              # Archival structure, centerpiece, Curator Studio, detail modal
├── css/
│   ├── style.css           # Editorial typography, Curator Studio, detail modal, layout
│   └── gesture-hud.css     # Discrete matte optical tracker HUD & indicators
├── js/
│   ├── config.js           # 12 curated photographic items with rich metadata & 3D params
│   ├── storage.js          # IndexedDB persistence (GalleryDB) & WebGL image optimizer
│   ├── gallery3d.js        # Three.js 3D orbital cloud engine, dynamic updates, raycasting
│   ├── handTracker.js      # Webcam streaming & MediaPipe Hands tracker
│   ├── gestureDetector.js  # Spatial gesture classifiers (swipe, pinch, palm, poses)
│   └── main.js             # Curator studio controller, modal coordinator & UI events
└── assets/                 # Vector/fallback assets
```

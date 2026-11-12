# Studying on Android

A personal, offline-first language learning app that runs as a **Progressive Web App (PWA)** on Android and Windows. Generate exercise sets with any AI (ChatGPT, Claude, DeepSeek, Gemini), paste the JSON back into the app, and practice offline with full progress tracking.

> 🌐 **Live app:** https://jorektheorc.github.io/studying-on-android/

---

## ✨ Why?

Most language learning apps are either expensive, require constant internet access, or lock your data behind a subscription. This project is the opposite:

- **100% client-side.** No backend, no server, no analytics.
- **Free forever.** No paid services required (optional AI API keys are the only exception).
- **Offline-first.** Works without internet after the first load.
- **Your data, your rules.** All data is stored locally in the browser (IndexedDB) and can be exported as a single JSON file at any time.

The app doesn't call AI itself by default. Instead, it generates a strict system prompt that you copy into your favorite AI chat, and then pastes back the JSON response. This keeps the project completely free and platform-agnostic.

---

## 🚀 Features

### Exercise Types (8)
- Multiple Choice (with multiple correct answers support)
- True / False
- True / False / Not Given
- Fill in the Blanks (with optional word box)
- Sentence Completion
- Matching
- Ordering
- Short Answer
- Translation

### Flashcards (SRS)
- Anki-style spaced repetition (SM-2 approximation)
- **Cloze cards** (fill-in-the-blank within sentences)
- Direction selection: `Target → Native`, `Native → Target`, or `Mixed`
- Tags, folders, and multi-filter views

### AI Prompt Builder
- Strict system prompt with **3 few-shot examples**
- Per-level presets (A1–C2)
- Customizable exercise plan (count + items per exercise)
- **Templates** — save your favorite configurations for reuse
- Optional inline AI generation (OpenAI, DeepSeek, Gemini) — bring your own key

### Interactive Vocabulary
- Inline word translation in exercise prompts (dashed underline)
- Context-aware translations (phrases vs. individual words)
- Text-to-Speech (Web Speech API) — free, offline, per-word
- Image hints via Wikipedia / Wikimedia Commons (experimental, will be replaced by Pixabay)

### Organization
- **Folders** (nested, color-coded)
- **Tags** (flat, many-to-many)
- **Bulk actions**: Move sets, delete sets, move exercises, delete exercises
- **Content search** (cards + exercises, not just titles)

### Data Management
- Export full backup (`.json`) — including flashcards, progress, image cache, templates
- Import backup with full overwrite
- Export flashcards to **Anki** (`.csv`) — directly importable
- Statistics: streak, average accuracy, progress by set, most looked-up words

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Routing | React Router (HashRouter) |
| Local DB | Dexie (IndexedDB wrapper) |
| PWA | vite-plugin-pwa + Workbox |
| Markdown | react-markdown + remark-gfm |
| TTS | Web Speech API (native) |
| Deployment | GitHub Pages (via GitHub Actions) |

Zero external services. Zero API keys required for core functionality.

---

## 📖 How to Use

1. **Configure** your exercise set in **Studio → Generate Prompt**.
2. **Copy** the generated prompt (auto-copied to clipboard).
3. **Paste** it into ChatGPT / Claude / DeepSeek / Gemini.
4. **Copy** the JSON response from the AI.
5. **Paste** it into **Studio → Import JSON** (auto-validates on focus).
6. **Save** to the database — the set appears on the Home page.
7. **Practice** — open the set and start any exercise.

If the AI generates broken JSON (which happens), the validator shows exactly which rule was violated, and you can ask the AI to fix it.

---

## 💾 Local Development

```bash
# Clone the repo
git clone https://github.com/JorekTheOrc/studying-on-android.git
cd studying-on-android

# Install dependencies
npm install

# Run dev server (opens on http://localhost:5173/studying-on-android/)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Belvedir Local

A desktop app for running AI models locally: download, open, pick a model, chat. Electron + React on the front, a bundled [Ollama](https://ollama.com) engine (MIT licensed) inside, with [llama.cpp](https://github.com/ggml-org/llama.cpp) and [vLLM](https://docs.vllm.ai) as switchable engines for models you point it at. All inference happens on your machine; nothing leaves it.

## How it works

- The Ollama server binary ships **inside the app** (fetched at build time by `scripts/fetch-ollama.mjs`, bundled via electron-builder `extraResources`). On launch the app starts it automatically; if you already run your own Ollama, the app uses that instead and shares its models. On Linux (no standalone Ollama build) it falls back to a system install.
- First run shows a guided model picker: curated models with plain-English descriptions and RAM-aware fit badges ("Runs great" / "Will be slow" / "Won't fit") computed from your machine's memory, with one-click downloads.
- Chats render markdown, persist across restarts, and show tokens/sec after each reply. Responses stream token-by-token from Ollama's `/api/chat` endpoint.

## Development

```sh
npm install
npm run fetch-ollama   # one-time: download the engine binary to resources/
npm run dev            # launches Electron with hot reload
```

## Download & install

Grab the latest installer from [Releases](https://github.com/Belvedir/local-inference/releases) — `.dmg` for macOS, `.exe` for Windows, `.AppImage` for Linux.

> **macOS note:** the app is ad-hoc signed (no Apple Developer certificate), so macOS blocks the first launch ("Apple could not verify..."). On macOS 15+ the old right-click → Open bypass is gone; click **Done** (not Move to Trash), then either run
>
> ```sh
> xattr -cr "/Applications/Belvedir Local.app"
> ```
>
> and reopen it, or approve it under **System Settings → Privacy & Security → Open Anyway**.

No other installs needed — the inference engine is bundled. (Linux only: install [Ollama](https://ollama.com/download) separately.)

## Releasing a new version

Releases are automated via GitHub Actions (`.github/workflows/release.yml`). Bump the version and push a tag:

```sh
npm version patch          # bumps package.json + creates the git tag
git push && git push --tags
```

CI builds installers for macOS (arm64 + Intel), Windows, and Linux and attaches them to a GitHub Release. Note: electron-builder creates the release as a **draft** — review it on GitHub and click Publish.

### Signing & notarization

macOS builds are ad-hoc signed by default (users must approve the app under System Settings → Privacy & Security, or clear quarantine with `xattr`). To ship builds that open with **no warnings**, add these repo secrets and the next tag is Developer-ID-signed and notarized automatically:

| Secret | Value |
| --- | --- |
| `MAC_CERT_P12` | Base64 of the "Developer ID Application" certificate exported as .p12 (`base64 -i cert.p12`) |
| `MAC_CERT_PASSWORD` | The .p12 export password |
| `APPLE_API_KEY_P8` | Contents of an App Store Connect API key (.p8, role Developer or Admin) |
| `APPLE_API_KEY_ID` | That key's ID |
| `APPLE_API_ISSUER` | The App Store Connect issuer ID |

All five come from an [Apple Developer Program](https://developer.apple.com/programs/) membership: the certificate from Xcode/developer.apple.com → Certificates, the API key from App Store Connect → Users and Access → Integrations.

## Packaging locally

```sh
npm run dist       # builds a .dmg into release/
```

## Model suggestions (≤30B)

| Model | Pull command | RAM needed (4-bit) |
| --- | --- | --- |
| Qwen3 30B (MoE, fast) | `ollama pull qwen3:30b` | ~20 GB |
| Gemma 3 27B | `ollama pull gemma3:27b` | ~18 GB |
| Llama 3.1 8B | `ollama pull llama3.1:8b` | ~6 GB |
| Qwen3 4B (light) | `ollama pull qwen3:4b` | ~4 GB |

## Project layout

- `src/main/` — Electron main process; window setup and Ollama detection/launch (`ollama.ts`)
- `src/preload/` — context bridge exposing `window.api` to the renderer
- `src/renderer/` — React UI; `ollama.ts` is the streaming API client, `App.tsx` the chat + model manager

// Download the llama.cpp server binaries this platform's build bundles
// (llama-server + its shared libraries) from ggml-org/llama.cpp's latest
// release into resources/llamacpp/<platform-arch>/, mirroring
// fetch-ollama.mjs. macOS fetches BOTH archs: electron-builder builds
// arm64 and x64 installers on one runner and extraResources resolves
// ${arch} per target.
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

const RELEASE_API = 'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest'

// Asset-name matcher per bundle we ship. Windows: the CPU build dispatches
// AVX at runtime; GPU builds (vulkan/cuda) need runtimes we can't assume.
const WANTED = {
  'darwin-arm64': /bin-macos-arm64\.tar\.gz$/,
  'darwin-x64': /bin-macos-x64\.tar\.gz$/,
  'win32-x64': /bin-win-cpu-x64\.zip$/,
  'linux-x64': /bin-ubuntu-x64\.tar\.gz$/
}

// llama-server plus the libraries it links; the other tools' -impl libs
// (cli, bench, perplexity, ...) aren't needed and roughly double the size.
const KEEP = /^(llama-server(\.exe)?|(libggml|libllama|libmtmd)[^/]*\.(dylib|so(\.\d+)*|dll))$/
const SKIP = /-(batched-bench|bench|cli|completion|fit-params|perplexity|quantize)-impl/

function targetsForThisRunner() {
  if (process.platform === 'darwin') return ['darwin-arm64', 'darwin-x64']
  if (process.platform === 'win32') return ['win32-x64']
  return ['linux-x64']
}

function extract(archivePath, outDir) {
  if (archivePath.endsWith('.zip')) {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Force -Path '${archivePath}' -DestinationPath '${outDir}'"`
    )
  } else {
    execSync(`tar -xzf '${archivePath}' -C '${outDir}'`)
  }
}

function findServerDir(root) {
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(p)
      else if (/^llama-server(\.exe)?$/.test(entry.name)) return dir
    }
  }
  return null
}

const release = await (await fetch(RELEASE_API)).json()
const assets = release.assets ?? []

for (const target of targetsForThisRunner()) {
  const dest = path.join(import.meta.dirname, '..', 'resources', 'llamacpp', target)
  const exe = target.startsWith('win32') ? 'llama-server.exe' : 'llama-server'
  if (fs.existsSync(path.join(dest, exe))) {
    console.log(`llama.cpp already fetched: ${path.join(dest, exe)}`)
    continue
  }
  const asset = assets.find((a) => WANTED[target].test(a.name))
  if (!asset) {
    console.error(`no ${target} asset in llama.cpp ${release.tag_name}`)
    process.exit(1)
  }
  console.log(`downloading ${asset.name} (${release.tag_name})`)
  const buf = Buffer.from(await (await fetch(asset.browser_download_url)).arrayBuffer())
  const tmp = fs.mkdtempSync(path.join(import.meta.dirname, 'llamacpp-'))
  const zipPath = path.join(tmp, asset.name)
  fs.writeFileSync(zipPath, buf)
  extract(zipPath, tmp)
  const binDir = findServerDir(tmp)
  if (!binDir) {
    console.error(`llama-server not found inside ${asset.name}`)
    process.exit(1)
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(binDir)) {
    if (KEEP.test(name) && !SKIP.test(name)) {
      // cpSync keeps the version-chain symlinks as symlinks instead of
      // expanding each into a full copy of the library.
      fs.cpSync(path.join(binDir, name), path.join(dest, name), {
        verbatimSymlinks: true
      })
      const st = fs.lstatSync(path.join(dest, name))
      if (!name.endsWith('.dll') && st.isFile()) {
        fs.chmodSync(path.join(dest, name), 0o755)
      }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(`bundled llama.cpp → ${dest}`)
}

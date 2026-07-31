// electron-builder afterSign hook: give the mac bundle a VALID ad-hoc
// signature. With no Developer ID cert in CI, electron-builder skips
// signing and ships a linker-signed-only bundle whose resource seal is
// missing — Gatekeeper reports that as "damaged" and even `xattr -cr`
// can't rescue it on Apple Silicon. A forced deep ad-hoc sign produces a
// consistent seal: macOS still warns (unsigned developer), but the
// documented right-click → Open / xattr path works. The real fix remains
// Developer ID signing + notarization once an Apple Developer account is
// wired into CI.
import { execFileSync } from 'node:child_process'
import path from 'node:path'

export default async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  // A real certificate is in play (CI got the secrets): electron-builder
  // already Developer-ID-signed and notarized the bundle. Re-signing ad-hoc
  // here would destroy that signature.
  if (process.env.CSC_LINK) return
  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit'
  })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit'
  })
}

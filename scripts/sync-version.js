// Sets package.json version to the git commit count: 0.0.{N}
// Flags:
//   --next  count + 1  (pre-commit hook: predicts post-commit count)
//   --dry   print only, no write  (check version before writing commit message)

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const next = args.includes('--next')
const dry = args.includes('--dry')

const pkgPath = path.join(__dirname, '..', 'package.json')

let count = 0
try {
  count = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim(), 10)
} catch (_) {
  // No commits yet
}

if (next) count += 1

if (dry) {
  process.stdout.write(`0.0.${count}\n`)
  process.exit(0)
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.version = `0.0.${count}`
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
process.stdout.write(`version → ${pkg.version}\n`)

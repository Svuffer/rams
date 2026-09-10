const { execSync, spawnSync } = require('child_process');

// git rev-parse --short HEAD only needs the current commit object, which is
// present even in Vercel's shallow (--depth=1) clone -- unlike the old
// `git rev-list --count HEAD` version-sync script (removed 2026-08-20),
// which needed full history depth and silently returned wrong numbers
// under a shallow clone. Falls back to '' if .git isn't present at all.
const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (error) {
    return '';
  }
})();

const cracoArgs = process.argv.slice(2);
const result = spawnSync('npx', ['craco', ...cracoArgs], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, REACT_APP_GIT_SHA: gitSha },
});

process.exit(result.status === null ? 1 : result.status);

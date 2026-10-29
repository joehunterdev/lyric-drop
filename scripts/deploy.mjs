// Builds the client and publishes ONLY client/dist to the `deploy` branch.
// Point Hostinger's Git tool at that branch so public_html contains just the built site
// (index.html, assets/, en/, es/, fonts/, .htaccess) and none of the source or .git history.
//
//   npm run deploy            build + push to origin/deploy
//   npm run deploy -- --dry   build + prepare the commit, but don't push
//
// The deploy branch is rewritten on every run (force push) - it is a build artifact, not history.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BRANCH = 'deploy'
const REMOTE = 'origin'
const dryRun = process.argv.includes('--dry')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'client/dist')

const git = (args, cwd = root) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

// npm is npm.cmd on Windows; run through a shell only for this fixed command
const build = () => execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })

function fail(message) {
  console.error(`\n[deploy] ${message}`)
  process.exit(1)
}

// 1. Deploy what is committed, so the live site always matches a commit
if (git(['status', '--porcelain'])) {
  fail('You have uncommitted changes. Commit or stash them first so the deploy matches a commit.')
}
const sourceBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
const sourceCommit = git(['rev-parse', '--short', 'HEAD'])
if (sourceBranch !== 'main') {
  console.warn(`[deploy] Warning: deploying from "${sourceBranch}", not main.`)
}

// 2. Build
console.log(`[deploy] Building ${sourceBranch}@${sourceCommit}...`)
build()

for (const required of ['index.html', '.htaccess']) {
  if (!existsSync(join(dist, required))) fail(`dist/${required} is missing - the build output looks wrong.`)
}

// 3. Publish dist as a fresh single-commit repo
const remoteUrl = git(['remote', 'get-url', REMOTE])
const tmp = mkdtempSync(join(tmpdir(), 'lyric-drop-deploy-'))

try {
  cpSync(dist, tmp, { recursive: true })

  git(['init', '-q', '-b', BRANCH], tmp)
  // Reuse your identity from the main repo so the commit has an author
  git(['config', 'user.name', git(['config', 'user.name'])], tmp)
  git(['config', 'user.email', git(['config', 'user.email'])], tmp)
  git(['add', '-A'], tmp)
  git(['commit', '-q', '-m', `Deploy ${sourceBranch}@${sourceCommit}`], tmp)

  if (dryRun) {
    console.log(`\n[deploy] Dry run: built and committed ${git(['rev-list', '--count', 'HEAD'], tmp)} commit in ${tmp}`)
    console.log('[deploy] Files that would be published:')
    console.log(git(['ls-files'], tmp).split('\n').filter(f => !f.startsWith('assets/')).join('\n'))
    console.log('[deploy] Nothing was pushed.')
  } else {
    console.log(`[deploy] Pushing to ${REMOTE}/${BRANCH}...`)
    git(['push', '--force', remoteUrl, `${BRANCH}:${BRANCH}`], tmp)
    console.log(`\n[deploy] Done. ${REMOTE}/${BRANCH} now holds the build of ${sourceBranch}@${sourceCommit}.`)
    console.log('[deploy] In Hostinger > Git, pull the "deploy" branch into public_html.')
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

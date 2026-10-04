import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/** Same git SHA Cloudflare Workers Builds records as WORKERS_CI_COMMIT_SHA. */
export function commitSha() {
  const fromEnv =
    process.env.VITE_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA
  if (fromEnv?.trim()) return fromEnv.trim()
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

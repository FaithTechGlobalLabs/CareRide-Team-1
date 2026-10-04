import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(root, 'dist')
const otaDir = join(distDir, 'ota')

async function gitVersion() {
  const envSha =
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA
  if (envSha) return envSha.slice(0, 7)

  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd: root,
    })
    const sha = stdout.trim()
    if (sha) return sha
  } catch {
    // Deploy environments without git still need a unique bundle id.
  }

  return Date.now().toString(36)
}

function parseCliJson(stdout) {
  const start = stdout.lastIndexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start === -1 || end === -1) return {}
  try {
    return JSON.parse(stdout.slice(start, end + 1))
  } catch {
    return {}
  }
}

function runCapgoZip(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', '@capgo/cli@latest', 'bundle', 'zip', ...args], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(`Capgo zip failed (${code}): ${stderr || stdout}`))
    })
  })
}

const indexHtml = join(distDir, 'index.html')
try {
  await readFile(indexHtml)
} catch {
  throw new Error('dist/index.html is missing. Run npm run build before npm run ota:prepare.')
}

await rm(otaDir, { recursive: true, force: true })

const version = `1.0.0-${await gitVersion()}`
const zipName = `${version}.zip`
const { stdout, stderr } = await runCapgoZip([
  'org.careride.app',
  '--path',
  distDir,
  '--bundle',
  version,
  '--name',
  zipName,
  '--json',
])

const cli = parseCliJson(stdout)
const candidates = [cli.path, cli.file, join(root, zipName), join(distDir, zipName)]
for (const dir of [root, distDir]) {
  for (const name of await readdir(dir)) {
    if (name.endsWith('.zip')) candidates.push(join(dir, name))
  }
}

let zipBytes
let usedPath
for (const candidate of [...new Set(candidates.filter((value) => typeof value === 'string' && value.length > 0))]) {
  try {
    zipBytes = await readFile(candidate)
    usedPath = candidate
    break
  } catch {
    // Try the next location the CLI might have written.
  }
}

if (!zipBytes || !usedPath) {
  throw new Error(
    `Capgo zip succeeded but the zip file was not found. stdout:\n${stdout}\nstderr:\n${stderr}`,
  )
}

const checksum =
  typeof cli.checksum === 'string' && cli.checksum.length > 0
    ? cli.checksum
    : createHash('sha256').update(zipBytes).digest('hex')

await mkdir(otaDir, { recursive: true })
const publishedZip = join(otaDir, zipName)
await writeFile(publishedZip, zipBytes)
if (usedPath !== publishedZip) {
  await rm(usedPath, { force: true })
}

const latest = {
  version,
  checksum,
  file: zipName,
}
await writeFile(join(otaDir, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`)
console.log(`OTA bundle ${version} (${checksum.slice(0, 12)}…)`)

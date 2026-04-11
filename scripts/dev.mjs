#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const backendDir = path.join(rootDir, 'backend')
const frontendDir = path.join(rootDir, 'frontend')
const frontendNodeModules = path.join(frontendDir, 'node_modules')
const frontendPort = Number(process.env.VITE_DEV_PORT || process.env.VITE_PORT || 5173)
const backendHost = process.env.BACKEND_HOST || '127.0.0.1'
const backendPort = Number(process.env.BACKEND_PORT || 8000)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const dryRun = process.argv.includes('--dry-run')

function printBanner() {
  console.log('')
  console.log('  CropGear - Starting Development Servers')
  console.log('  =======================================')
  console.log('')
}

function resolvePythonCommand() {
  const configured = process.env.PYTHON?.trim()
  const candidates = configured
    ? [configured]
    : process.platform === 'win32'
      ? ['python']
      : ['python3', 'python']

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {
      stdio: 'ignore',
      shell: false
    })
    if (!result.error && result.status === 0) {
      return candidate
    }
  }

  throw new Error(
    configured
      ? `Configured PYTHON executable "${configured}" is not available.`
      : 'Could not find a usable Python executable. Set the PYTHON environment variable if needed.'
  )
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`))
    })
  })
}

async function ensureFrontendDependencies() {
  if (existsSync(frontendNodeModules)) {
    return
  }

  console.log('[frontend] node_modules not found, installing dependencies...')
  await runCommand(npmCommand, ['install'], { cwd: frontendDir, env: process.env })
}

function describeCommand(label, cwd, command, args) {
  console.log(`${label}`)
  console.log(`  cwd: ${cwd}`)
  console.log(`  cmd: ${command} ${args.join(' ')}`)
}

async function main() {
  printBanner()

  const pythonCommand = resolvePythonCommand()
  const backendArgs = [
    '-m',
    'uvicorn',
    'app.main:app',
    '--host',
    backendHost,
    '--port',
    String(backendPort),
    '--reload'
  ]
  const frontendArgs = ['run', 'dev']

  if (dryRun) {
    describeCommand('[backend] Dry run', backendDir, pythonCommand, backendArgs)
    describeCommand('[frontend] Dry run', frontendDir, npmCommand, frontendArgs)
    console.log('')
    console.log(`  Frontend URL: http://localhost:${frontendPort}`)
    console.log(`  Backend URL:  http://${backendHost}:${backendPort}`)
    console.log(`  API Docs:     http://${backendHost}:${backendPort}/docs`)
    return
  }

  await ensureFrontendDependencies()

  console.log(`[backend] Starting FastAPI on http://${backendHost}:${backendPort} ...`)
  const backend = spawn(pythonCommand, backendArgs, {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    env: process.env
  })

  console.log(`[frontend] Starting Vite on http://localhost:${frontendPort} ...`)
  const frontend = spawn(npmCommand, frontendArgs, {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_API_TARGET: process.env.VITE_DEV_API_TARGET || `http://${backendHost}:${backendPort}`
    }
  })

  console.log('')
  console.log('  Both servers running. Press Ctrl+C to stop.')
  console.log(`  Frontend: http://localhost:${frontendPort}`)
  console.log(`  Backend:  http://${backendHost}:${backendPort}`)
  console.log(`  API Docs: http://${backendHost}:${backendPort}/docs`)
  console.log('')

  let shuttingDown = false

  const stopChild = (child, signal = 'SIGTERM') => {
    if (!child || child.killed || child.exitCode !== null) {
      return
    }
    try {
      child.kill(signal)
    } catch {
      // Ignore cleanup errors during shutdown.
    }
  }

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    stopChild(frontend)
    stopChild(backend)
    setTimeout(() => {
      stopChild(frontend, 'SIGKILL')
      stopChild(backend, 'SIGKILL')
      process.exit(exitCode)
    }, 2000).unref()
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  backend.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[backend] exited with code ${code ?? 'unknown'}. Shutting down frontend...`)
      shutdown(code ?? 1)
    }
  })

  frontend.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[frontend] exited with code ${code ?? 'unknown'}. Shutting down backend...`)
      shutdown(code ?? 1)
    }
  })
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})

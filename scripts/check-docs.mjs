import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const failures = []

function readFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`)
    return ''
  }

  return fs.readFileSync(absolutePath, 'utf8')
}

function expectIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    failures.push(`Expected ${label} to include: ${needle}`)
  }
}

const requiredFiles = [
  'README.md',
  'docs/TODO.md',
  'docs/demo-data.md',
  'docs/runtime-services.md',
  'docs/ui-ux-roadmap.md',
]

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required file: ${relativePath}`)
  }
}

const readme = readFile('README.md')
const todo = readFile('docs/TODO.md')
const runtimeServices = readFile('docs/runtime-services.md')
const uiRoadmap = readFile('docs/ui-ux-roadmap.md')

const readmeLinks = [
  'docs/TODO.md',
  'docs/demo-data.md',
  'docs/runtime-services.md',
  'docs/ui-ux-roadmap.md',
]

for (const link of readmeLinks) {
  expectIncludes(readme, link, 'README.md')
}

const readmeFeaturePhrases = [
  'Favorites sync',
  'Equipment comparison board',
  'Review center flows',
  'Chat workspace',
  'Profile settings',
  'nearby search',
]

for (const phrase of readmeFeaturePhrases) {
  expectIncludes(readme, phrase, 'README.md feature summary')
}

expectIncludes(todo, 'This file tracks open work only', 'docs/TODO.md')
expectIncludes(todo, 'docs/ui-ux-roadmap.md', 'docs/TODO.md')

if (todo.includes('[x]')) {
  failures.push('docs/TODO.md should not contain completed checklist items.')
}

if (todo.includes('## Recently Completed')) {
  failures.push('docs/TODO.md should not contain a Recently Completed section.')
}

expectIncludes(runtimeServices, '## Quick Matrix', 'docs/runtime-services.md')
expectIncludes(runtimeServices, '## Ownership Rules', 'docs/runtime-services.md')
expectIncludes(uiRoadmap, '## Workflow Analysis', 'docs/ui-ux-roadmap.md')
expectIncludes(uiRoadmap, '## UI / UX Backlog', 'docs/ui-ux-roadmap.md')

if (failures.length > 0) {
  console.error('Docs drift check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Docs check passed: README, TODO, runtime-service guidance, and UI roadmap are aligned.')

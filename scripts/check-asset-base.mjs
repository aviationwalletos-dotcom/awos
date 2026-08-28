#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(projectRoot, 'dist', 'index.html')

const html = await readFile(indexPath, 'utf-8')
const assetRefs = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']*assets\/[^"']+)["'][^>]*>/gi)]
  .map((match) => match[1])

if (assetRefs.length === 0) {
  throw new Error(`No built asset references found in ${indexPath}`)
}

const relativeRefs = assetRefs.filter((ref) => ref.startsWith('./assets/'))
if (relativeRefs.length > 0) {
  throw new Error(`Built asset references must be root-relative, got: ${relativeRefs.join(', ')}`)
}

const invalidRefs = assetRefs.filter((ref) => !ref.startsWith('/assets/'))
if (invalidRefs.length > 0) {
  throw new Error(`Unexpected built asset references: ${invalidRefs.join(', ')}`)
}

console.log(`Asset base check passed for ${assetRefs.length} built asset references`)

// Serves public/ the way Vercel does, for the Retest tests and for a look on a laptop.
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../public/', import.meta.url))
const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 4380)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function fileFor(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost')
    const path = resolve(root, `.${decodeURIComponent(pathname)}`)
    const file = pathname.endsWith('/') ? join(path, 'index.html') : path
    return file.startsWith(root) ? file : null
  }
  catch {
    return null
  }
}

function send(response, status, headers, body) {
  response.writeHead(status, headers)
  response.end(body)
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, { allow: 'GET, HEAD' }, 'Method not allowed')
    return
  }
  const file = fileFor(request.url ?? '/')
  try {
    if (!file) throw new Error('Outside public/')
    const body = await readFile(file)
    const type = TYPES[extname(file)] ?? 'application/octet-stream'
    send(response, 200, { 'content-type': type, 'cache-control': 'no-store' }, request.method === 'HEAD' ? undefined : body)
  }
  catch {
    send(response, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'Not found')
  }
})

server.listen(port, host, () => {
  process.stdout.write(`Serving public/ at http://${host}:${port}\n`)
})

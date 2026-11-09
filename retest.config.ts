import { chrome, defineConfig } from '@rehearsal-labs/retest'

const config = defineConfig({
  apps: {
    // The Google Chrome installed on the machine. Retest starts scripts/serve.mjs unless something already
    // answers on the port.
    web: chrome({
      baseUrl: 'http://127.0.0.1:4380',
      start: { command: 'node scripts/serve.mjs', ready: 'http://127.0.0.1:4380' },
    }),
  },
})

export default config

// Lets every test file see the app names above.
declare module '@rehearsal-labs/retest' {
  interface Register {
    config: typeof config
  }
}

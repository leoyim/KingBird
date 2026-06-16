import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

function gitVersionPlugin(): Plugin {
  const getGitHash = (): string => {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      return 'unknown'
    }
  }

  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('build')
  const hash = getGitHash()
  const version = isProd ? `prod-${hash}` : `test-${hash}`

  return {
    name: 'git-version',
    config(config) {
      // Inject into client code via import.meta.env
      config.define = {
        ...config.define,
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      }
    },
    configureServer() {
      // Print on dev server startup
      console.log(`\n  EZRSS version: ${version}\n`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), gitVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  worker: {
    format: 'es',
  },
})

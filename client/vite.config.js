import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite's built-in dev-server HTML fallback only checks "/admin.html", not
// "/admin/index.html", when a URL has no trailing slash — so "/admin" (and
// nested SPA routes like "/admin/members") would silently fall back to the
// root site instead of the admin app. This middleware fixes that by
// rewriting any extensionless request under /admin to admin/index.html,
// before Vite's own fallback logic runs.
function adminSpaFallback() {
  return {
    name: 'admin-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          const [pathname, query] = req.url.split('?')
          const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
          const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname)
          if (isAdminPath && !hasFileExtension) {
            req.url = '/admin/index.html' + (query ? `?${query}` : '')
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [adminSpaFallback(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        // Public MVA website — served at /
        main: resolve(__dirname, 'index.html'),
        // Member management admin app — served at /admin
        admin: resolve(__dirname, 'admin/index.html'),
      }
    }
  }
})

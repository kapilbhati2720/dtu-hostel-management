import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['dtu-logo.jpg'],
      manifest: {
        name: 'DTU Hostel Portal',
        short_name: 'DTU Hostels',
        description: 'Official DTU Hostel Management System',
        theme_color: '#1e3a8a', // Blue-900 
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'dtu-logo.png',
            sizes: '512x512', // This must match your new file dimensions exactly
            type: 'image/png',
            purpose: 'any' 
          },
          {
            src: 'dtu-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // Adding this allows the OS to shape the icon
          }
        ],
        // Optional but recommended for the "Rich Install" UI
        // Inside the manifest object in vite.config.js
        screenshots: [
          {
            src: 'Screenshot.png', // Ensure this file is in client/public/
            sizes: '1914x864',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Hostel Management Dashboard'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      // 1. Forward API requests
      '/api': {
        target: `http://localhost:5001`,
        changeOrigin: true,
        secure: false,
      },
      // 2. Forward file/image requests to backend
      '/uploads': {
        target: `http://localhost:5001`,
        changeOrigin: true,
        secure: false,
      }
    },
  },
});
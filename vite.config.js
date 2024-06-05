
import { defineConfig } from 'vite'


export default defineConfig( {
  // config options
  server: {
    port: 8080,
    hmr: {
      clientport: 443,
    },
  }
})
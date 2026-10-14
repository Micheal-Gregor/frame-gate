import { defineConfig } from "vite";
import { recordService } from "./server/record-service.js";

// Phase 5's render server (.metaframework/project.json ui_render_command). ui/ is the root; views
// import the sealed library from ../src, read-only - the library never imports from ui/.
// Batch 4 (owner ruling): the server also holds the scene's record for every device, and listens on
// the home network; any device other than this computer signs in with the access code first.
export default defineConfig({
  plugins: [recordService()],
  server: { port: 5173, strictPort: true, host: true, fs: { allow: [".."] } },
});

import { defineConfig } from "vite";

// Phase 5's render server (.metaframework/project.json ui_render_command). ui/ is the root; views
// import the sealed library from ../src, read-only - the library never imports from ui/.
export default defineConfig({
  server: { port: 5173, strictPort: true, fs: { allow: [".."] } },
});

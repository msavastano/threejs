import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

// Vite config: React + GLSL imports.
// vite-plugin-glsl lets us author shaders in standalone .glsl/.vert/.frag files
// and import them as strings, supporting #include for shared chunks (e.g. simplex noise).
export default defineConfig({
  plugins: [react(), glsl()],
});

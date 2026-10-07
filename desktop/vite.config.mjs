import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
export default defineConfig({
  root:resolve(import.meta.dirname,".."),
  publicDir:false,
  plugins:[react(),tailwindcss(),{name:"desktop-dependency-audit", generateBundle(){writeFileSync("desktop/dependency-graph.json",JSON.stringify([...this.getModuleIds()].map(id=>({id,importers:this.getModuleInfo(id)?.importers})),null,2));}}],
  resolve:{alias:{"@":resolve(import.meta.dirname,"../src")}},
  build:{outDir:"desktop/dist/web",emptyOutDir:true,sourcemap:false,rollupOptions:{input:"desktop/index.html"}},
});

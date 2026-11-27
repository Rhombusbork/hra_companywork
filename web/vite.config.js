import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 빌드 결과를 ../site 에 낸다 (index.html + assets/). site/data 는 수집기가 쓰는 곳이라 지우지 않는다(emptyOutDir: false).
// 상대 경로(base "./")라서 GitHub Pages 하위 주소(/hra_companywork/)에서도 그대로 돈다.
// 개발 서버(npm run dev)에서는 ../site 의 data·아이콘을 그대로 쓴다.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: "./",
  publicDir: command === "serve" ? "../site" : false,
  build: { outDir: "../site", emptyOutDir: false, assetsDir: "assets", sourcemap: false },
}));

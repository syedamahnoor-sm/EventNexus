import { defineConfig, loadEnv } from "vite";
import { cwd } from 'node:process';
import { apiBaseUrl } from './src/lib/apiBaseUrl.js';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, cwd(), 'VITE_');
    if (command === 'build') apiBaseUrl(env.VITE_API_URL, false);
    return { plugins: [react(), tailwindcss()] };
});

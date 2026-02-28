import devtoolsJson from "vite-plugin-devtools-json";
// @ts-ignore
import { defineConfig, type Plugin } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from 'unplugin-icons/vite'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// @tailwindcss/vite matches any ID ending in `.css`, including Svelte's virtual
// `?svelte&type=style&lang.css` modules. When it processes those it reads the
// original .svelte source through its CSS generator, encounters `<script>`
// content (e.g. `onMount`) and throws "Invalid declaration". Wrapping the plugin
// to skip virtual Svelte CSS modules fixes this without affecting anything else.
function tailwindcssFiltered(): Plugin[] {
  const raw = tailwindcss();
  const plugins: Plugin[] = Array.isArray(raw) ? raw : [raw];
  return plugins.map((plugin) => {
    if (!plugin.transform) return plugin;
    const original = plugin.transform as Function;
    return {
      ...plugin,
      transform(code: string, id: string, ...rest: unknown[]) {
        if (id.includes("?svelte")) return null;
        return original.call(this, code, id, ...rest);
      },
    } as Plugin;
  });
}

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(async () => ({
  plugins: [
    sveltekit(),
    ...tailwindcssFiltered(),
    devtoolsJson(),
    // https://icones.js.org/
    Icons({ 
      compiler: 'svelte',
      // experimental
      autoInstall: true, 
    })],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: false,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

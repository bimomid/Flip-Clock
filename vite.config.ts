import { defineConfig, lazyPlugins } from "vite-plus";
import vue from "@vitejs/plugin-vue";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: lazyPlugins(() => [vue()]),
  resolve: {
    tsconfigPaths: true,
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    jsxSingleQuote: false,
    quoteProps: "as-needed",
    trailingComma: "es5",
    arrowParens: "always",
    bracketSpacing: true,
    bracketSameLine: false,
    endOfLine: "lf",
    proseWrap: "preserve",
    vueIndentScriptAndStyle: false,
    htmlWhitespaceSensitivity: "ignore",
    ignorePatterns: ["dist/**", "src/assets/**", "src-tauri/**", "pnpm-lock.yaml"],
  },

  lint: {
    plugins: ["oxc", "typescript", "unicorn", "vue"],
    categories: { correctness: "error" },
    env: { browser: true },
    ignorePatterns: ["dist/**", "src-tauri/**"],
    options: { typeAware: true, typeCheck: true },
  },

  test: {
    include: ["tests/**/*.test.ts"],
  },

  run: {
    tasks: {
      verify: {
        command: ["vp check", "vp test --run", "vpx scripts/sync-version.mjs --check"],
        cache: false,
      },
    },
  },

  staged: {
    "*.{js,ts,vue,json,jsonc,md,css,scss,html}": "vp check --fix",
    "*.{css,scss,vue}": "stylelint --fix --allow-empty-input",
  },
});

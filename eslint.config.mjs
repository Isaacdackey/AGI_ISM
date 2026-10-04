import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/coverage/**",
      "**/*.min.js",
    ],
  },
  { files: ["**/*.{js,mjs,cjs,jsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.config.{js,mjs,cjs}", "**/next.config.js", "**/postcss.config.js", "**/tailwind.config.js", "**/webpack-runtime.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  pluginReact.configs.flat.recommended,
  {
    settings: { react: { version: "18.3.1" } },
  },
]);

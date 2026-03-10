import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  pluginJs.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
      ecmaVersion: 2022,
      sourceType: "commonjs",
    },
    rules: {
      "eol-last": ["error", "always"],
      "no-trailing-spaces": "error",
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "always"],

      eqeqeq: ["error", "always"],
      "no-console": "warn",
      "no-duplicate-imports": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",

      "sort-keys": ["warn", "asc", { caseSensitive: false, natural: true }],
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
      "no-unused-vars": "off",
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
      "sort-keys": ["warn", "asc", { caseSensitive: false, natural: true }],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];

import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import sortKeysFix from "eslint-plugin-sort-keys-fix";
import sqlQueryMultilineRule from "./eslint-rules/sql-query-multiline.mjs";

/** Arquivos .js que o Babel trata como ESM (export) */
const jsEsmModuleFiles = [
  "src/utils/patterns/product-patterns.js",
  "src/services/note_export/pdf.js",
  "src/modules/notes/controllers/pdf.js",
];

const localPlugins = {
  local: {
    rules: {
      "sql-query-multiline": sqlQueryMultilineRule,
    },
  },
  "sort-keys-fix": sortKeysFix,
};

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...pluginJs.configs.recommended,
    plugins: localPlugins,
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
      quotes: [
        "error",
        "double",
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      semi: ["error", "always"],

      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-duplicate-imports": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",

      "sort-keys": "off",
      "sort-keys-fix/sort-keys-fix": ["error", "asc", { caseSensitive: false, natural: true }],
    },
  },
  {
    files: ["src/modules/engine/**/*.{js,mjs,cjs,ts}"],
    plugins: localPlugins,
    rules: {
      "local/sql-query-multiline": "error",
    },
  },
  {
    files: [...jsEsmModuleFiles, "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/services/email/templates/**/*.js"],
    rules: {
      "no-console": "off",
      "sort-keys": "off",
    },
  },
  {
    files: ["**/*.ts"],
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    plugins: localPlugins,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // typescript-eslint 8.2 + ESLint 9.35+: opções do base `no-unused-expressions` incompatíveis
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-unused-vars": "off",
      quotes: [
        "error",
        "double",
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      semi: ["error", "always"],
      "sort-keys": "off",
      "sort-keys-fix/sort-keys-fix": ["error", "asc", { caseSensitive: false, natural: true }],
    },
  }
);

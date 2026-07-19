import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import sortKeysFix from "eslint-plugin-sort-keys-fix";
import pluginN from "eslint-plugin-n";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...pluginJs.configs.recommended,
    plugins: {
      n: pluginN,
      "sort-keys-fix": sortKeysFix,
    },
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
      "no-duplicate-imports": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",

      "sort-keys-fix/sort-keys-fix": [
        "warn",
        "asc",
        { caseSensitive: false, natural: true },
      ],

      // Node/CommonJS Import Checks
      "n/no-missing-require": "error",
      "n/no-extraneous-require": "error",
      "n/no-unpublished-require": "off",
    },
  },
  {
    files: ["**/*.ts"],
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      n: pluginN,
      "sort-keys-fix": sortKeysFix,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      quotes: [
        "error",
        "double",
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      semi: ["error", "always"],
      "sort-keys-fix/sort-keys-fix": [
        "warn",
        "asc",
        { caseSensitive: false, natural: true },
      ],
      "eol-last": ["error", "always"],
      "no-trailing-spaces": "error",
    },
  }
);

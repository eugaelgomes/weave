import globals from "globals";
import pluginJs from "@eslint/js";
import sortKeysFix from "eslint-plugin-sort-keys-fix";

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.{js,cjs}"],
    ...pluginJs.configs.recommended,
    plugins: {
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
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "always"],

      eqeqeq: ["error", "always"],
      "no-console": "warn",
      "no-duplicate-imports": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",

      "sort-keys-fix/sort-keys-fix": ["warn", "asc", { caseSensitive: false, natural: true }],
    },
  },
];

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginN from "eslint-plugin-n";

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.{js,cjs}"],
    ...pluginJs.configs.recommended,
    plugins: {
      n: pluginN,
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
        { allowTemplateLiterals: true, avoidEscape: true },
      ],
      semi: ["error", "always"],

      eqeqeq: ["error", "always"],
      "no-console": "warn",
      "no-duplicate-imports": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "warn",

      "sort-keys": ["warn", "asc", { caseSensitive: false, natural: true }],

      // Node/CommonJS Import Checks
      "n/no-missing-require": "error",
      "n/no-extraneous-require": "error",
      "n/no-unpublished-require": "off",
    },
  },
];

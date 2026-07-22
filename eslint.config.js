const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
    // Must be its own config object with ONLY an `ignores` key — that's the
    // one shape ESLint's flat config treats as a *global* ignore. Bundling
    // it with `linterOptions` (as before) demoted it to a scoped ignore that
    // only applied to this object's own (empty) `files` match, so dist/,
    // build/, etc. were never actually excluded from the `**/*.{ts,tsx,js}`
    // pattern below — a stale `expo export` web bundle under dist/ would get
    // linted and throw a wall of unrelated `eqeqeq` errors.
    {
        ignores: [
            'node_modules/**',
            '.expo/**',
            'assets/**',
            'dist/**',
            'build/**',
        ],
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
    },
    {
        files: ['**/*.{ts,tsx,js}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'react-hooks': reactHooksPlugin,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            eqeqeq: ['error', 'smart'],
            'react-hooks/exhaustive-deps': 'off',
        },
    },
    {
        files: ['src/components/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
    {
        files: ['src/hooks/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
    {
        files: ['src/lib/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
    {
        files: ['src/services/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
        },
    },
];

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            '.expo/**',
            'assets/**',
            'dist/**',
            'build/**',
        ],
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
];

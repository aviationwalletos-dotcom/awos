import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NODE_BUILTINS = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'querystring',
  'readline',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
]

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', 'node_modules/**', 'scripts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'sort-imports': [
        'error',
        {
          allowSeparatedGroups: true,
          ignoreCase: false,
          ignoreDeclarationSort: false,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: NODE_BUILTINS,
          patterns: [
            'node:*',
            '@/*',
            '*.module.css',
            '*!*',
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Use named re-exports in barrel files. export * is forbidden.',
        },
        // 주의: 과거 aiapp(react_no_build) 미리보기 환경에서는 동적 import()와 CommonJS require()가
        // 지원되지 않아 금지했으나, 정식 Vite 빌드로 독립한 지금은 동적 import()가 코드 분할(청크 분리)을
        // 위한 표준 기법이므로 해당 제약을 해제한다(예: 무거운 xlsx를 엑셀 가져오기 시점에만 로드).
      ],
    },
  },
)

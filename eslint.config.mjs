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
          // 선언 순서 정렬은 끈다. 멤버 정렬(중괄호 안)만 검사한다.
          // 이유: 이 프로젝트는 "react → 외부 → 내부" 순으로 import를 묶는 관례를 쓰는데,
          // 알파벳 강제 정렬이 그 관례와 계속 충돌해 오류 173건이 상시 떠 있었다.
          // 상시 실패하는 린트는 아무도 보지 않게 되므로 실제 버그를 놓치게 된다.
          ignoreDeclarationSort: true,
        },
      ],
      // '_' 로 시작하는 이름은 "의도적으로 쓰지 않는 값"이라는 관례 표기다.
      // 구조분해로 특정 키만 제외할 때 쓰이므로 미사용 경고에서 제외한다.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
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

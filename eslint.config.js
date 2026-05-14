const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'public/**',
      'views/**',
      'docs/**',
      'BBS_pro_Ver/**',
      'routes/bbs_lec.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.js', 'bin/www'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Le edge function sono Deno, non browser: hanno il proprio runtime, i
  // propri global (`Deno`) e import da `jsr:`. Passarle da questa configurazione
  // significa segnalare errori su codice che non gira qui, e nascondere quelli
  // veri sotto il rumore. Si controllano con `deno check`.
  { ignores: ['dist', 'supabase/functions'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // I file di ui/ esportano di proposito componente + costanti di classe
      // (TAB_PILL_ITEM, STATUS_PILL_ACCENT): è il modo in cui le eccezioni
      // riusano gli stessi colori invece di inventarsene di paralleli.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);

import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Downgraded from error: async fetch-on-mount (e.g. OllamaStatus) is the
      // correct React pattern for checking external service availability.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
);

// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        // tsconfig dédié au lint (couvre tout src/**/*.ts, y compris les
        // entrées SSR et les composants du design system partagé) — jamais
        // utilisé pour le build, uniquement pour que le lint type-aware
        // voie l'intégralité du code du dépôt.
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        // 'lok' est le préfixe volontaire du design system partagé
        // (src/app/shared/components/, voir README) — pas une erreur de
        // nommage.
        { type: 'element', prefix: ['app', 'lok'], style: 'kebab-case' },
      ],
      // Sans ça, chaque Validators.required/Validators.email passé par
      // référence dans un FormGroup (pattern Angular standard, aucune de
      // ces méthodes statiques n'utilise `this`) déclenche un faux positif.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);

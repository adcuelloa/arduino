import globals from 'globals';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

/**
 * Configuración plana de ESLint para proyectos de React (ESM).
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */
export default [
  // 1. Configuración base de JavaScript
  js.configs.recommended,

  // 2. Configuración del entorno (Browser y Módulos)
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      // Habilitar ES modules (import/export)
      sourceType: 'module',
      // Definir variables globales del navegador (ej: window, document) y Node.
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      // Configurar el parser para soportar JSX
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // 3. Configuración del plugin de React (Reglas generales de componentes)
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    settings: {
      // Detectar automáticamente la versión de React instalada
      react: {
        version: 'detect',
      },
    },
    plugins: {
      react: react,
    },
    rules: {
      // Usar las reglas recomendadas del plugin de React
      ...react.configs.recommended.rules,

      // Desactivar reglas obsoletas en React 17+ (New JSX Transform)
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Regla común: permitir archivos .js, .jsx, .ts y .tsx para contener JSX
      'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
    },
  },

  // 4. Configuración del plugin de React Hooks
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      'react-hooks': hooks,
    },
    rules: {
      // Usar las reglas recomendadas del plugin de Hooks
      ...hooks.configs.recommended.rules,

      // NOTA: Si quieres la regla 'exhaustive-deps' para useEffect (que es muy recomendada),
      // puedes añadirla explícitamente así:
      // 'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

/**
 * @type {import("prettier").Config}
 * @see https://prettier.io/docs/en/configuration.html
 * * Configuración de Prettier para proyectos React/JavaScript modernos.
 * Utiliza el formato CommonJS/ESM.
 */
const config = {
  // 1. ANCHURA DE LÍNEA: Mantener la longitud de la línea en un punto razonable.
  printWidth: 100,

  // 2. PUNTO Y COMA (Semicolons): Usar puntos y comas al final de las declaraciones.
  semi: true,

  // 3. COMILLAS (Quotes): Usar comillas simples siempre que sea posible.
  singleQuote: true,

  // 4. ESPACIOS EN OBJETOS/ARRAYS (Bracket Spacing): Añadir un espacio entre llaves.
  // Ejemplo: { foo: bar } en lugar de {foo: bar}
  bracketSpacing: true,

  // 5. CÓDIGO HTML/JSX (Bracket Same Line): Poner el > de una etiqueta de varios atributos en una nueva línea.
  // Es ideal para JSX. Ejemplo: <div
  //  className="foo"> en lugar de <div
  //  className="foo">
  bracketSameLine: false,

  // 6. COMA PENDIENTE (Trailing Comma): Usar comas pendientes solo donde sean válidas en ES5
  // (útil para funciones, objetos, arrays).
  trailingComma: 'es5',

  // 7. ARROW FUNCTIONS (Arrow Parens): Incluir paréntesis alrededor de los parámetros de arrow functions.
  // Ejemplo: (a) => a en lugar de a => a
  arrowParens: 'always',

  // 8. TAMAÑO DE TABULACIÓN: Usar 2 espacios para la indentación (estándar React/JS).
  tabWidth: 2,

  // 9. FINAL DE LÍNEA: Asegura la consistencia del salto de línea para cualquier sistema operativo.
  endOfLine: 'lf',
};

export default config;

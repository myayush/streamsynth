module.exports = {
    env: {
      node: true,
      es6: true,
      jest: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
      ecmaVersion: 2020
    },
    rules: {
      // Possible errors
      'no-console': 'off',  // Allow console for this project
      
      // Best practices
      'eqeqeq': ['error', 'always'],  // Require === and !==
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      
      // Stylistic
      'indent': ['warn', 2],  // 2 space indentation
      'quotes': ['warn', 'single'],  // Single quotes
      'semi': ['warn', 'always'],  // Always use semicolons
      
      // ES6
      'arrow-spacing': 'warn',  // Space around arrow in arrow functions
      'prefer-const': 'warn'  // Use const when possible
    }
  };
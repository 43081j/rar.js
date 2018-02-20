import typescript from 'rollup-plugin-typescript';

export default {
  input: 'src/rar.ts',
  output: {
    name: 'Rar',
    file: 'rar.js',
    format: 'iife'
  },
  plugins: [
    typescript({
      module: 'es6',
      typescript: require('typescript')
    })
  ]
};

import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs'
  },
  plugins: [typescript({
    allowSyntheticDefaultImports: true,
    sourceMap: true,
    sourceRoot: 'dist',
    declaration: true,
    declarationDir: 'dist',
  })]
};

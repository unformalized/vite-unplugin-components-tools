import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json' assert { type: 'json' };

export default [
  {
    input: './src/index.ts',
    external: [
      '@babel/generator',
      '@babel/parser',
      'lodash-es',
      'rollup-plugin-static-import',
      'fs',
      'path',
      'glob',
      '@rollup/pluginutils',
    ],
    plugins: [resolve(), commonjs(), typescript()],
    output: [{ file: pkg.main, format: 'es' }],
  },
];

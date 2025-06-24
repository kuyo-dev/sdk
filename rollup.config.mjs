import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import { builtinModules } from 'module';
import pkg from './package.json' assert { type: 'json' };

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...builtinModules,
  'react',
  'react-dom',
  'next',
];

export default [
  // Main JS build
  {
    input: 'src/index.ts',
    external,
    output: [
      {
        file: pkg.module || 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: pkg.main || 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'KuyoSDK',
        sourcemap: true,
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          next: 'Next',
        },
      },
    ],
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs({ include: /node_modules/, transformMixedEsModules: true }),
      typescript({ tsconfig: './tsconfig.json', exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'] }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2,
        },
        mangle: { toplevel: true },
        format: { comments: false },
      }),
    ],
  },
  // Type declarations
  {
    input: 'src/index.ts',
    external,
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
]; 
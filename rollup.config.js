import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import { builtinModules } from "module";
import pkg from './package.json' assert { type: 'json' };

// External dependencies (won't be bundled)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...builtinModules,
  // Add any other modules that should be external
  "react",
  "react-dom",
  "next",
];

// Main build configuration
const mainConfig = defineConfig({
  input: "src/index.ts",
  external,
  output: [
    // ESM (ES Modules) - for modern bundlers
    {
      file: pkg.module || "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    // CJS (CommonJS) - for Node.js and older bundlers
    {
      file: pkg.main || "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    // UMD (Universal Module Definition) - for browsers
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "KuyoSDK",
      sourcemap: true,
      exports: "named",
      globals: {
        // Define global variable names for external dependencies
        react: "React",
        "react-dom": "ReactDOM",
        next: "Next",
      },
    },
  ],
  plugins: [
    // Resolve node modules
    nodeResolve({
      preferBuiltins: true,
    }),

    // Convert CommonJS to ES6
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true,
    }),

    // TypeScript compilation
    typescript({
      tsconfig: "./tsconfig.json",
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
    }),

    // Minification for production builds
    terser({
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    }),
  ],
  // Tree-shaking optimization
  // treeshake: {
  //   moduleSideEffects: false,
  //   propertyReadSideEffects: false,
  //   unknownGlobalSideEffects: false,
  // },
});

// TypeScript declaration files
const dtsConfig = defineConfig({
  input: "src/index.ts",
  external,
  output: {
    file: "dist/index.d.ts",
    format: "esm",
  },
  plugins: [
    dts({
      respectExternal: true,
      compilerOptions: {
        baseUrl: "./",
        paths: {
          "@/*": ["src/*"],
        },
      },
    }),
  ],
});

// Development build (without minification)
const devConfig = defineConfig({
  input: "src/index.ts",
  external,
  output: [
    {
      file: "dist/index.dev.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    {
      file: "dist/index.dev.cjs.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true,
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**"],
    }),
  ],
  // Tree-shaking optimization
  // treeshake: {
  //   moduleSideEffects: false,
  //   propertyReadSideEffects: false,
  //   unknownGlobalSideEffects: false,
  // },
});

// Export configuration based on environment
export default process.env.NODE_ENV === "development"
  ? [mainConfig, devConfig, dtsConfig]
  : [mainConfig, dtsConfig];

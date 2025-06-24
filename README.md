# Kuyo SDK

A lightweight, high-performance monitoring SDK for web applications. Track performance metrics, errors, and user interactions with minimal bundle size impact.

## 🚀 Features

- **Ultra-lightweight**: < 50KB gzipped
- **Performance Monitoring**: Web Vitals, memory usage, network performance
- **Error Tracking**: Automatic error capture and reporting
- **Plugin System**: Extensible architecture with performance plugins
- **Multi-platform**: Browser and Node.js support
- **TypeScript**: Full TypeScript support with type definitions
- **Tree-shaking**: Only bundle what you use

## 📦 Installation

```bash
npm install @kuyo/sdk
# or
yarn add @kuyo/sdk
```

## 🎯 Quick Start

### Next.js Integration

```typescript
// pages/_app.tsx or app/layout.tsx
import { init } from "@kuyo/sdk";

// Initialize the SDK
init({
  apiKey: "your-api-key",
  adapter: "nextjs",
  plugins: ["performance"],
  environment: "production",
  debug: false, // Set to true for development
});
```

### Manual Integration

```typescript
import { init } from "@kuyo/sdk";

init({
  apiKey: "your-api-key",
  adapter: "nextjs",
  plugins: ["performance"],
  environment: "production",
});
```

## 🔧 Build Configuration

### Development Build

```bash
# Install dependencies
npm install

# Development build (with sourcemaps)
npm run build:dev

# Watch mode for development
npm run dev
```

### Production Build

```bash
# Production build (minified)
npm run build:prod

# Check bundle size
npm run size
```

### Build Outputs

The build generates multiple formats:

- **ESM** (`dist/index.esm.js`): Modern bundlers (webpack, Vite, Rollup)
- **CJS** (`dist/index.cjs.js`): Node.js and older bundlers
- **UMD** (`dist/index.umd.js`): Browser globals
- **Types** (`dist/index.d.ts`): TypeScript definitions

## 📊 Bundle Size Optimization

### Current Sizes

| Format | Size (gzipped) | Target          |
| ------ | -------------- | --------------- |
| ESM    | ~45KB          | Modern bundlers |
| CJS    | ~45KB          | Node.js         |
| UMD    | ~50KB          | Browser globals |

### Optimization Features

- **Tree-shaking**: Unused code is automatically removed
- **Minification**: Terser with aggressive optimization
- **External Dependencies**: React, Next.js kept external
- **Dead Code Elimination**: Console logs removed in production

## 🎛️ Configuration

### SDK Configuration

```typescript
interface KuyoConfig {
  apiKey: string;
  environment: "development" | "production";
  debug: boolean;
  adapter: "nextjs";
  plugins: ("performance" | "breadcrumbs")[];
  vercel?: {
    env?: string;
    publicVercelURL?: string;
    productionURL?: string;
  };
}
```

### Performance Plugin

The performance plugin automatically tracks:

- **Web Vitals**: LCP, FID, CLS, FCP, TTFB
- **Memory Usage**: Heap usage, memory limits
- **Network Performance**: Connection type, RTT, bandwidth
- **User Interactions**: Clicks, scrolls, keyboard events
- **Resource Timing**: Load times for scripts, images, CSS
- **Long Tasks**: Performance bottlenecks

## 🔌 Plugin System

### Using Plugins

```typescript
init({
  apiKey: "your-key",
  adapter: "nextjs",
  plugins: ["performance"], // Enable performance monitoring
  environment: "production",
});
```

### Available Plugins

- `performance`: Comprehensive performance monitoring
- `breadcrumbs`: User interaction breadcrumbs (coming soon)

## 📈 Performance Metrics

### Automatic Collection

The SDK automatically collects metrics every 5 minutes:

```typescript
// Metrics are batched and sent efficiently
{
  sessionId: "kuyo_abc123",
  environment: "production",
  platform: "browser",
  metrics: [
    {
      type: "web_vitals",
      name: "lcp",
      value: 1200,
      unit: "ms"
    },
    {
      type: "memory",
      name: "heap_used",
      value: 45.2,
      unit: "mb"
    }
  ]
}
```

### Manual Tracking

```typescript
import { captureException, captureMessage } from "@kuyo/sdk";

// Track errors
try {
  // Your code
} catch (error) {
  captureException(error, { extra: "context" });
}

// Track custom events
captureMessage("User completed checkout", "info", {
  orderId: "12345",
});
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Check bundle size
npm run size
```

### Project Structure

```
src/
├── index.ts          # Main entry point
├── core.ts           # Core SDK functionality
├── types/            # TypeScript definitions
├── adapters/         # Platform adapters
├── plugins/          # Plugin implementations
└── lib/              # Utility libraries
```

## 📦 Publishing

```bash
# Build the package
npm run build

# Check bundle size
npm run size

# Publish to npm
npm publish
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/kuyo-sdk/issues)
- **Documentation**: [Full Documentation](https://docs.kuyo.dev)
- **Discord**: [Community Chat](https://discord.gg/kuyo)

---

Built with ❤️ for the web performance community.

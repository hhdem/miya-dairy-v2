# Miya Dairy Desktop App

Electron-based desktop application for macOS.

## Features

- Native macOS file picker integration
- Secure credential storage with electron-store
- Photo upload and management
- Category filtering
- Public/Private photo visibility toggle

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Building for macOS

```bash
# Build for current architecture
npm run package

# Build for Apple Silicon (M1/M2)
npm run package:arm64

# Build for Intel
npm run package:x64
```

The built application will be in the `release` directory.

## Architecture

- **Main Process** (`src/main/`): Electron main process handling window management and native APIs
- **Renderer Process** (`src/renderer/`): React-based UI
- **IPC Communication**: Secure communication between main and renderer via contextBridge

## Configuration

The app stores configuration and credentials in the user's app data directory using electron-store.

Default API endpoint: `http://localhost:3000/api`

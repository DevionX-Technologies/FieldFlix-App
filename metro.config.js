// metro.config.js
const fs = require('fs');
const path = require('path');

// Export:embed / some Gradle-invoked bundles can start Node with cwd = android/. NativeWind's
// CSS interop warns via @expo/config using getConfig(process.cwd()), which expects package.json
// beside app.json → chdir to the real JS project root (this file lives there).
const projectRoot = __dirname;
if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
  process.chdir(projectRoot);
}

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = (() => {
  // 1️⃣ Load Expo’s default Metro config
  const config = getDefaultConfig(__dirname);

  // Web: react-native-maps pulls native-only codegen — resolve to a stub (must run before NativeWind wraps the resolver).
  const mapsWebStub = path.resolve(__dirname, 'stubs/react-native-maps.web.js');
  const previousResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return { type: 'sourceFile', filePath: mapsWebStub };
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  // 2️⃣ Let NativeWind patch in its loaders for Tailwind classes
  // Use absolute paths: Gradle/EAS may run Metro with cwd = android/, and
  // NativeWind uses path.resolve() on configPath/input (relative → cwd).
  const nativeWindConfig = withNativeWind(config, {
    input: path.join(__dirname, 'global.css'),
    configPath: path.join(__dirname, 'tailwind.config.js'),
  });

  // 3️⃣ Remove 'svg' from assetExts so svg files are treated as source
  nativeWindConfig.resolver.assetExts = nativeWindConfig.resolver.assetExts.filter(
    (ext) => ext !== 'svg'
  );

  // 4️⃣ Add 'svg' to sourceExts so the transformer will pick them up
  nativeWindConfig.resolver.sourceExts.push('svg');

  // 5️⃣ Tell Metro to use the SVG transformer for .svg files
  nativeWindConfig.transformer = {
    ...nativeWindConfig.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };

  return nativeWindConfig;
})();
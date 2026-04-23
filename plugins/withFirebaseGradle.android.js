// plugins/withFirebaseGradle.android.js

const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withFirebaseGradle(config) {
  //
  // 1) Patch android/build.gradle (project‐level) to remove any old classpath
  //    and then inject our correct Firebase classpath entries.
  //
  config = withProjectBuildGradle(config, async (config) => {
    let contents = config.modResults.contents;

    // 1a) Remove any existing "com.google.gms:google-services" classpath lines
    //     (e.g., classpath 'com.google.gms:google-services:4.4.1' or similar)
    const lines = contents.split('\n');
    const filtered = lines.filter(
      (l) => !l.match(/^\s*classpath\s+['"].*com\.google\.gms:google-services:.*['"]/)
    );

    // 1b) Now inject our desired classpath entries if they aren't already present
    const updated = [...filtered];
    const hasDesiredGms = updated.some((l) =>
      l.includes('com.google.gms:google-services:4.3.15')
    );
    if (!hasDesiredGms) {
      // Find the "dependencies {" line inside buildscript
      const depsIndex = updated.findIndex((l) => l.match(/^\s*dependencies\s*\{\s*$/));
      if (depsIndex !== -1) {
        updated.splice(
          depsIndex + 1,
          0,
          `    // ⬆️ Firebase classpath entries injected by withFirebaseGradle`,
          `    classpath("com.google.gms:google-services:4.3.15")`,
          `    classpath("com.google.firebase:firebase-crashlytics-gradle:2.9.5")`
        );
      }
    }

    config.modResults.contents = updated.join('\n');
    return config;
  });

  //
  // 2) Patch android/app/build.gradle (module‐level) to add implementations and
  //    ensure the two "apply plugin:" lines appear at the bottom.
  //
  config = withAppBuildGradle(config, async (config) => {
    let contents = config.modResults.contents;
    let lines = contents.split('\n');

    // 2a) Insert BOM + firebase-analytics + crashlytics into dependencies { … }
    const hasBOM = lines.some((l) => l.includes('firebase-bom:33.14.0'));
    if (!hasBOM) {
      const depsIndex = lines.findIndex((l) => l.match(/^\s*dependencies\s*\{\s*$/));
      if (depsIndex !== -1) {
        lines.splice(
          depsIndex + 1,
          0,
          `    // ⬆️ Firebase implementations injected by withFirebaseGradle`,
          `    implementation(platform("com.google.firebase:firebase-bom:33.14.0"))`,
          `    implementation("com.google.firebase:firebase-crashlytics")`,
          `    implementation("com.google.firebase:firebase-analytics")`
        );
      }
    }

    // 2b) Ensure both `apply plugin` lines appear at the very bottom
    const applyGms  = `apply plugin: 'com.google.gms.google-services'`;
    const applyCrc = `apply plugin: 'com.google.firebase.crashlytics'`;
    const hasGms    = lines.some((l) => l.trim() === applyGms);
    const hasCrc    = lines.some((l) => l.trim() === applyCrc);

    if (!hasGms || !hasCrc) {
      // Guarantee trailing newline
      if (!contents.endsWith('\n')) {
        contents = lines.join('\n') + '\n';
      } else {
        contents = lines.join('\n');
      }
      // Append both at bottom
      contents +=
        `${applyCrc}\n`;

      config.modResults.contents = contents;
    } else {
      // If both are already present, we just rewrite joined lines
      config.modResults.contents = lines.join('\n');
    }

    return config;
  });

  return config;
};
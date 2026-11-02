/* global __dirname */
const { existsSync } = require("node:fs");
const { join } = require("node:path");

/**
 * app.json plus Firebase's Android config (google-services.json from the Firebase console), needed for phone alerts on
 * Android. It is added when the file is in the project folder, or given to EAS as the GOOGLE_SERVICES_JSON file variable;
 * a build without it works, with no phone alerts on Android.
 */
module.exports = ({ config }) => {
  const local = join(__dirname, "google-services.json");
  const file = process.env.GOOGLE_SERVICES_JSON ?? (existsSync(local) ? local : undefined);
  return file ? { ...config, android: { ...config.android, googleServicesFile: file } } : config;
};

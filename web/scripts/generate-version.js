const fs = require('fs');
const path = require('path');

// Generates a unique version hash based on current timestamp or CI commit hash
const version = process.env.COMMIT_SHA || Date.now().toString();

const versionFilePath = path.join(__dirname, '../public/version.json');
fs.writeFileSync(versionFilePath, JSON.stringify({ version }));

console.log(`[Version Monitor] Generated build version: ${version}`);

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname);

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkSync(dirPath, callback);
    }
    callback(dirPath, isDirectory);
  });
}

function safeRename(oldPath, newPath) {
  if (oldPath !== newPath) {
    console.log(`Renaming: ${oldPath} -> ${newPath}`);
    fs.renameSync(oldPath, newPath);
  }
}

// 1. Rename directories and files
const pathsToRename = [];
walkSync(srcDir, (itemPath, isDirectory) => {
  pathsToRename.push({ path: itemPath, isDirectory });
});

// Rename bottom-up to avoid invalidating paths
pathsToRename.sort((a, b) => b.path.length - a.path.length);

pathsToRename.forEach(item => {
  const dirName = path.dirname(item.path);
  const baseName = path.basename(item.path);
  
  let newBaseName = baseName
    .replace(/workspaces/g, 'workspaces')
    .replace(/workspace/g, 'workspace')
    .replace(/Workspaces/g, 'Workspaces')
    .replace(/Workspace/g, 'Workspace');

  // Specific team renames
  if (newBaseName.includes('team')) {
    // Only rename if it's standalone team
    newBaseName = newBaseName.replace(/^teams\./, 'teams.')
                             .replace(/^team\./, 'team.')
                             .replace(/-team/, '-team')
                             .replace(/_area/, '_team')
                             .replace(/team-/, 'team-')
                             .replace(/area_/, 'team_');
  }

  if (baseName !== newBaseName) {
    safeRename(item.path, path.join(dirName, newBaseName));
  }
});

// 2. Replace content in files
const replacements = [
  { regex: /\borganizations\b/g, replacement: 'workspaces' },
  { regex: /\bOrganizations\b/g, replacement: 'Workspaces' },
  { regex: /\borganization\b/g, replacement: 'workspace' },
  { regex: /\bOrganization\b/g, replacement: 'Workspace' },
  { regex: /\bORGANIZATIONS\b/g, replacement: 'WORKSPACES' },
  { regex: /\bORGANIZATION\b/g, replacement: 'WORKSPACE' },

  { regex: /\bareas\b/g, replacement: 'teams' },
  { regex: /\bAreas\b/g, replacement: 'Teams' },
  { regex: /\barea\b/g, replacement: 'team' },
  { regex: /\bArea\b/g, replacement: 'Team' },
  { regex: /\bAREAS\b/g, replacement: 'TEAMS' },
  { regex: /\bAREA\b/g, replacement: 'TEAM' },
];

function replaceContent(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.json') && !filePath.endsWith('.md')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated content: ${filePath}`);
  }
}

walkSync(srcDir, (itemPath, isDirectory) => {
  if (!isDirectory) {
    replaceContent(itemPath);
  }
});

console.log("Refactoring complete.");

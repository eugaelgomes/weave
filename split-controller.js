const fs = require('fs');
const content = fs.readFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/users.controller.js', 'utf8');

// A very simplistic approach: just read the whole file, export things to the appropriate files, but wait, the imports are needed in each.
// Actually, it might be faster to just do it manually with regexes or provide a simple instruction.
// Since time is short, I will generate the files one by one with a Node script that parses the AST or just regex, or use string manipulation.

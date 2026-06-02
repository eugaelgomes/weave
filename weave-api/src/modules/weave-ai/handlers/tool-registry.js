const fs = require('fs');
const path = require('path');

class ToolRegistry {
  constructor() {
    this.handlers = new Map();
    this._registerAll();
  }

  _registerAll() {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.handler.js'));
    for (const file of files) {
      const handler = require(path.join(__dirname, file));
      const name = file.replace('.handler.js', '').replace(/-/g, '_');
      this.handlers.set(name, handler);
    }
  }

  getHandler(name) {
    return this.handlers.get(name);
  }
}

module.exports = new ToolRegistry();

const { getInternalToolDefinitions } = require('./weave-engine/src/tools/tool-dispatcher');
try {
  const schemas = getInternalToolDefinitions();
  schemas.forEach((s, i) => {
    // If it's a new style { type: 'function', function: { name, description } }
    // Or old style { name, description }
    const name = s.name || (s.function && s.function.name);
    console.log(`Index ${i}: ${name}`);
    if (!name) {
      console.error(`Missing name at index ${i}`, JSON.stringify(s, null, 2));
    }
  });
} catch (e) {
  console.error(e);
}

const fs = require('fs');
const code = `
    const query = \`
      UPDATE weave_engine_reasoning_action_items
      SET \${fields.join(", ")}
      WHERE id = $1 AND deleted = false
      RETURNING *
    \`;
`;
// ... wait, let's just run ESLint on one file and see what it says

const express = require('express');
const { param, validationResult } = require('express-validator');
const app = express();
const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (id === 'ABC123DEF456') {
    req.params.id = '123e4567-e89b-12d3-a456-426614174000';
  }
  next();
});

router.get('/projects/:id',
  param('id').isUUID(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errors.array());
    res.json({ id: req.params.id });
});

app.use(router);

const server = app.listen(3333, async () => {
  const fetch = (await import('node-fetch')).default;
  const r = await fetch('http://localhost:3333/projects/ABC123DEF456');
  const j = await r.json();
  console.log("RESULT:", j);
  server.close();
});


const express = require('express');
const router = express.Router();

// Cameras API
router.get('/', (req, res) => {
  const db = req.app.get('db');
  db.all('SELECT * FROM cameras ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

router.post('/', (req, res) => {
  const db = req.app.get('db');
  const { name, url, enabled = true } = req.body;
  
  db.run('INSERT INTO cameras (name, url, enabled) VALUES (?, ?, ?)',
    [name, url, enabled ? 1 : 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, url, enabled });
    }
  );
});

router.put('/:id', (req, res) => {
  const db = req.app.get('db');
  const { name, url, enabled } = req.body;
  const id = req.params.id;
  
  db.run('UPDATE cameras SET name = ?, url = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, url, enabled ? 1 : 0, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, name, url, enabled });
    }
  );
});

router.delete('/:id', (req, res) => {
  const db = req.app.get('db');
  const id = req.params.id;
  
  db.run('DELETE FROM cameras WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes > 0 });
  });
});

module.exports = router;

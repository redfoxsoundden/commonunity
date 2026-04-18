const express = require('express');
const path = require('path');

const app = express();

// Serve all static files from this directory
app.use(express.static(path.join(__dirname)));

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Ashtanga Exam Class on port ${port}`));

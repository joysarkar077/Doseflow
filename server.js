const app = require('./api/index');
const express = require('express');
const path = require('path');

// Serve static assets in development
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found' });
  res.sendFile(path.resolve(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

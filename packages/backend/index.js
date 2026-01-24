const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Hello from ATC Backend!');
});

app.listen(port, () => {
  console.log(`ATC Backend listening on port ${port}`);
});

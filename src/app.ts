import express from 'express';

const port = process.env.PORT || 5000;
const app: express.Application = express();

app.get('/', function(req, res) {
  res.send('Hello world from Node JS!!!');
});

app.listen(port, function() {
  console.log(`Example listening on port - ${port}`);
});
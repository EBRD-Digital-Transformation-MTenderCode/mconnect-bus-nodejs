import express from 'express';

import { serverConfig } from "./configs";

import "./modules/kafka/in";

const port = serverConfig.port;
const app: express.Application = express();

app.get('/', async function(req, res) {
  res.send("Hello from Node JS!!!")
});

app.listen(port, function() {
  console.log(`--> App running on port - ${port}`);
});
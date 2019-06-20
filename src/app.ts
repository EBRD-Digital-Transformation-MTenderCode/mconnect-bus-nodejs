import express from 'express';

import { server } from "./configs";

import "./kafka/in";

import { IMain, IDatabase } from 'pg-promise';
import pgPromise from 'pg-promise';

interface IExtensions {
  find(id: string): Promise<any>;

  one: any
}

const port = server.port;
const app: express.Application = express();

const pgp: IMain = pgPromise({
  extend: (obj: IExtensions) => {
    obj.find = id => {
      return obj.one('SELECT * FROM public.input WHERE id = $1', id);
    };
  },
});

const connectUrl: string = 'postgres://postgres:agent@192.168.1.144:5432/postgres';

const db = <IDatabase<IExtensions> & IExtensions>pgp(connectUrl);


app.get('/', async function(req, res) {
  try {
    const response = await db.find('0d20d00c-69c6-13e8-adc0-fa7ae02cce50');
    res.send(response);
  } catch (e) {
    res.send(JSON.stringify(e));
  }
});

app.listen(port, function() {
  console.log(`--> App running on port - ${port}`);
});
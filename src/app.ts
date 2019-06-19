import express from 'express';

import { IMain, IDatabase } from 'pg-promise';
import pgPromise from 'pg-promise';

import * as kafka from 'kafka-node';
import { Message } from 'kafka-node';

interface IExtensions {
  find(id: string): Promise<any>;

  one: any
}

const port = process.env.PORT || 5000;
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

const kafkaClient = kafka.KafkaClient;
const kafkaConsumer = kafka.Consumer;

const client = new kafkaClient({
  kafkaHost: '10.0.20.107:9092,10.0.20.108:9092,10.0.20.109:9092',
  connectTimeout: 3000,
  requestTimeout: 3000
});

client.on("connect", () => {
  console.log("---> Connected to Kafka");
});

client.on("ready", () => {
  console.log("---> Ready listen from Kafka");
});

const consumer = new kafkaConsumer(client, [{
  topic: 'transport-agent-in',
}], {
  groupId: 'transport-agent-consumer-group',
});

consumer.on('message', function(message: Message) {
  console.log('SUCCESSFUL !!! \n');
  console.log(message);
});

consumer.on('error', function(err: string) {
  console.log('ERROR !!!', err);
});

app.get('/', async function(req, res) {
  try {
    const response = await db.find('0d20d00c-69c6-13e8-adc0-fa7ae02cce50');
    res.send(response);
  } catch (e) {
    res.send(JSON.stringify(e));
  }
});

app.listen(port, function() {
  console.log(`Node JS listening on port - ${port}`);
});
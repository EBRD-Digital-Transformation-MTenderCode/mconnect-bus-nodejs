import * as Kafka from 'kafka-node';

import { kafkaClient } from "../configs";

const Client =  new Kafka.KafkaClient({
  kafkaHost: kafkaClient.kafkaHost,
  connectTimeout: kafkaClient.connectTimeout,
  requestTimeout: kafkaClient.requestTimeout
});

Client.on("ready", () => {
  console.log("--> Kafka client ready");
});

export default Client;

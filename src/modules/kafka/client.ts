import * as Kafka from 'kafka-node';

import { kafkaClientConfig } from '../../configs';

const Client = new Kafka.KafkaClient({
  kafkaHost: kafkaClientConfig.kafkaHost,
  connectTimeout: kafkaClientConfig.connectTimeout,
  requestTimeout: kafkaClientConfig.requestTimeout,
});

Client.on('ready', () => {
  console.log('--> Kafka client ready');
});

Client.on('error', (error) => {
  console.log(`!!!KAFKA_ERROR ${error.message}`);
});

export default Client;

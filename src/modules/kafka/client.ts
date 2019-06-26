import * as Kafka from 'kafka-node';

import logger from '../logger';

import { kafkaClientConfig } from '../../configs';

export const Client = new Kafka.KafkaClient({
  kafkaHost: kafkaClientConfig.kafkaHost,
  connectTimeout: kafkaClientConfig.connectTimeout,
  requestTimeout: kafkaClientConfig.requestTimeout,
});

Client.on('ready', () => logger.info( '✔️Kafka Client ready'));

Client.on('error', (error) => console.log(`!!!KAFKA_ERROR_Client ${error.message}`));

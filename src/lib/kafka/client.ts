import * as Kafka from 'kafka-node';

import { kafkaClientConfig } from 'configs';

import logger from '../logger';

export const Client = new Kafka.KafkaClient({
  kafkaHost: kafkaClientConfig.kafkaHost,
  connectTimeout: kafkaClientConfig.connectTimeout,
  requestTimeout: kafkaClientConfig.requestTimeout
});

Client.on('ready', () => logger.info('✔ Kafka Client ready'));

Client.on('error', error => logger.error('🗙 Error kafka client: ', error));

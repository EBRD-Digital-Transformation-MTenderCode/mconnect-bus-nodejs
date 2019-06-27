import * as Kafka from 'kafka-node';

import logger from '../logger';

import { kafkaClientConfig, kafkaInConsumerConfig } from '../../configs';

export const InConsumer = new Kafka.ConsumerGroup(
  {
    kafkaHost: kafkaClientConfig.kafkaHost,
    groupId: kafkaInConsumerConfig.inGroupId,
    protocol: ['roundrobin'],
    connectOnReady: true,
  }, kafkaInConsumerConfig.inTopic,
);

InConsumer.on('connect', () => logger.info('✔ Kafka Consumer connected'));
InConsumer.on('error', () => logger.error('Kafka Consumer not connected'));

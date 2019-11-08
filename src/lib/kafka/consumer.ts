import * as Kafka from 'kafka-node';

import { kafkaClientConfig, kafkaInConsumerConfig } from 'configs';

import logger from '../logger';

export const InConsumer = new Kafka.ConsumerGroup(
  {
    kafkaHost: kafkaClientConfig.kafkaHost,
    groupId: kafkaInConsumerConfig.inGroupId,
    protocol: ['roundrobin'],
    connectOnReady: true
  },
  kafkaInConsumerConfig.inTopic
);

InConsumer.on('connect', () => logger.info('✔ Kafka Consumer connected'));
InConsumer.on('error', error =>
  logger.error('🗙 Error kafka consumer: ', error)
);

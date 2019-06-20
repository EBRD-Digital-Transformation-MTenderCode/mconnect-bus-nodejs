import * as Kafka from 'kafka-node';

import { kafkaInConsumerConfig } from '../../configs';

import Client from './client';

import { saveIn } from "../db/controllers";

const InConsumer = new Kafka.Consumer(
  Client, [{
    topic: kafkaInConsumerConfig.inTopic,
    partition: kafkaInConsumerConfig.inPartition,
  }], {
    groupId: kafkaInConsumerConfig.inGroupId,
  },
);

InConsumer.on('message', saveIn);

InConsumer.on('error', function(err: string) {
  console.log('ERROR !!!', err);
});

export default InConsumer;
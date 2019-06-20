import * as Kafka from 'kafka-node';

import { kafkaInConsumer } from '../configs';

import Client from './client';

const InConsumer = new Kafka.Consumer(
  Client, [{
    topic: kafkaInConsumer.inTopic,
    partition: kafkaInConsumer.inPartition,
  }], {
    groupId: kafkaInConsumer.inGroupId,
  },
);

InConsumer.on('message', function(message: Kafka.Message) {
  console.log('SUCCESSFUL !!! \n');
  console.log(message);
});

InConsumer.on('error', function(err: string) {
  console.log('ERROR !!!', err);
});

export default InConsumer;
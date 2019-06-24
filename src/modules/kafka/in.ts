import * as Kafka from 'kafka-node';

import { kafkaInConsumerConfig } from '../../configs';

import Client from './client';

import { saveIn } from "../dataBase/controllers";

const InConsumer = new Kafka.Consumer(
  Client, [{
    topic: kafkaInConsumerConfig.inTopic,
    partition: kafkaInConsumerConfig.inPartition, // delete
  }], {
    groupId: kafkaInConsumerConfig.inGroupId,
  },
);

InConsumer.on('message', saveIn);

InConsumer.on('error', function(err: string) {
  console.log('!!!KAFKA_ERROR', err);
});



export default InConsumer;
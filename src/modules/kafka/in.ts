import * as Kafka from 'kafka-node';

import { Client } from './client';

import { kafkaInConsumerConfig } from '../../configs';

// import { saveIn } from '../dataBase/controllers';

const InConsumer = new Kafka.Consumer(
  Client, [{
    topic: kafkaInConsumerConfig.inTopic,
  }], {
    groupId: kafkaInConsumerConfig.inGroupId,
  },
);

// InConsumer.on('message', saveIn);

InConsumer.on('error', function(err: string) {
  console.log('!!!KAFKA_ERROR_Consumer', err);
});


export default InConsumer;
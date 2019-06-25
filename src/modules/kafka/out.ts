import * as Kafka from 'kafka-node';

import { Client } from './client';

export const OutProducer = new Kafka.HighLevelProducer(Client);

OutProducer.on('ready', () => console.log('--> Kafka Producer ready'));

OutProducer.on('error', (error) => console.log(`!!!KAFKA_ERROR_Producer ${error.message}`));

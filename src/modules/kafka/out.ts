import * as Kafka from 'kafka-node';

import { kafkaLogger } from '../logger';

import { Client } from './client';

export const OutProducer = new Kafka.HighLevelProducer(Client);

OutProducer.on('ready', () => kafkaLogger.info( '✔️Kafka Producer ready'));

OutProducer.on('error', (error) => console.log(`!!!KAFKA_ERROR_Producer ${error.message}`));

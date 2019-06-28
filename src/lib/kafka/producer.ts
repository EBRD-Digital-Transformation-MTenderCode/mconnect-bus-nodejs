import * as Kafka from 'kafka-node';

import { Client } from './client';

import logger from '../logger';

export const OutProducer = new Kafka.HighLevelProducer(Client);

OutProducer.on('ready', () => logger.info('✔ Kafka Producer ready'));

OutProducer.on('error', error => logger.error('🗙 Error kafka producer: ', error));

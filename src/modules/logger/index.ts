import * as winston from 'winston';

winston.addColors({ info: 'blue' });

export * from './appLogger';
export * from './dbLogger';
export * from './kafkaLogger';
export * from './requestLogger';
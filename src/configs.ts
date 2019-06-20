import './lib/env';

export const server = {
  port: +(process.env.PORT || '5000'),
};

export const kafkaClient = {
  kafkaHost: process.env.KAFKA_HOST || '',
  connectTimeout: 3000,
  requestTimeout: 3000,
};

export const kafkaInConsumer = {
  inTopic: process.env.IN_TOPIC || '',
  inPartition: +(process.env.IN_PARTITION || '0'),
  inGroupId: process.env.IN_GROUP_ID || '',
};

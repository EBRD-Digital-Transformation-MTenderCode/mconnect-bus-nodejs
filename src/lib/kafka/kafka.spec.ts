import { kafkaClientConfig, kafkaInConsumerConfig, kafkaOutProducerConfig } from 'configs';
import Kafka, { ConsumerGroup, HighLevelProducer, KafkaClient, Offset } from 'kafka-node';
import logger from 'lib/logger';

jest.mock('lib/logger');

describe('[Integration] Kafka', () => {
  let Client: KafkaClient;
  let Producer: HighLevelProducer;
  let Consumer: ConsumerGroup;
  const ready: string[] = [];

  const getCurrentOffset = async (topic: string): Promise<number> => {
    const offset = new Offset(Client);

    return new Promise(resolve => {
      offset.fetchLatestOffsets([topic], (error, data) => {
        resolve(data[topic]['0'] as number);
      });
    });
  };

  const sendMessage = (topic: string, cb: (error: any, data: any) => any = () => {}): void => {
    Producer.send([{ topic, messages: 'test' }], cb);
  };

  const requestTimeout = (ms = kafkaClientConfig.requestTimeout / 2): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  enum Topic {
    Out = 'mconnect-bus-out',
    In = 'mconnect-bus-in'
  }

  beforeEach(async () => {
    Consumer = new Kafka.ConsumerGroup(
      {
        kafkaHost: kafkaClientConfig.kafkaHost,
        groupId: kafkaInConsumerConfig.inGroupId,
        protocol: ['roundrobin'],
        connectOnReady: true
      },
      kafkaInConsumerConfig.inTopic
    );

    Consumer.on('connect', () => {
      logger.info('✔ Kafka Consumer connected');
      ready.push('consumer');
    });
    Consumer.on('error', error => logger.error('🗙 Error kafka consumer: ', error));

    Client = new Kafka.KafkaClient(kafkaClientConfig);

    Client.on('ready', () => {
      logger.info('✔ Kafka Client ready');
      ready.push('client');
    });
    Client.on('error', error => logger.error('🗙 Error kafka client: ', error));

    Producer = new Kafka.HighLevelProducer(Client);

    Producer.on('ready', () => {
      logger.info('✔ Kafka Producer ready');
      ready.push('producer');
    });
    Producer.on('error', error => logger.error('🗙 Error kafka producer: ', error));
  });

  it('Should connect', async () => {
    await requestTimeout(25000);

    expect(ready).toContain('client');
    expect(ready).toContain('producer');
    expect(ready).toContain('consumer');

    expect(logger.error).not.toHaveBeenCalled();
  }, 30000);

  describe('Message sending', () => {
    it(`Should send message to ${Topic.Out}`, async () => {
      const oldOffset = await getCurrentOffset(kafkaOutProducerConfig.outTopic);

      sendMessage(kafkaOutProducerConfig.outTopic);

      const newOffset = await getCurrentOffset(kafkaOutProducerConfig.outTopic);

      expect(newOffset - oldOffset).toEqual(1);
    });

    it(`Should send message to ${Topic.In}`, async () => {
      const oldOffset = await getCurrentOffset(kafkaInConsumerConfig.inTopic);

      sendMessage(kafkaInConsumerConfig.inTopic);

      const newOffset = await getCurrentOffset(kafkaInConsumerConfig.inTopic);

      expect(newOffset - oldOffset).toEqual(1);
    });
  });

  describe('Message reading', () => {
    it(`Should read messages from ${Topic.In}`, () => {
      sendMessage(kafkaInConsumerConfig.inTopic, (error, data) => {
        Consumer.on('message', message => {
          expect(message).not.toBeUndefined();
        });
      });
    });
  });
});

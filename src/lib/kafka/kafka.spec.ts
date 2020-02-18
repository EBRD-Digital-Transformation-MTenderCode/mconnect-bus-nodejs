import { Offset } from 'kafka-node';
import { kafkaClientConfig, kafkaInConsumerConfig, kafkaOutProducerConfig } from '../../configs';
import { OutProducer as Producer } from './producer';
import { InConsumer as Consumer } from './consumer';
import { Client } from './client';
import logger from '../logger';

jest.mock('lib/logger');

describe('[Integration] Kafka', () => {
  const ready: string[] = [];

  const getCurrentOffset = async (topic: string): Promise<number> => {
    const offset = new Offset(Client);

    return new Promise(resolve => {
      offset.fetchLatestOffsets([topic], (error, data) => {
        resolve(data[topic]['0'] as number);
      });
    });
  };

  const sendMessage = (topic: string, cb: (error: any, data: any) => any = (): void => undefined): void => {
    Producer.send([{ topic, messages: 'test' }], cb);
  };

  const requestTimeout = (ms = kafkaClientConfig.requestTimeout / 2): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

  enum Topic {
    Out = 'mconnect-bus-out',
    In = 'mconnect-bus-in',
  }

  it('Should connect', async () => {
    Consumer.on('connect', () => {
      ready.push('consumer');
    });

    Client.on('ready', () => {
      ready.push('client');
    });

    Producer.on('ready', () => {
      ready.push('producer');
    });

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
      sendMessage(kafkaInConsumerConfig.inTopic, () => {
        Consumer.on('message', message => {
          expect(message).not.toBeUndefined();
        });
      });
    });
  });
});

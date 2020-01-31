import crypto from 'crypto';

import uuid from 'uuid';
import dayjs from 'dayjs';

import db from '../dataBase';
import { OutProducer } from '../kafka';

import { formatDate } from '../../utils';

import { serviceConfig, kafkaOutProducerConfig, dbConfig } from '../../configs';

import { IErrorMessage, IErrorInfo } from '../../types';
import logger from '../logger';

class ErrorsHandler {
  static generateErrorObject(errors: IErrorInfo[]): IErrorMessage {
    return {
      id: uuid(),
      date: formatDate(new Date()),
      service: {
        id: serviceConfig.id,
        name: serviceConfig.name,
        version: serviceConfig.version
      },
      errors
    };
  }

  public async catchError(entityString: string, errors: IErrorInfo[]): Promise<void> {
    const errorObject = ErrorsHandler.generateErrorObject(errors);

    const entityHash = crypto
      .createHash('md5')
      .update(entityString)
      .digest('hex');

    try {
      const existError = await db.isExist(dbConfig.tables.errors, { field: 'hash', value: entityHash });

      if (existError) {
        logger.error(`🗙 Error in ERROR_HANDLER. catchError: Next data already processed:
          ${entityString}. 
          Errors: ${JSON.stringify(errors, null, 2)}`);
        return;
      }

      await db.insertToErrors({
        id: errorObject.id,
        hash: entityHash,
        ts: dayjs(errorObject.date).unix(),
        data: entityString,
        message_kafka: errorObject,
        fixed: false
      });

      this.sendError(errorObject);
    } catch (error) {
      logger.error(`🗙 Error in ERROR_HANDLER. catchError: Can't insert row to errors table with next data:
        ${entityString}`);
    }

    console.log(errorObject);
  }

  async checkNotSentErrors(): Promise<void> {
    try {
      const notSentErrors = await db.getNotSentErrors();

      logger.warn(`! ErrorsHandler has ${notSentErrors.length} not sent error(s)`);

      for (const error of notSentErrors) {
        this.sendError(error.message_kafka);
      }
    } catch (error) {
      logger.error(`🗙 Error in ERROR_HANDLER. checkNotSentErrors: ${error}`);
    }
  }

  private sendError(errorObject: IErrorMessage): void {
    OutProducer.send(
      [
        {
          topic: kafkaOutProducerConfig.incidentsTopic,
          messages: JSON.stringify(errorObject)
        }
      ],
      async error => {
        if (error) return logger.error('🗙 Error in ERROR_HANDLER. sendError - producer: ', error);

        try {
          const result = await db.setTsSend({
            id: errorObject.id,
            ts_send: Date.now()
          });

          if (result.rowCount !== 1) {
            logger.error(
              `🗙 Error in ERROR_HANDLER. sendError - producer: Can't update timestamp in error table for id ${errorObject.id}. Seem to be column timestamp already filled`
            );
          }
        } catch (asyncError) {
          logger.error('🗙 Error in ERROR_HANDLER. sendError - producer: ', asyncError);
        }
      }
    );
  }
}

export const errorsHandler = new ErrorsHandler();

export default errorsHandler;

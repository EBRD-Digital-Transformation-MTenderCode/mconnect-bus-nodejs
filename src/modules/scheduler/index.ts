import { v4 as uuid } from 'uuid';

import db from '../../lib/dataBase';
import { OutProducer } from '../../lib/kafka';
import errorsHandler from '../../lib/errorsHandler';
import logger from '../../lib/logger';

import { fetchContractCommit, fetchContractsQueue } from '../../api';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

import { dateIsValid, formatDate, prepareFieldValue } from '../../utils';

import { IOut, ITreasuryContract, TCommandName, TStatusCode } from '../../types';

type IStatusCodesMapToCommandName = {
  [key in TStatusCode]: TCommandName;
};

export default class Scheduler {
  private readonly contractIdPattern: RegExp;

  private readonly statusCodesMapToCommandName: IStatusCodesMapToCommandName;

  constructor(private readonly interval: number) {
    this.contractIdPattern = /^ocds-([a-z]|[0-9]){6}-[A-Z]{2}-[0-9]{13}-AC-[0-9]{13}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
    this.statusCodesMapToCommandName = {
      '3004': 'treasuryApprovingAc',
      '3005': 'requestForAcClarification',
      '3006': 'processAcRejection'
    };
  }

  public async start(): Promise<void> {
    logger.info('✔ Scheduler started');

    await this.commitNotCommittedContracts();

    await this.sendNotSentResponses();

    await this.run();

    setInterval(() => this.run(), this.interval);
  }

  private generateKafkaMessageOut(treasuryContract: ITreasuryContract): IOut | undefined {
    const { id_dok, status, descr, st_date, reg_nom, reg_date } = treasuryContract;

    if (!dateIsValid(st_date)) {
      errorsHandler.catchError(JSON.stringify(treasuryContract), [
        {
          code: 'ER-3.11.2.5',
          description: 'Получено значение атрибута "st_date", которое не удалось привести к UTC формату'
        }
      ]);
      return;
    }

    const ocid = id_dok.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, ''); // ocds-b3wdp1-MD-1539843614475-AC-1539843614531
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, ''); // ocds-b3wdp1-MD-1539843614475

    const kafkaMessageOut: IOut = {
      id: uuid(),
      command: this.statusCodesMapToCommandName[status],
      data: {
        cpid,
        ocid,
        verification: {
          value: status,
          rationale: descr
        },
        dateMet: formatDate(st_date)
      },
      version: '0.0.1'
    };

    if (status === '3005') {
      const externalRegId = prepareFieldValue(reg_nom);
      const regDate = prepareFieldValue(reg_date);

      if (typeof externalRegId !== 'string' || typeof regDate !== 'string') {
        const errors = [];

        if (typeof externalRegId !== 'string') {
          errors.push({
            code: 'ER-3.11.2.4',
            description: 'Получено значение атрибута "reg_nom" с типом не строка и не пустой объект'
          });
        }

        if (typeof regDate !== 'string') {
          errors.push({
            code: 'ER-3.11.2.2',
            description: 'Получено значение атрибута "reg_date" с типом не строка и не пустой объект'
          });
        }

        errorsHandler.catchError(JSON.stringify(treasuryContract), errors);
        return;
      }

      kafkaMessageOut.data.regData = {
        externalRegId,
        regDate
      };
    }

    return kafkaMessageOut;
  }

  private async doContractProcessing(
    statusCode: TStatusCode,
    treasuryContract: ITreasuryContract
  ): Promise<void | undefined> {
    try {
      const contractId = treasuryContract.id_dok;

      if (treasuryContract.status !== statusCode) {
        logger.error('🗙 Error in SCHEDULER. treasuryContract.status not equal verifiable statusCode');
        return;
      }

      const sentContract = await db.isExist(dbConfig.tables.treasuryRequests, {
        field: 'id_doc',
        value: contractId
      });

      if (!sentContract.exists) return;

      if (treasuryContract.status === '3005' && (!treasuryContract.reg_nom || !treasuryContract.reg_date)) {
        logger.error(
          `🗙 Error in SCHEDULER. Contract in queue 3005 with id ${treasuryContract.id_dok} hasn't reg_nom OR reg_date fields`
        );
        return;
      }

      const receivedContract = await db.isExist(dbConfig.tables.treasuryResponses, {
        field: 'id_doc',
        value: contractId
      });

      if (receivedContract.exists) {
        await db.deleteFromTreasureResponses(contractId);
      }

      const { status } = treasuryContract;

      await db.insertToTreasureResponses({
        id_doc: contractId,
        status_code: status,
        message: treasuryContract,
        ts_in: Date.now()
      });

      const kafkaMessageOut = this.generateKafkaMessageOut(treasuryContract);

      if (!kafkaMessageOut) return;

      await db.insertToResponses({
        id_doc: contractId,
        cmd_id: kafkaMessageOut.id,
        cmd_name: kafkaMessageOut.command,
        message: kafkaMessageOut
      });

      await this.sendResponse(contractId, kafkaMessageOut);
    } catch (error) {
      logger.error('🗙 Error in SCHEDULER. doContractProcessing: ', error);
    }
  }

  private async sendResponse(contractId: string, kafkaMessageOut: IOut): Promise<void> {
    await OutProducer.send(
      [
        {
          topic: kafkaOutProducerConfig.outTopic,
          messages: JSON.stringify(kafkaMessageOut)
        }
      ],
      async (error: any) => {
        if (error) return logger.error('🗙 Error in SCHEDULER. sendResponse - producer: ', error);

        try {
          const result = await db.updateRow({
            table: dbConfig.tables.responses,
            contractId,
            columns: {
              ts: Date.now()
            }
          });

          if (result.rowCount !== 1) {
            logger.error(
              `🗙 Error in SCHEDULER. sendResponse - producer: Can't update timestamp in responses table for id_doc ${contractId}. Seem to be column timestamp already filled`
            );
            return;
          }

          await this.commitContract(contractId, kafkaMessageOut.data.verification?.value as TStatusCode);
        } catch (asyncError) {
          logger.error('🗙 Error in SCHEDULER. sendResponse - producer: ', asyncError);
        }
      }
    );
  }

  private async sendNotSentResponses(): Promise<void> {
    try {
      const notSentContractsMessages = await db.getNotSentMessages({
        launch: false
      });

      logger.warn(`! Scheduler has ${notSentContractsMessages.length} not sent message(s)`);

      for (const row of notSentContractsMessages) {
        await this.sendResponse(row.id_doc, row.message);
      }
    } catch (error) {
      logger.error('🗙 Error in SCHEDULER. sendNotSentResponses: ', error);
    }
  }

  private async commitContract(contractId: string, statusCode: TStatusCode): Promise<boolean | undefined> {
    try {
      const res = await fetchContractCommit(contractId);

      if (!res) {
        throw Error('No response was received');
      }

      const result = await db.updateRow({
        table: dbConfig.tables.treasuryResponses,
        contractId,
        columns: {
          ts_commit: Date.now()
        }
      });

      if (result.rowCount !== 1) {
        throw Error(
          `Can't update timestamp in treasuryResponses table for id_doc ${contractId}. Seem to be column timestamp already filled`
        );
      }

      logger.info(`✔ Contract with id - ${contractId} was removed from queue with statusCode - ${statusCode}`);

      return true;
    } catch (error) {
      logger.error('🗙 Error in SCHEDULER. commitContract: ', error.message);
    }
  }

  private async commitNotCommittedContracts(): Promise<void> {
    try {
      const notCommittedContracts = await db.getNotCommitteds();

      logger.warn(`! Scheduler has ${notCommittedContracts.length} not committed contract(s)`);

      for (const contract of notCommittedContracts) {
        await this.commitContract(contract.id_doc, contract.status_code);
      }
    } catch (error) {
      logger.error('🗙 Error in SCHEDULER. commitNotCommittedContracts: ', error);
    }
  }

  private async run(): Promise<void> {
    try {
      for (const statusCode of Object.keys(this.statusCodesMapToCommandName) as TStatusCode[]) {
        const contractsQueue = await fetchContractsQueue(statusCode);

        if (!contractsQueue || typeof contractsQueue !== 'object') {
          await errorsHandler.catchError(JSON.stringify(contractsQueue), [
            {
              code: 'ER-3.11.2.6',
              description: `После отправки запроса на получение очереди контрактов (${statusCode}), получен ответ не в формате: объект, внутри которого массив contract ({ "contract": [] } )`
            }
          ]);
          continue;
        }

        if (!Array.isArray(contractsQueue.contract)) continue;

        const contractFrom2Cdb = contractsQueue.contract.filter(contract => {
          return this.contractIdPattern.test(contract.id_dok);
        });

        for (const treasuryContract of contractFrom2Cdb) {
          await this.doContractProcessing(statusCode, treasuryContract);
        }
      }

      logger.info(`✔ Last sync at - ${new Date().toUTCString().toString()}`);
    } catch (error) {
      logger.error('🗙 Error in SCHEDULER. run: ', error);
    }
  }
}

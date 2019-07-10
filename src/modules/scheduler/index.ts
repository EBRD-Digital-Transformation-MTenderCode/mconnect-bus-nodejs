import { v4 as uuid } from 'uuid';

import db from '../../lib/dataBase';
import { OutProducer } from '../../lib/kafka';
import logger from '../../lib/logger';

import { fetchContractCommit, fetchContractsQueue } from '../../api';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

import { IOut, ITreasuryContract, TCommandName, TStatusCode } from '../../types';

type IStatusCodesMapToCommandName = {
  [key in TStatusCode]: TCommandName;
};

export default class Scheduler {
  private readonly interval: number;
  private readonly contractIdPattern: RegExp;
  private readonly statusCodesMapToCommandName: IStatusCodesMapToCommandName;

  constructor(interval: number) {
    this.interval = interval;
    this.contractIdPattern = /^ocds-([a-z]|[0-9]){6}-[A-Z]{2}-[0-9]{13}-AC-[0-9]{13}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
    this.statusCodesMapToCommandName = {
      '3004': 'treasuryApprovingAc',
      '3005': 'requestForAcClarification',
      '3006': 'processAcRejection',
    };
  }

  async start() {
    logger.info('✔ Scheduler started');

    await this.run();

    setInterval(() => this.run, this.interval);
  }

  private generateKafkaMessageOut(treasuryContract: ITreasuryContract): IOut {
    const { id_dok, status, descr, st_date, reg_nom, reg_date } = treasuryContract;

    const ocid = id_dok.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
    const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');

    const kafkaMessageOut: IOut = {
      id: uuid(),
      command: this.statusCodesMapToCommandName[status],
      data: {
        cpid,
        ocid,
        verification: {
          value: status,
          rationale: descr,
        },
        dateMet: st_date,
      },
      version: '0.0.1',
    };

    if (status === '3005') kafkaMessageOut.data.regData = { reg_nom, reg_date };

    return kafkaMessageOut;
  }

  private async doContractProcessing(statusCode: TStatusCode, treasuryContract: ITreasuryContract) {
    try {
      const contractId = treasuryContract.id_dok;

      if (treasuryContract.status !== statusCode) {
        logger.error('🗙 Error in scheduler treasuryContract.status not equal verifiable statusCode');
        return;
      }

      if (!this.contractIdPattern.test(contractId)) return;

      const sentContract = await db.isExist(dbConfig.tables.treasuryRequests, { field: 'id_doc', value: contractId });

      if (!sentContract.exists) return;

      const { status } = treasuryContract;

      await db.insertToTreasureResponses({
        id_doc: contractId,
        status_code: status,
        message: treasuryContract,
        ts_in: Date.now(),
      });

      const contractIsCommitted = await this.commitContract(contractId);

      if (!contractIsCommitted) return;

      const kafkaMessageOut = this.generateKafkaMessageOut(treasuryContract);

      await db.insertToResponses({
        id_doc: contractId,
        cmd_id: kafkaMessageOut.id,
        cmd_name: kafkaMessageOut.command,
        message: kafkaMessageOut,
      });

      await this.sendResponse(contractId, kafkaMessageOut);
    } catch (error) {
      logger.error('🗙 Error in scheduler doContractProcessing: ', error);
    }
  }

  private async sendResponse(contractId: string, kafkaMessageOut: IOut) {
    OutProducer.send([
      {
        topic: kafkaOutProducerConfig.outTopic,
        messages: JSON.stringify(kafkaMessageOut),
      },
    ], async error => {
      if (error) return logger.error('🗙 Error in scheduler - producer: ', error);

      // Update timestamp commit in treasure_in table
      const result = await db.updateRow({
        table: dbConfig.tables.responses,
        contractId,
        columns: {
          ts: Date.now(),
        },
      });

      if (result.rowCount !== 1) {
        logger.error(`🗙 Error in scheduler sendResponse - producer: Can't update timestamp in responses table for id_doc ${contractId}. Seem to be column timestamp already filled`)
        return;
      }
    });
  }

  private async sendNotSentResponses() {
    try {
      const notSentContractsMessages = await db.getNotSentMessages({ launch: false });

      for (const row of notSentContractsMessages) {
        await this.sendResponse(row.id_doc, row.message);
      }
    } catch (error) {
      logger.error('🗙 Error in scheduler sendNotSentResponses: ', error);
    }
  }

  private async commitContract(contractId: string) {
    try {
      const res = await fetchContractCommit(contractId);

      if (!res) return;

      const result = await db.updateRow({
        table: dbConfig.tables.treasuryResponses,
        contractId,
        columns: {
          ts_commit: Date.now(),
        },
      });

      if (result.rowCount !== 1) {
        logger.error(`🗙 Error in scheduler commitContract: Can't update timestamp in treasuryResponses table for id_doc ${contractId}. Seem to be column timestamp already filled`)
        return;
      }

      return true;
    } catch (error) {
      logger.error('🗙 Error in scheduler commitContract: ', error);
    }
  }

  private async commitNotCommittedContracts() {
    try {
      const notCommittedContracts = await db.getNotCommitteds();

      for (const row of notCommittedContracts) {
        await this.commitContract(row.id_doc);
      }
    } catch (error) {
      logger.error('🗙 Error in scheduler commitNotCommittedContracts: ', error);
    }
  }

  private async run() {
    try {
      await this.commitNotCommittedContracts();

      await this.sendNotSentResponses();

      for (const statusCode of Object.keys(this.statusCodesMapToCommandName) as TStatusCode[]) {
        const contractsQueue = await fetchContractsQueue(statusCode);

        if (!contractsQueue) continue;
        if (!contractsQueue.contract) continue;

        if (Array.isArray(contractsQueue.contract)) {
          for (const treasuryContract of contractsQueue.contract) {
            await this.doContractProcessing(statusCode, treasuryContract);
          }
        }
        else {
          await this.doContractProcessing(statusCode, contractsQueue.contract);
        }
      }
    } catch (error) {
      logger.error('🗙 Error in scheduler run: ', error);
    }
  }
}
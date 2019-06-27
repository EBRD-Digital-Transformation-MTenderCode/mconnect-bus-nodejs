import { v4 as uuid } from 'uuid';

import db from '../dataBase';
import { OutProducer } from '../kafka';
import logger from '../logger';

import { fetchContractsQueue, fetchContractCommit } from '../../api';

import { TStatusCode, TCommandName, IOut, ITreasuryContract } from '../../types';

import { dbConfig, kafkaOutProducerConfig } from '../../configs';

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
      '3004': 'proceedVerifiedAC',
      '3005': 'proceedAcClarification',
      '3006': 'proceedAcRejection',
    };
  }

  private async commitContract(contractId: string) {
    try {
      const res = await fetchContractCommit(contractId);

      if (!res) return;

      await db.updateContract({
        table: dbConfig.tables.treasuryResponses,
        contractId,
        columns: {
          ts_commit: Date.now(),
        },
      });

      return true;
    } catch (e) {
      console.log('!!!ERROR', e);
    }
  }

  private async sendResponse(contractId: string, kafkaMessageOut: IOut) {
    OutProducer.send([
      {
        topic: kafkaOutProducerConfig.outTopic,
        messages: JSON.stringify(kafkaMessageOut),
      },
    ], async (err) => {
      if (err) return console.log('!!!KAFKA_ERROR_Producer send message', err);

      // Update timestamp commit in treasure_in table
      await db.updateContract({
        table: dbConfig.tables.responses,
        contractId,
        columns: {
          ts: Date.now(),
        },
      });
    });
  }

  private async commitNotCommittedContracts() {
    try {
      const notCommittedContracts = await db.getNotCommittedContracts();

      for (const row of notCommittedContracts) {
        await this.commitContract(row.id_doc);
      }
    } catch (error) {
      console.log('!!!ERROR', error);
    }
  }

  private async sendNotSentResponses() {
    try {
      const notSentContractsMessages = await db.getNotSentContractsMessages({ launch: false });

      for (const row of notSentContractsMessages) {
        await this.sendResponse(row.id_doc, row.message);
      }
    } catch (error) {
      console.log('!!!ERROR', error);
    }
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

      if (treasuryContract.status !== statusCode) return;  // @TODO log error for not exist contract!!!
      if (this.contractIdPattern.test(contractId)) return;

      const sentContract = await db.contractIsExist(dbConfig.tables.treasuryRequests, {field: 'id_doc', value: contractId});

      if (!sentContract.exists) return; // @TODO log error for not exist contract!!!

      const { status } = treasuryContract;

      // Save to treasure_responses table
      db.insertContractToTreasureResponses({
        id_doc: contractId,
        status_code: status,
        message: treasuryContract,
        ts_in: Date.now(),
      });

      // Committed contract and update ts_commit in treasure_responses
      const contractIsCommitted = await this.commitContract(contractId);
      if (!contractIsCommitted) return;

      const kafkaMessageOut = this.generateKafkaMessageOut(treasuryContract);

      // Save to responses table
      await db.insertContractToResponses({
        id_doc: contractId,
        cmd_id: kafkaMessageOut.id,
        cmd_name: kafkaMessageOut.command,
        message: kafkaMessageOut,
      });

      await this.sendResponse(contractId, kafkaMessageOut);
    } catch (error) {
      console.log('!!!ERROR', error);
    }
  }

  async run() {
    logger.info('✔️Scheduler is running');

    setInterval(async () => {
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
            this.doContractProcessing(statusCode, contractsQueue.contract);
          }
        }
      } catch (error) {
        console.log('!!!ERROR', error);
      }
    }, this.interval);
  }
}
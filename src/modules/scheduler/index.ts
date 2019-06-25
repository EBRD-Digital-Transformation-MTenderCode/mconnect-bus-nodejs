import { v4 as uuid } from 'uuid';

import { fetchContractsQueue, fetchContractCommit } from '../../api';

import { IDatabase } from 'pg-promise';
import { IExtensions } from '../dataBase';
import { TStatusCode, IOut } from '../../types';

import { dbConfig } from '../../configs';

interface IStatusCodesMapToCommandName {
  '3000': '',
  '3001': 'launchACVerification',
  '3002': '',
  '3003': 'proceedVerifiedAC',
  '3005': 'proceedAcClarification',
}

export default class Scheduler {
  private readonly interval: number;
  private readonly statusCodes: TStatusCode[];
  private readonly contractIdPattern: RegExp;
  private readonly statusCodesMapToCommandName: IStatusCodesMapToCommandName;

  constructor(interval: number) {
    this.interval = interval;
    this.statusCodes = ['3000', '3001', '3002', '3003', '3005'];
    this.contractIdPattern = /^ocds-([a-z]|[0-9]){6}-[A-Z]{2}-[0-9]{13}-AC-[0-9]{13}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
    this.statusCodesMapToCommandName = {
      '3000': '',
      '3001': 'launchACVerification',
      '3002': '',
      '3003': 'proceedVerifiedAC',
      '3005': 'proceedAcClarification',
    };
  }

  private async doCommitNotCommittedContracts(db: IDatabase<IExtensions> & IExtensions) {
    try {
      const notCommittedContracts = await db.getNotCommittedContracts();

      for (const row of notCommittedContracts) {
        // const res = await fetchContractCommit(row.id_doc);
        // @TODO need change on prod
        const res = {
          id_dok: row.id_doc,
        };

        if (!res) continue;

        await db.updateContract({
          table: dbConfig.tables.treasuryRequests,
          contractId: row.id_doc,
          columns: {
            ts: Date.now(),
          },
        });
      }
    } catch (e) {
      console.log('!!!ERROR', e);
    }
  }

  async run(db: IDatabase<IExtensions> & IExtensions) {
    setInterval(async () => {
      await this.doCommitNotCommittedContracts(db);

      for (const statusCode of this.statusCodes) {
        const registeredContracts = await fetchContractsQueue(statusCode);

        if (!registeredContracts) continue;
        if (!registeredContracts.contract) continue;

        for (const treasuryContract of registeredContracts.contract) {
          const contractId = treasuryContract.id_dok;

          if (this.contractIdPattern.test(contractId)) continue;

          try {
            const checkResult = await db.contractIsExist(dbConfig.tables.treasuryRequests, contractId);

            if (!checkResult.exists) continue; // log error not exist contract!!!

            const { id_dok, id_hist, status, st_date, reg_nom, reg_date, descr } = treasuryContract;

            // Save to treasure_in table
            db.insertContractToTreasureResponses({
              id_doc: id_dok,
              status_code: status,
              message: treasuryContract,
              ts_in: Date.now(),
            });

            const res = await fetchContractCommit(contractId);

            if (!res) continue;

            const ocid = contractId.replace(/-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/, '');
            const cpid = ocid.replace(/-AC-[0-9]{13}$/, '');

            const kafkaMessageOut: IOut = {
              id: uuid(),
              command: this.statusCodesMapToCommandName[status],
              data: {
                cpid,
                ocid,
                id_dok,
                id_hist,
                status,
                st_date,
                reg_nom,
                reg_date,
                descr,
              },
              version: '0.0.1',
            };

            // @TODO send message to kafka topic out

            // Update timestamp commit in treasure_in table
            await db.updateContract({
              table: dbConfig.tables.treasuryResponses,
              contractId: res.id_dok,
              columns: {
                ts_commit: Date.now(),
              },
            });
          } catch (error) {
            console.log(`!!!ERROR_DB ${error}`);
          }
        }
      }
    }, this.interval);
  }
}
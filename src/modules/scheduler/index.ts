import { fetchContractsQueue } from '../../api';

import { IDatabase } from 'pg-promise';
import { IExtensions } from '../dataBase';
import { TStatusCode } from '../../types';

export default class Scheduler {
  private readonly interval: number;
  private readonly statusCodes: TStatusCode[];

  constructor(interval: number) {
    this.interval = interval;
    this.statusCodes = ['3000', '3001', '3002', '3003', '3005'];
  }

  async run(db: IDatabase<IExtensions> & IExtensions) {
    const idPattern = /^ocds-([a-z]|[0-9]){6}-[A-Z]{2}-[0-9]{13}-AC-[0-9]{13}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;

    setInterval(async () => {
      for (const statusCode of this.statusCodes) {
        const registeredContracts = await fetchContractsQueue(statusCode);

        if (!registeredContracts) continue;
        if (!registeredContracts.contract) continue;

        for (const contract of registeredContracts.contract) {
          const contractId = contract.id_dok;

          if (idPattern.test(contractId)) continue;

          try {
            const checkResult = await db.contractIsExist(contractId);

            if (!checkResult.exists) continue;

            await db.updateContract({ contractId, columns: { treasuryResponse: JSON.stringify(contract) } });
          } catch (error) {
            console.log(`!!!ERROR_DB ${error}`);
          }
        }
      }
    }, this.interval);
  }
}
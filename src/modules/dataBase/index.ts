import pgPromise, { IMain, IDatabase } from 'pg-promise';

import { dbConfig } from '../../configs';

import {
  IKafkaInRow,
  IKafkaOutRow,
  ITreasuryOutRow,
  ITreasuryInRow,
  TStatusCode,
  ITreasuryContract,
} from '../../types';
import { tsToPgTs } from '../../utils';

interface IUpdatingParams {
  table: string,
  contractId: string,
  columns: {
    [key: string]: string | number
  }
}

export interface IExtensions extends IDatabase<any> {
  getNotCommittedContracts(): Promise<ITreasuryOutRow[]>

  updateContract(updatingParams: IUpdatingParams): Promise<null>;

  contractIsExist(table: string, contractId: string): Promise<{ exists: boolean }>;

  getContract(table: string, contractId: string): Promise<IKafkaInRow | IKafkaOutRow | ITreasuryOutRow | ITreasuryInRow>;

  insertContractToTreasureIn(row: ITreasuryInRow): Promise<null>

  /*deleteContractFromQueue(contractId: string): Promise<null>;

  insertContractToHistory(contractId: string, ocid: string, messageIn: IIn, treasuryMessage: ITreasuryContract, messageOut: IOut): Promise<null>;*/
}

const pgPromiseInst: IMain = pgPromise({
  extend: (obj: IExtensions) => {
    const {
      kafkaIn: kafkaInTable,
      kafkaOut: kafkaOutTable,
      treasuryOut: treasuryOutTable,
      treasuryIn: treasuryInTable
    } = dbConfig.tables;

    obj.getNotCommittedContracts = () => {
      return obj.manyOrNone(`SELECT * FROM ${treasuryOutTable} WHERE timestamp IS NULL;`);
    };

    obj.updateContract = (updatingParams: IUpdatingParams) => {
      const { table, contractId, columns } = updatingParams;

      const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
        return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = ${key === 'timestamp' ? `to_timestamp(${tsToPgTs(+value)})` : `'${value}'`}`;
      }, '');

      return obj.none(`UPDATE ${table} SET ${columnsString} WHERE "id_doc" = '${contractId}'`);
    };

    obj.contractIsExist = (table: string, contractId: string) => {
      return obj.one(`SELECT EXISTS (SELECT 1 FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1)`);
    };

    obj.getContract = (table: string, contractId: string) => {
      return obj.one(`SELECT * FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1`);
    };

    obj.insertContractToTreasureIn = ({id_doc, status_code, message, timestamp_in}) => {
      return obj.none(`INSERT INTO ${treasuryInTable}(id_doc, status_code, message, timestamp_in) VALUES (${id_doc}, ${status_code}, ${JSON.stringify(message)}, to_timestamp(${tsToPgTs(+timestamp_in)}))`);
    };

    /*obj.insertContractToHistory = (contractId: string, ocid: string, messageIn: IIn, treasuryMessage: ITreasuryContract, messageOut: IOut) => {
      return db.none(`INSERT INTO ${historyTable}(
                            "contractId", ocid, "messageIn", "treasuryMessage", "messageOut"
                            ) VALUES (${contractId}, ${ocid}, ${JSON.stringify(messageIn)}, ${JSON.stringify(treasuryMessage)}, ${JSON.stringify(messageOut)})`)
    };

    obj.deleteContractFromQueue = (contractId: string) => {
      return obj.none(`DELETE FROM ${queueTable} WHERE "contractId" = '${contractId}'`);
    };

    */
  },
});

const { host, port, database, user, password } = dbConfig;

const db = pgPromiseInst({
  host,
  port,
  database,
  user,
  password,
}) as IDatabase<IExtensions> & IExtensions;

db.connect().then(obj => {
  console.log(`--> Connected to database`);
  obj.done();
}).catch(error => {
  console.log(`!!!DB_ERROR Event - ${error.message || error}`);
});

export default db;

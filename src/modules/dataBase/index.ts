import pgPromise, { IMain, IDatabase } from 'pg-promise';

import logger from '../logger';

import { dbConfig } from '../../configs';

import {
  IRequestsRow,
  IResponsesRow,
  ITreasuryRequestsRow,
  ITreasuryResponsesRow,
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
  insertContractToTreasureResponses(row: ITreasuryResponsesRow): Promise<null>;

  insertContractToResponses(row: IResponsesRow): Promise<null>;

  getNotCommittedContracts(): Promise<ITreasuryResponsesRow[] | []>

  getNotSentContractsMessages(): Promise<IResponsesRow[] | []>

  updateContract(updatingParams: IUpdatingParams): Promise<null>;

  contractIsExist(table: string, contractId: string): Promise<{ exists: boolean }>;

  getContract(table: string, contractId: string): Promise<IRequestsRow | IResponsesRow | ITreasuryRequestsRow | ITreasuryResponsesRow>;

}

const pgPromiseInst: IMain = pgPromise({
  extend: (obj: IExtensions) => {
    const {
      requests: requestsTable,
      responses: responsesTable,
      treasuryRequests: treasuryRequestsTable,
      treasuryResponses: treasuryResponsesTable,
    } = dbConfig.tables;

    obj.insertContractToTreasureResponses = ({ id_doc, status_code, message, ts_in }) => {
      return obj.none(`INSERT INTO ${treasuryResponsesTable}(id_doc, status_code, message, ts_in) VALUES (${id_doc}, ${status_code}, ${JSON.stringify(message)}, to_timestamp(${tsToPgTs(+ts_in)}))`);
    };

    obj.insertContractToResponses = ({ id_doc, cmd_id, cmd_name, message }) => {
      return obj.none(`INSERT INTO ${responsesTable}(id_doc, cmd_id, cmd_name, message) VALUES (${id_doc}, ${cmd_id}, ${cmd_name}, ${JSON.stringify(message)})`);
    };

    obj.getNotCommittedContracts = () => {
      return obj.manyOrNone(`SELECT * FROM ${treasuryResponsesTable} WHERE ts_commit IS NULL;`);
    };

    obj.getNotSentContractsMessages = () => {
      return obj.manyOrNone(`SELECT * FROM ${responsesTable} WHERE ts IS NULL`)
    };

    obj.updateContract = (updatingParams: IUpdatingParams) => {
      const { table, contractId, columns } = updatingParams;

      const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
        return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = ${key === 'ts' ? `to_timestamp(${tsToPgTs(+value)})` : `'${value}'`}`;
      }, '');

      return obj.none(`UPDATE ${table} SET ${columnsString} WHERE "id_doc" = '${contractId}'`);
    };

    obj.contractIsExist = (table: string, contractId: string) => {
      return obj.one(`SELECT EXISTS (SELECT 1 FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1)`);
    };

    obj.getContract = (table: string, contractId: string) => {
      return obj.one(`SELECT * FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1`);
    };
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
  logger.info( '✔️Connected to database');
  obj.done();
}).catch(error => {
  console.log(`!!!DB_ERROR Event - ${error.message || error}`);
});

export default db;

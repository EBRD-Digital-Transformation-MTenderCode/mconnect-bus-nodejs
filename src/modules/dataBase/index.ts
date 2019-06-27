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
  insertContractToRequests(row: IRequestsRow): Promise<null>;

  insertContractToTreasuryRequests(row: ITreasuryRequestsRow): Promise<null>;

  insertContractToTreasureResponses(row: ITreasuryResponsesRow): Promise<null>;

  insertContractToResponses(row: IResponsesRow): Promise<null>;

  getNotCommittedContracts(): Promise<ITreasuryResponsesRow[] | []>

  getNotSentContractsMessages({ launch }: { launch: boolean }): Promise<IResponsesRow[] | []>

  getNotRegisteredContracts(): Promise<ITreasuryRequestsRow[] | []>

  updateContract(updatingParams: IUpdatingParams): Promise<null>;

  contractIsExist(table: string, {field, value}: {field: string, value: string}): Promise<{ exists: boolean }>;

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

    obj.insertContractToRequests = ({ cmd_id, cmd_name, message, ts }) => {
      return obj.none(`INSERT INTO ${requestsTable}(cmd_id, cmd_name, message, ts) VALUES (${cmd_id}, ${cmd_name}, ${JSON.stringify(message)}, to_timestamp(${tsToPgTs(+ts)}))`);
    };

    obj.insertContractToTreasuryRequests = ({ id_doc, message }) => {
      return obj.none(`INSERT INTO ${treasuryRequestsTable}(id_doc, message) VALUES (${id_doc}, ${JSON.stringify(message)})`);
    };

    obj.insertContractToTreasureResponses = ({ id_doc, status_code, message, ts_in }) => {
      return obj.none(`INSERT INTO ${treasuryResponsesTable}(id_doc, status_code, message, ts_in) VALUES (${id_doc}, ${status_code}, ${JSON.stringify(message)}, to_timestamp(${tsToPgTs(+ts_in)}))`);
    };

    obj.insertContractToResponses = ({ id_doc, cmd_id, cmd_name, message }) => {
      return obj.none(`INSERT INTO ${responsesTable}(id_doc, cmd_id, cmd_name, message) VALUES (${id_doc}, ${cmd_id}, ${cmd_name}, ${JSON.stringify(message)})`);
    };

    obj.getNotCommittedContracts = () => {
      return obj.manyOrNone(`SELECT * FROM ${treasuryResponsesTable} WHERE ts_commit IS NULL;`);
    };

    obj.getNotSentContractsMessages = ({ launch }: { launch: boolean }) => {
      return obj.manyOrNone(`SELECT * FROM ${responsesTable} WHERE ts IS NULL AND cmd_name ${launch ? '=' : '!='} 'launchACVerification'`);
    };

    obj.getNotRegisteredContracts = () => {
      return obj.manyOrNone(`SELECT * FROM ${treasuryRequestsTable} WHERE ts IS NULL`);
    };

    obj.updateContract = (updatingParams: IUpdatingParams) => {
      const { table, contractId, columns } = updatingParams;

      const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
        return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = ${key === 'ts' ? `to_timestamp(${tsToPgTs(+value)})` : `'${value}'`}`;
      }, '');

      return obj.none(`UPDATE ${table} SET ${columnsString} WHERE "id_doc" = '${contractId}'`);
    };

    obj.contractIsExist = (table: string, {field, value}: {field: string, value: string | null | boolean}) => {
      const query = `SELECT EXISTS (SELECT 1 FROM ${table} WHERE ${field} = ${typeof value === 'string' ? `'${value}'`: value } LIMIT 1)`;
      logger.warn(query);
      return obj.one(query);
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
  logger.info('✔️Connected to database');
  obj.done();
}).catch(error => {
  console.log(`!!!DB_ERROR Event - ${error.message || error}`);
});

export default db;

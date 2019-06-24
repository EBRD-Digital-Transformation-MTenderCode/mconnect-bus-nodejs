import pgPromise, { IMain, IDatabase } from 'pg-promise';

import { dbConfig } from '../../configs';

import { IDbContract } from '../../types';

interface IUpdatingParams {
  contractId: string,
  columns: {
    [key: string]: string
  }
}

export interface IExtensions extends IDatabase<any> {
  contractIsExist(contractId: string): Promise<{ exists: boolean }>;

  getContract(contractId: string): Promise<IDbContract>;

  updateContract(updatingParams: IUpdatingParams): Promise<null>;
}

const pgPromiseInst: IMain = pgPromise({
  error: (error, e) => e.cn && console.log(`!!!DB_ERROR Connect URL - ${e.cn}`),
  extend: (obj: IExtensions) => {
    obj.contractIsExist = (contractId: string) => {
      return obj.one(`SELECT EXISTS (SELECT 1 FROM public.contracts WHERE "contractId" = '${contractId}' AND "treasuryResponse" IS NULL LIMIT 1);`);
    };

    obj.getContract = (contractId: string) => {
      return obj.one(`SELECT * FROM public.contracts WHERE "contractId" = '${contractId}' LIMIT 1`);
    };

    obj.updateContract = (updatingParams: IUpdatingParams) => {
      const { contractId, columns } = updatingParams;

      const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
        return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = '${value}'`;
      }, '');

      return obj.none(`UPDATE public.contracts SET ${columnsString} WHERE "contractId" = '${contractId}'`);
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
  console.log(`--> Connected to database`);
  obj.done();
}).catch(error => {
  console.log(`!!!DB_ERROR Event - ${error.message || error}`);
});

export default db;

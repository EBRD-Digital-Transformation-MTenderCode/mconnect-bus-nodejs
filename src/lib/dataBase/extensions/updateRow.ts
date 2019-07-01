import db from '../index';

import { tsToPgTs } from '../../../utils';

import { IResultExt } from 'pg-promise';

interface IUpdatingParams {
  table: string,
  contractId: string,
  columns: {
    [key: string]: string | number
  }
}

export type TUpdateRow = (updatingParams: IUpdatingParams) => Promise<IResultExt>

const updateRow: TUpdateRow = ({ table, contractId, columns }) => {
  const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
    return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = ${key === 'ts' || key === 'ts_commit' ? `to_timestamp(${tsToPgTs(+value)})` : `'${value}'`}`;
  }, '');

  const nullCondition: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
    return `${i !== 0 ? 'AND' : ''} "${key}" IS NULL`
  }, '');

  const query = `UPDATE ${table} SET ${columnsString} WHERE "id_doc" = '${contractId}' AND ${nullCondition} `;

  return db.result(query);
};

export default updateRow;
import db from '../index';

import { tsToPgTs } from '../../../utils';

interface IUpdatingParams {
  table: string,
  contractId: string,
  columns: {
    [key: string]: string | number
  }
}

export type TUpdateRow = (updatingParams: IUpdatingParams) => Promise<null>

const updateRow: TUpdateRow = ({ table, contractId, columns }) => {
  const columnsString: string = Object.entries(columns).reduce((accVal, [key, value], i) => {
    return `${accVal}${i !== 0 ? ', ' : ''}"${key}" = ${key === 'ts' ? `to_timestamp(${tsToPgTs(+value)})` : `'${value}'`}`;
  }, '');

  const query = `UPDATE ${table} SET ${columnsString} WHERE "id_doc" = '${contractId}'`;

  return db.none(query);
};

export default updateRow;
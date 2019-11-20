import { IResponsesRow, ITreasuryRequestsRow, ITreasuryResponsesRow } from 'types/db';
import db from '../index';

export type TGetRow = (
  table: string,
  contractId: string
) => Promise<IResponsesRow | ITreasuryRequestsRow | ITreasuryResponsesRow>;

const getRow: TGetRow = (table, contractId) => {
  const query = `SELECT * FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1`;

  return db.one(query);
};

export default getRow;

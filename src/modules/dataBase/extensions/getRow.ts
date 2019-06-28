import db from '../index';

import { IRequestsRow, IResponsesRow, ITreasuryRequestsRow, ITreasuryResponsesRow } from '../../../types';

export type TGetRow = (table: string, contractId: string) => Promise<IRequestsRow | IResponsesRow | ITreasuryRequestsRow | ITreasuryResponsesRow>;

const getRow: TGetRow = (table, contractId) => {
  const query = `SELECT * FROM ${table} WHERE "id_doc" = '${contractId}' LIMIT 1`;

  return db.one(query);
};

export default getRow;
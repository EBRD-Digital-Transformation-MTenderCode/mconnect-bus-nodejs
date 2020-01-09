import { dbConfig } from '../../../../configs';

import { ITreasuryResponsesRow } from '../../../../types/db';
import db from '../../index';

export type TGetNotCommitteds = () => Promise<ITreasuryResponsesRow[] | []>;

const getNotCommitteds: TGetNotCommitteds = () => {
  const treasuryResponsesTable = dbConfig.tables.treasuryResponses;

  const query = `SELECT * FROM ${treasuryResponsesTable} WHERE ts_commit IS NULL`;

  return db.manyOrNone(query);
};

export default getNotCommitteds;

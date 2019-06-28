import db from '../../index';

import { dbConfig } from '../../../../configs';

import { ITreasuryResponsesRow } from '../../../../types';

export type TGetNotCommitteds = () => Promise<ITreasuryResponsesRow[] | []>

const getNotCommitteds: TGetNotCommitteds = () => {
  const treasuryResponsesTable = dbConfig.tables.treasuryResponses;

  const query = `SELECT * FROM ${treasuryResponsesTable} WHERE ts_commit IS NULL`;

  return db.manyOrNone(query);
};

export default getNotCommitteds;
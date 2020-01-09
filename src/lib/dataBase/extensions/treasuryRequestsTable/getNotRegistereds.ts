import { dbConfig } from '../../../../configs';

import { ITreasuryRequestsRow } from '../../../../types/db';
import db from '../../index';

export type TGetNotRegistereds = () => Promise<ITreasuryRequestsRow[] | []>;

const getNotRegistereds: TGetNotRegistereds = () => {
  const treasuryRequestsTable = dbConfig.tables.treasuryRequests;

  const query = `SELECT * FROM ${treasuryRequestsTable} WHERE ts IS NULL`;

  return db.manyOrNone(query);
};

export default getNotRegistereds;

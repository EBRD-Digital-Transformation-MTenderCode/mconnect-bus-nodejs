import { dbConfig } from '../../../../configs';

import { ITreasuryRequestsRow } from '../../../../types/db';
import db from '../../index';

export type TInsertToTreasuryRequests = (row: ITreasuryRequestsRow) => Promise<null>;

const insertToTreasuryRequests: TInsertToTreasuryRequests = ({ id_doc, message }) => {
  const treasuryRequestsTable = dbConfig.tables.treasuryRequests;

  const query = `
    INSERT INTO ${treasuryRequestsTable}(id_doc, message)
    VALUES ('${id_doc}', '${JSON.stringify(message)}')
  `;

  return db.none(query);
};

export default insertToTreasuryRequests;

import { dbConfig } from '../../../../configs';

import db from '../../index';

export type TDeleteFromTreasureResponses = (id_doc: string) => Promise<null>;

const deleteFromTreasureResponses: TDeleteFromTreasureResponses = id_doc => {
  const treasuryResponsesTable = dbConfig.tables.treasuryResponses;

  const query = `
    DELETE FROM ${treasuryResponsesTable}
    WHERE id_doc='${id_doc}' AND ts_commit=NULL
  `;

  return db.none(query);
};

export default deleteFromTreasureResponses;

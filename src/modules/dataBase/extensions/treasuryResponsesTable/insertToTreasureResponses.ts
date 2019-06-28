import db from '../../index';

import { dbConfig } from '../../../../configs';

import { tsToPgTs } from '../../../../utils';

import { ITreasuryResponsesRow } from '../../../../types';

export type TInsertToTreasureResponses = (row: ITreasuryResponsesRow) => Promise<null>

const insertToTreasureResponses: TInsertToTreasureResponses = ({ id_doc, status_code, message, ts_in }) => {
  const treasuryResponsesTable = dbConfig.tables.treasuryResponses;

  const query = `
    INSERT INTO ${treasuryResponsesTable}(id_doc, status_code, message, ts_in) 
    VALUES ('${id_doc}', '${status_code}', '${JSON.stringify(message)}', to_timestamp(${tsToPgTs(+ts_in)}))
  `;

  return db.none(query);
};

export default insertToTreasureResponses;
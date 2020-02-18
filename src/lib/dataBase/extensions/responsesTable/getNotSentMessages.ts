import { dbConfig } from '../../../../configs';

import { IResponsesRow } from '../../../../types/db';
import db from '../../index';

export type TGtNotSentMessages = () => Promise<IResponsesRow[] | []>;

const getNotSentMessages: TGtNotSentMessages = () => {
  const responsesTable = dbConfig.tables.responses;

  const query = `
    SELECT * FROM ${responsesTable}
    WHERE ts IS NULL
  `;

  return db.manyOrNone(query);
};

export default getNotSentMessages;

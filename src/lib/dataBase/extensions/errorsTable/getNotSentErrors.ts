import { dbConfig } from '../../../../configs';

import { IErrorsRow } from '../../../../types/db';
import db from '../../index';

export type TGetNotSentErrors = () => Promise<IErrorsRow[] | []>;

const getNotSentErrors: TGetNotSentErrors = () => {
  const errorsTable = dbConfig.tables.errors;

  const query = `
    SELECT * FROM ${errorsTable}
    WHERE ts_send IS NULL;
  `;

  return db.manyOrNone(query);
};

export default getNotSentErrors;

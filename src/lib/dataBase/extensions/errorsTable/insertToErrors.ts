import { dbConfig } from '../../../../configs';

import { tsToPgTs } from '../../../../utils';

import { IErrorsRow } from '../../../../types/db';
import db from '../../index';

export type TInsertToErrors = (row: IErrorsRow) => Promise<null>;

const insertToErrors: TInsertToErrors = ({ id, hash, ts, data, message_kafka, fixed }) => {
  const errorsTable = dbConfig.tables.errors;

  const query = `
    INSERT INTO ${errorsTable}(id, hash, ts, data, message_kafka, fixed)
    VALUES (
      '${id}',
      '${hash}',
      to_timestamp(${tsToPgTs(ts)}),
      '${data}',
      '${JSON.stringify(message_kafka)}',
      ${fixed}
    );      
  `;

  return db.none(query);
};

export default insertToErrors;

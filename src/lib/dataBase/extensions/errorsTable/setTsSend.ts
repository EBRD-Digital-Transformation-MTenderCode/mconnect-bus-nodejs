import { IResultExt } from 'pg-promise';

import { dbConfig } from '../../../../configs';

import { tsToPgTs } from '../../../../utils';
import db from '../../index';

export type TSetTsSend = ({ id, ts_send }: { id: string; ts_send: number }) => Promise<IResultExt>;

const setTsSend: TSetTsSend = ({ id, ts_send }) => {
  const errorsTable = dbConfig.tables.errors;

  const query = `
    UPDATE ${errorsTable}
    SET "ts_send"=to_timestamp(${tsToPgTs(ts_send)})
    WHERE "id"='${id}' AND "ts_send" IS NULL;
  `;

  return db.result(query);
};

export default setTsSend;

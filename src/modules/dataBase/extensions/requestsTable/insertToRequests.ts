import db from '../../index';

import { dbConfig } from '../../../../configs';

import { tsToPgTs } from '../../../../utils';

import { IRequestsRow } from '../../../../types';


export type TInsertToRequests = (row: IRequestsRow) => Promise<null>

const insertToRequests: TInsertToRequests = ({ cmd_id, cmd_name, message, ts }) => {
  const requestTable = dbConfig.tables.requests;

  const query = `
    INSERT INTO ${requestTable}(cmd_id, cmd_name, message, ts) 
    VALUES ('${cmd_id}', '${cmd_name}', '${JSON.stringify(message)}', to_timestamp(${tsToPgTs(ts)}));
  `;

  return db.none(query);
};

export default insertToRequests;
import db from '../../index';

import { dbConfig } from '../../../../configs';

import { IResponsesRow } from '../../../../types/db';

export type TInsertToResponses = (row: IResponsesRow) => Promise<null>;

const insertToResponses: TInsertToResponses = ({ id_doc, cmd_id, cmd_name, message }) => {
  const responsesTable = dbConfig.tables.responses;

  const query = `
    INSERT INTO ${responsesTable}(id_doc, cmd_id, cmd_name, message) 
    VALUES ('${id_doc}', '${cmd_id}', '${cmd_name}', '${JSON.stringify(message)}')
  `;

  return db.none(query);
};

export default insertToResponses;
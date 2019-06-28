import db from '../../index';

import { dbConfig } from '../../../../configs';

import { IResponsesRow } from '../../../../types';

export type TGtNotSentMessages = ({ launch }: { launch: boolean }) => Promise<IResponsesRow[] | []>;

const getNotSentMessages: TGtNotSentMessages = ({ launch }) => {
  const responsesTable = dbConfig.tables.responses;

  const query = `
    SELECT * FROM ${responsesTable} 
    WHERE ts IS NULL AND cmd_name ${launch ? '=' : '!='} 'launchACVerification'
  `;

  return db.manyOrNone(query);
};

export default getNotSentMessages;
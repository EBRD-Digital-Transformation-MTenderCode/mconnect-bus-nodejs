import pgPromise, { IMain, IDatabase } from 'pg-promise';

import { extentions, IExtensions } from './extensions';

import logger from '../logger';

import { dbConfig } from '../../configs';

const pgPromiseInst: IMain = pgPromise({
  extend: (obj: IDatabase<IExtensions> & IExtensions) => {
    obj.insertToRequests = extentions.insertToRequests;
    obj.insertToTreasuryRequests = extentions.insertToTreasuryRequests;
    obj.insertToTreasureResponses = extentions.insertToTreasureResponses;
    obj.insertToResponses = extentions.insertToResponses;
    obj.getNotCommitteds = extentions.getNotCommitteds;
    obj.getNotRegistereds = extentions.getNotRegistereds;
    obj.getNotSentMessages = extentions.getNotSentMessages;
    obj.updateRow = extentions.updateRow;
    obj.isExist = extentions.isExist;
    obj.getRow = extentions.getRow;
  }
});

const { host, port, database, user, password } = dbConfig;

const db = pgPromiseInst({
  host,
  port,
  database,
  user,
  password,
}) as IDatabase<IExtensions> & IExtensions;

db.connect().then(obj => {
  logger.info('✔️Connected to database');
  obj.done();
}).catch(error => logger.error('🗙 Error connect to DB: ', error));

export default db;

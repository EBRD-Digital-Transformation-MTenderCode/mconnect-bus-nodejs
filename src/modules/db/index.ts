import pgPromise, { IMain } from 'pg-promise';

import { dbConfig } from '../../configs';

const connectUrl: string = `postgres://${dbConfig.userName}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.dbName}`;

const pgPromiseInst: IMain = pgPromise({
  error(error, e) {
    if (e.cn) {
      console.log(`!!!DB_ERROR Connect URL - ${e.cn}`);
    }
  },
});

const db = pgPromiseInst(connectUrl);

db.connect().then(obj => {
  console.log(`--> Connected to database`);
  obj.done();
}).catch(error => {
  console.log(`!!!DB_ERROR Event - ${error.message || error}`);
});

export default db;
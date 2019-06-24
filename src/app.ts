import db from './modules/dataBase';

import Scheduler from './modules/scheduler';

import './modules/kafka/in';

console.log(`--> App running`);

const scheduler = new Scheduler(5000);

//scheduler.run(db);

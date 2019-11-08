import { registrationSchedulerInterval, queueSchedulerInterval } from 'configs';

import Server from './modules/server';
import Scheduler from './modules/scheduler';
import Registrator from './modules/registrator';

import logger from './lib/logger';

logger.info('✔ mConnect Bus App is running');

const server = new Server();

server.start();

const registrator = new Registrator(1000 * 60 * registrationSchedulerInterval);

registrator.start();

const scheduler = new Scheduler(1000 * 60 * queueSchedulerInterval);

scheduler.start();

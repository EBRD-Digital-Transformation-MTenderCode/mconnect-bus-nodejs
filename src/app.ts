import { serviceConfig, registrationSchedulerInterval, queueSchedulerInterval } from './configs';

import Server from './modules/server';
import Scheduler from './modules/scheduler';
import Registrator from './modules/registrator';

import errorsHandler from './lib/errorsHandler';
import logger from './lib/logger';

logger.info(`✔ ${serviceConfig.name} v${serviceConfig.version} is running`);

const server = new Server();

server.start();

const registrator = new Registrator(1000 * 60 * registrationSchedulerInterval);

registrator.start();

const scheduler = new Scheduler(1000 * 60 * queueSchedulerInterval);

scheduler.start();

errorsHandler.checkNotSentErrors();

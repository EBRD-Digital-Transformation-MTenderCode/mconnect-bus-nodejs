import Scheduler from './modules/scheduler';
import Registrator from './modules/registrator';

import logger from './modules/logger';

logger.info('✔️mConnect Bus App is running');

const scheduler = new Scheduler(5000);

scheduler.run();

const registrator = new Registrator();

registrator.start();

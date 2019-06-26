import Scheduler from './modules/scheduler';

import logger from './modules/logger';

logger.info( '✔️mConnect Bus App is running');

const scheduler = new Scheduler(5000);

scheduler.run();

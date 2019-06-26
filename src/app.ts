import Scheduler from './modules/scheduler';

import { appLogger } from './modules/logger';

appLogger.info( '✔️mConnect Bus App is running');

const scheduler = new Scheduler(5000);

scheduler.run();

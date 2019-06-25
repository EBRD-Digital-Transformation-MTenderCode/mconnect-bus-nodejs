import Scheduler from './modules/scheduler';

console.log(`--> App running`);

const scheduler = new Scheduler(5000);

scheduler.run();

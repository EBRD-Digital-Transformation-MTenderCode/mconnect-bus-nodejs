import http from 'http';

import Scheduler from './modules/scheduler';
import Registrator from './modules/registrator';

import logger from './modules/logger';

import { serviceConfig } from './configs';

const { port } = serviceConfig;

http.createServer(function(req, res) {
  const { url } = req;

  if (url === '/actuator/health') {
    const healthCheckInfo = {
      status: 'UP',
    };

    res.writeHead(200, { 'Content-Type': 'application/vnd.spring-boot.actuator.v2+json;charset=UTF-8' });
    res.end(JSON.stringify(healthCheckInfo));
  }
  else {
    const errorMessage = {
      timestamp: Date.now(),
      status: 404,
      error: 'Not Found',
      message: 'No message available',
      path: url,
    };

    logger.error(`${errorMessage.status} ${errorMessage.error}. Path - ${errorMessage.path}, `, errorMessage);

    res.writeHead(404, { 'Content-Type': 'text/json' });
    res.end(JSON.stringify(errorMessage));
  }
}).listen(port, () => logger.info(`✔️mConnect Bus App is running at ${port} port`));

const scheduler = new Scheduler(5000);

scheduler.run();

const registrator = new Registrator();

registrator.start();

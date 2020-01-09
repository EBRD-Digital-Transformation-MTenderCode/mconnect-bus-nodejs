import http from 'http';

import { serviceConfig } from '../../configs';

import logger from '../../lib/logger';

export default class Server {
  start() {
    const { port } = serviceConfig;

    http
      .createServer((req, res) => {
        const { url } = req;

        if (url === '/actuator/health') {
          const healthCheckInfo = {
            status: 'UP'
          };

          res.writeHead(200, {
            'Content-Type': 'application/vnd.spring-boot.actuator.v2+json;charset=UTF-8'
          });
          res.end(JSON.stringify(healthCheckInfo));
        } else {
          const errorMessage = {
            timestamp: Date.now(),
            status: 404,
            error: 'Not Found',
            message: 'No message available',
            path: url
          };

          logger.error(`${errorMessage.status} ${errorMessage.error}. Path - "${errorMessage.path}". `, errorMessage);

          res.writeHead(404, { 'Content-Type': 'text/json' });
          res.end(JSON.stringify(errorMessage));
        }
      })
      .listen(port, () => logger.info(`✔ Server started at ${port} port`));
  }
}

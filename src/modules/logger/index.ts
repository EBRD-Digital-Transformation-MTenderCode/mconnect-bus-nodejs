import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { loggerConfig } from '../../configs';

const { format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

const logger = winston.createLogger({
  format: combine(timestamp(), json({ space: 2 })),
  transports: [
    new transports.Console({
      format: combine(
        timestamp({
          format: 'DD-MM-YYYY HH:mm:ss',
        }),
        colorize({ all: true }),
        printf(({ level, message, timestamp }) => `${level}: ${timestamp} --> ${message}`),
      ),
    }),
    // @ts-ignore
    new (transports.DailyRotateFile)({
      level: 'error',
      dirname: './logs',
      filename: 'errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH:mm',
      maxsize: `${loggerConfig.maxFileSizeMb}mb`,
      maxFiles: `${loggerConfig.maxFilesSaveDays}d`,
    }),
  ],
});

winston.addColors({ info: 'blue' });

export default logger;
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { loggerConfig } from '../../configs';

const { format, transports } = winston;
const { combine, timestamp, printf, colorize, align, errors } = format;

const errorFormat = printf(({ timestamp, stack, message }) => {
  const errorObject = {
    message: {
      errors: [
        {
          code: '',
          description: message,
        },
      ],
    },
    timestamp,
    stack,
  };

  return JSON.stringify(errorObject, null, 2);
});

const logger = winston.createLogger({
  format: timestamp({
    format: 'DD-MM-YYYY HH:mm:ss',
  }),
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        align(),
        printf(({ level, message, timestamp }) => `${level}: ${timestamp} --> ${message}`),
      ),
    }),
    // @ts-ignore
    new (transports.DailyRotateFile)({
      level: 'error',
      dirname: './logs',
      filename: 'errors-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxsize: `${loggerConfig.maxFileSizeMb}mb`,
      maxFiles: `${loggerConfig.maxFilesSaveDays}d`,
      format: combine(errors({ stack: true }), errorFormat),
    }),
  ],
});

winston.addColors({ info: 'blue' });

export default logger;
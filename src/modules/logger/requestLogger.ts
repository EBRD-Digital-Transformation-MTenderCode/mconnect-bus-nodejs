import * as winston from 'winston';

import { loggerConfig } from '../../configs';

const { loggers, format, transports } = winston;
const { combine, timestamp, printf, colorize, prettyPrint } = format;

loggers.add('requestLogger', {
  format: combine(timestamp(), prettyPrint()),
  transports: [
    new transports.Console({
      format: combine(
        timestamp({
          format: 'DD-MM-YYYY HH:mm:ss.ms',
        }),
        colorize({ all: true }),
        printf(({ level, message, timestamp }) => `${level}: ${timestamp} --> ${message}`),
      ),
    }),
    new transports.File({
      level: 'error',
      dirname: 'logs/request',
      filename: 'errors.log',
      maxsize: loggerConfig.maxFileSize,
      maxFiles: loggerConfig.maxFilesCount
    }),
  ],
});

export const requestLogger = loggers.get('requestLogger');
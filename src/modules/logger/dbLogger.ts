import * as winston from 'winston';

import { loggerConfig } from '../../configs';

const { loggers, format, transports } = winston;
const { combine, timestamp, printf, colorize, prettyPrint } = format;

loggers.add('dbLogger', {
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
      dirname: 'logs/db',
      filename: 'errors.log',
      maxsize: loggerConfig.maxFileSize,
      maxFiles: loggerConfig.maxFilesCount
    }),
  ],
});

export const dbLogger = loggers.get('dbLogger');
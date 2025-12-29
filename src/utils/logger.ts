import winston from 'winston';
import config from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  config.logging.format === 'json'
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
      })
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.serviceName },
  transports: [
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? winston.format.json() : winston.format.simple(),
    }),
  ],
});

// Add file transport in production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

export default logger;

import { createLogger, format, transports } from "winston";

const { printf, combine, colorize, timestamp, errors } = format;

const createDevLogger = () => {
  const devLogFormat = printf(
    (log) =>
      `${log.timestamp} ${log.level}: ${
        log.stack || typeof log.message === "object"
          ? JSON.stringify(log.message)
          : log.message
      }`
  );
  return createLogger({
    level: "verbose",
    format: combine(
      colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      errors({ stack: true }),
      devLogFormat
    ),
    transports: [new transports.Console()],
  });
};

export default createDevLogger;

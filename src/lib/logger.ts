import Logger from "https://deno.land/x/logger@v1.1.6/logger.ts";
import { 
  resolve,
  ensureDir
} from "../deps.ts";

const logger = new Logger();

const logPath = resolve("./", "assets", "log");

await ensureDir(logPath);

// rotate and maxBytes
// filename is [date]_[type].log.[timestamp]
// example: 2020-05-25_info.log.1590374415956
// Initialize the logger to write logs to a file located at `logPath`
// The file will rotate every time it reaches 10MB in size, and the maximum number of rotated files is set to 10.
// This means that the oldest rotated file will be deleted when a new file is created and the rotation count exceeds 10.
await logger.initFileLogger(logPath, {
  rotate: true,
  maxBytes: 10 * 1024 * 1024,
  maxBackupCount: 10
});

export { logger };

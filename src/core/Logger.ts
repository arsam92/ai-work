export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  constructor(private readonly prefix = "BLACK MILE") {}

  debug(message: string, ...data: unknown[]): void {
    console.debug(`[${this.prefix}] ${message}`, ...data);
  }

  info(message: string, ...data: unknown[]): void {
    console.info(`[${this.prefix}] ${message}`, ...data);
  }

  warn(message: string, ...data: unknown[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...data);
  }

  error(message: string, ...data: unknown[]): void {
    console.error(`[${this.prefix}] ${message}`, ...data);
  }
}

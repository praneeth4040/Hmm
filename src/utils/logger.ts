type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  }

  info(message: string) {
    console.log(this.formatMessage('info', message));
  }

  warn(message: string) {
    console.warn(this.formatMessage('warn', message));
  }

  error(message: string, error?: unknown) {
    const formatted = this.formatMessage('error', message);
    if (error instanceof Error) {
      console.error(formatted, error.stack);
    } else {
      console.error(formatted, error);
    }
  }

  debug(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('debug', message));
    }
  }
}

export const logger = new Logger();
export default logger;

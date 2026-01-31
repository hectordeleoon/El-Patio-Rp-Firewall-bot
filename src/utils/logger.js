const chalk = require('chalk');

class Logger {
  constructor() {
    this.prefix = '[El Patio RP]';
  }

  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  info(message, ...args) {
    console.log(
      chalk.blue(`${this.getTimestamp()} [INFO]`),
      this.prefix,
      message,
      ...args
    );
  }

  success(message, ...args) {
    console.log(
      chalk.green(`${this.getTimestamp()} [SUCCESS]`),
      this.prefix,
      message,
      ...args
    );
  }

  warn(message, ...args) {
    console.log(
      chalk.yellow(`${this.getTimestamp()} [WARN]`),
      this.prefix,
      message,
      ...args
    );
  }

  error(message, ...args) {
    console.error(
      chalk.red(`${this.getTimestamp()} [ERROR]`),
      this.prefix,
      message,
      ...args
    );
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        chalk.gray(`${this.getTimestamp()} [DEBUG]`),
        this.prefix,
        message,
        ...args
      );
    }
  }

  // Método especial para logs de eventos importantes
  event(eventName, details) {
    console.log(
      chalk.cyan(`${this.getTimestamp()} [EVENT]`),
      this.prefix,
      chalk.bold(eventName),
      details || ''
    );
  }
}

module.exports = new Logger();

import { configure, getLogger } from 'log4js';
import { performance } from 'perf_hooks';

const MEGABYTE = 1000000;

configure({
  appenders: {
    console: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern: '%[%c%] %m',
      },
    },
    app: {
      type: 'file',
      filename: 'log/app.log',
      maxLogSize: MEGABYTE,
      backups: 3,
      compress: true,
      keepFileExt: true,
    },
  },
  categories: {
    default: {
      appenders: ['console'],
      level: 'info',
    },
    app: {
      appenders: ['console', 'app'],
      level: 'info',
    },
  }
});

export let logApp = getLogger('app');

type ArrowFunction<A = any, R = any> = (...args: A[]) => R;

export function withLogger<T extends ArrowFunction>(f: T): (...args: Parameters<T>) => ReturnType<T>;

export function withLogger(f: Function) {
  return (...args: unknown[]) => {
    let nowMark = performance.now();

    let result = f(...args);
    let name = f.name;

    if (result instanceof Promise) {
      return result
        .then(res => {
          let perf = Math.floor((performance.now() - nowMark) * 100) / 100;
          logApp.info(name, 'perf:', perf + 'ms');

          return res;
        })
        .catch(err => {
          logApp.error(name, err);

          return Promise.reject(err);
        })
    }

    return result;
  }
}
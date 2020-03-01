import { CronJob } from 'cron';
import { logApp, withLogger } from './logger/withLogger';

export const startCronJob = withLogger(
  function startCronJob(callback: () => unknown): CronJob {
    let logNextUpdate = (job: CronJob, message: string = '') => {
      logApp.info(
        message + 'Next update on',
        job.nextDate()
          .local()
          .utc()
          .format()
        );
    }

    let job = new CronJob(
      process.env.JOB_PLAN || '* * * * * *',
      (...args) => {
        logNextUpdate(job)
        callback(...args);
      },
    );

    job.start();

    logNextUpdate(job, 'Start CRON Job.');

    return job;
  }
);

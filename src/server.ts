import { createServer } from 'http';
import { logApp } from './logger/withLogger';
import { compose } from './compose';
import { api } from './request/api';

export const initServer = compose(
  function initServer() {
    createServer(function (request, response) {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('With Love From @pabelebly', 'utf-8');
    }).listen(process.env.PORT);
    logApp.info(`Server running at port ${process.env.PORT}`);
  },
  function startKeepAlive() {
    const IDLING_HACK = 20 * 60 * 1000; // load every 20 minutes

    setInterval(
      () => api.get(process.env.URL),
      IDLING_HACK
    );
  }
)

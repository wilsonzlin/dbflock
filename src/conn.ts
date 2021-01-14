import pgPromise from 'pg-promise';
import {URL} from 'url';

export interface IDatabaseConnectionConfig {
  user: string;
  password: string;
  SSL?: boolean;
  host: string;
  port?: number;
  database: string;
  schema?: string;
}

const config = {};
const create = pgPromise(config);
const monitor = require('pg-monitor');
let monitorEnabled = false;

export const enableMonitor = (): void => {
  if (!monitorEnabled) {
    monitor.attach(config);
    monitorEnabled = true;
  }
};

export const parseConnectionURI = (uri: string): IDatabaseConnectionConfig => {
  let {
    username: user,
    password,
    hostname: host,
    port: portRaw,
    pathname,
    searchParams,
  } = new URL(uri);

  if (!user || !password || !host || !pathname) {
    throw new SyntaxError(`Invalid connection URI`);
  }
  user = decodeURIComponent(user);
  password = decodeURIComponent(password);

  let port: number | undefined;
  if (portRaw) {
    port = Number.parseInt(portRaw, 10);
  }

  if (!/^\/[^\/]+$/.test(pathname)) {
    throw new SyntaxError(`Invalid connection URI`);
  }
  const database = decodeURIComponent(pathname.slice(1));

  const sslParam = searchParams.get('ssl');
  const SSL = sslParam != undefined && !['false', '0', 'n', 'no', 'off', 'f'].includes(sslParam.toLowerCase());

  const schema = searchParams.get('schema') || undefined;

  return {
    user, password, SSL, host, port, database, schema,
  };
};

export const connect = (db: IDatabaseConnectionConfig): pgPromise.IDatabase<any> => {
  const opt = {
    database: db.database,
    host: db.host,
    password: db.password,
    port: db.port,
    user: db.user,
  };

  if (monitorEnabled) {
    console.debug(`Connecting to database:`);
    console.debug(opt);
  }

  return create(opt);
};

import pgPromise from "pg-promise";

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
const monitor = require("pg-monitor");
let monitorEnabled = false;

export function enableMonitor (): void {
  if (!monitorEnabled) {
    monitor.attach(config);
    monitorEnabled = true;
  }
}

export function disableMonitor (): void {
  if (monitorEnabled) {
    monitor.detach();
    monitorEnabled = false;
  }
}

export function connect (db: IDatabaseConnectionConfig): pgPromise.IDatabase<any> {
  let opt = {
    database: db.database,
    host: db.host,
    password: db.password,
    port: db.port,
    user: db.user,
  };

  console.debug(`Connecting to database:`);
  console.debug(opt);

  return create(opt);
}

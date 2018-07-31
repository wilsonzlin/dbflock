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

export function enableMonitor(): void {
  monitor.attach(config);
}

export function disableMonitor() :void {
  monitor.detach();
}

export function connect(db: IDatabaseConnectionConfig): pgPromise.IDatabase<any> {
  let opt = {
    database: db.database,
    host: db.host,
    password: db.password,
    port: db.port,
    user: db.user,
  };

  return create(opt);
}

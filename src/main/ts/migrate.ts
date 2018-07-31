import pgPromise from "pg-promise";
import * as fs from "fs";
import * as Path from "path";
import {connect, IDatabaseConnectionConfig} from "./conn";

interface ISchemaVersion {
  version: number;
  upgrade?: string;
  downgrade?: string;
  absolute?: string;
}

type ISchemaVersions = {
  [version: number]: ISchemaVersion;
};

const SCHEMA_FILE_TYPES: { [file: string]: keyof ISchemaVersion } = {
  "down.sql": "downgrade",
  "up.sql": "upgrade",
  "abs.sql": "absolute",
};

export class MigrationAssistant {
  private readonly schemaVersions: ISchemaVersions;
  private readonly c: pgPromise.IDatabase<any>;

  private static readonly DATABASE_SCHEMA_HISTORY_TABLE = "DatabaseSchemaHistory";

  constructor (db: IDatabaseConnectionConfig, schemasDir: string) {
    this.schemaVersions = Object.assign({}, ...fs.readdirSync(schemasDir)
      .map(v => {
        let version: ISchemaVersion = {
          version: Number.parseInt(v, 10),
        };

        for (let file of fs.readdirSync(Path.join(schemasDir, v))) {
          let path = Path.join(schemasDir, v, file);

          let type = SCHEMA_FILE_TYPES[file];

          if (!type) {
            throw new TypeError(`Unrecognised schema file "${path}"`);
          }

          version[type] = fs.readFileSync(path, "utf8");
        }

        return {
          [version.version]: version,
        };
      })
    );

    this.c = connect(db);
  }

  async ensureHistoryTableExists (): Promise<void> {
    await this.c.any(`CREATE TABLE IF NOT EXISTS ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (
      time TIMESTAMP NOT NULL DEFAULT NOW(),
      version BIGINT NOT NULL CHECK (version > 0),
      successful BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (date)
    )`);
  }

  async getCurrentVersion (): Promise<number | null> {
    await this.ensureHistoryTableExists();
    let res = await this.c.any(
      `SELECT version from ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} ORDER BY time DESC LIMIT 1`);
    if (!res.length) {
      return null;
    }
    return res[0].version;
  }

  async applySchemaAbsolutely (schema: ISchemaVersion): Promise<void> {
    if (schema.absolute === undefined) {
      throw new ReferenceError(`Schema version ${schema.version} has no absolute script`);
    }
    await this.c.query(schema.absolute);
  }

  async upgradeToSchema (schema: ISchemaVersion): Promise<void> {
    if (schema.upgrade === undefined) {
      throw new ReferenceError(`Schema version ${schema.version} has no upgrade script`);
    }
    await this.c.query(schema.upgrade);
  }

  async downgradeFromSchema (schema: ISchemaVersion): Promise<void> {
    if (schema.downgrade === undefined) {
      throw new ReferenceError(`Schema version ${schema.version} has no downgrade script`);
    }
    await this.c.query(schema.downgrade);
  }

  private getSchema (version: number): ISchemaVersion {
    let schema = this.schemaVersions[version];
    if (!schema) {
      throw new ReferenceError(`Schema version ${version} does not exist`);
    }
    return schema;
  }

  private getSchemasForDowngrade (from: number, to: number): ISchemaVersion[] {
    let schemas = [];

    for (let v = from; v > to; v--) {
      schemas.push(this.getSchema(v));
    }

    return schemas;
  }

  private getSchemasForUpgrade (from: number, to: number): ISchemaVersion[] {
    let schemas = [];

    for (let v = from + 1; v <= to; v++) {
      schemas.push(this.getSchema(v));
    }

    return schemas;
  }

  private async recordStartOfMigration (to: number): Promise<Date> {
    let res = await this.c.one(`INSERT INTO ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (version) VALUES ($1)`,
      [to]);
    return res.time;
  }

  private async recordSuccessfulMigration (timestamp: Date): Promise<void> {
    await this.c.none(
      `UPDATE ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} SET successful = TRUE WHERE time = $1`, [timestamp]);
  }

  async migrate (toVersion: number): Promise<void> {
    let fromVersion = await this.getCurrentVersion();

    if (toVersion === fromVersion) {
      // Current version already meets requirements
      return;
    }

    let abs = fromVersion === null;
    let down = !abs && fromVersion! > toVersion;

    let schemas = abs ? [this.getSchema(toVersion)] :
      this[down ? "getSchemasForDowngrade" : "getSchemasForUpgrade"](fromVersion!, toVersion);

    let migrationTimestamp = await this.recordStartOfMigration(toVersion);
    for (let schema of schemas) {
      await this[abs ? "applySchemaAbsolutely" : down ? "downgradeFromSchema" : "upgradeToSchema"](schema);
    }
    await this.recordSuccessfulMigration(migrationTimestamp);
  }
}

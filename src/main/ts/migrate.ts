import * as fs from 'fs';
import * as Path from 'path';
import pgPromise from 'pg-promise';
import {connect, IDatabaseConnectionConfig} from './conn';

interface ISchemaVersion {
  version: number;
  upgrade?: string;
  downgrade?: string;
  absolute?: string;
}

interface IUpgradePathUnit {
  version: number;
  schema: string;
}

type ISchemaVersions = {
  [version: number]: ISchemaVersion;
};

const SCHEMA_FILE_TYPES: { [file: string]: keyof ISchemaVersion } = {
  'down.sql': 'downgrade',
  'up.sql': 'upgrade',
  'abs.sql': 'absolute',
};

export class MigrationAssistant {
  private static readonly DATABASE_SCHEMA_HISTORY_TABLE = '__dbflock_migration_history';
  private readonly schemaVersions: ISchemaVersions | null;
  private readonly c: pgPromise.IDatabase<any>;

  constructor (db: IDatabaseConnectionConfig, schemasDir: string | null) {
    this.schemaVersions = schemasDir && Object.assign({}, ...fs.readdirSync(schemasDir)
      .map(v => {
        const version: any = {
          version: Number.parseInt(v, 10),
        };

        for (let file of fs.readdirSync(Path.join(schemasDir, v))) {
          const path = Path.join(schemasDir, v, file);

          const type = SCHEMA_FILE_TYPES[file];

          if (!type) {
            throw new TypeError(`Unrecognised schema file "${path}"`);
          }

          version[type] = fs.readFileSync(path, 'utf8');
        }

        return {
          [version.version]: version,
        };
      }),
    );

    this.c = connect(db);
  }

  getSchema (version: number): ISchemaVersion {
    if (!this.schemaVersions) {
      throw new ReferenceError(`Schema versions not initialised`);
    }

    let schema = this.schemaVersions[version];
    if (!schema) {
      throw new ReferenceError(`Schema version ${version} does not exist`);
    }
    return schema;
  }

  async getCurrentVersion (): Promise<number | null> {
    await this.ensureHistoryTableExists();
    const res = await this.c.oneOrNone(
      `SELECT version from ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} WHERE successful = TRUE ORDER BY time DESC LIMIT 1`);
    return res && res.version;
  }

  async setCurrentVersion (version: number): Promise<void> {
    // getCurrentVersion will ensure table exists
    if (await this.getCurrentVersion() !== version) {
      await this.c.none(
        `INSERT INTO ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (version, successful) VALUES ($1, TRUE)`,
        [version]);
    }
  }

  buildMigrationPath (from: number | null, to: number): IUpgradePathUnit[] {
    if (from === null) {
      const {absolute, version} = this.getSchema(to);
      if (absolute === undefined) {
        throw new ReferenceError(`Schema version ${version} has no absolute script`);
      }
      return [{version, schema: absolute}];
    }

    const schemas = [];

    if (from > to) {
      // Downgrade
      for (let v = from; v > to; v--) {
        const {downgrade, version} = this.getSchema(v);
        if (downgrade === undefined) {
          throw new ReferenceError(`Schema version ${version} has no downgrade script`);
        }
        schemas.push({version, schema: downgrade});
      }

    } else {
      // Upgrade
      for (let v = from + 1; v <= to; v++) {
        const {upgrade, version} = this.getSchema(v);
        if (upgrade === undefined) {
          throw new ReferenceError(`Schema version ${version} has no upgrade script`);
        }
        schemas.push({version, schema: upgrade});
      }
    }

    return schemas;
  }

  async migrate (toVersion: number): Promise<void> {
    const fromVersion = await this.getCurrentVersion();

    console.info(`Currently on version ${fromVersion}`);
    console.warn(`Targeting version ${toVersion}`);

    if (toVersion === fromVersion) {
      // Current version already meets requirements
      return;
    }

    const schemas = this.buildMigrationPath(fromVersion, toVersion);

    for (const schema of schemas) {
      console.log(`Starting migration to version ${schema.version}...`);
      const migrationID = await this.recordStartOfMigration(schema.version);
      await this.c.none(schema.schema);
      await this.recordSuccessfulMigration(migrationID);
      console.info(`Migrated to version ${schema.version}`);
    }
  }

  private async ensureHistoryTableExists (): Promise<void> {
    await this.c.none(`CREATE TABLE IF NOT EXISTS ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (
      id SERIAL NOT NULL,
      time TIMESTAMP NOT NULL DEFAULT NOW(),
      version INT NOT NULL CHECK (version >= 0),
      successful BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (id)
    )`);
  }

  private async recordStartOfMigration (to: number): Promise<number> {
    let res = await this.c.one(
      `INSERT INTO ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (version) VALUES ($1) RETURNING id`,
      [to]);
    return res.id;
  }

  private async recordSuccessfulMigration (id: number): Promise<void> {
    await this.c.none(
      `UPDATE ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} SET successful = TRUE WHERE id = $1`, [id]);
  }
}

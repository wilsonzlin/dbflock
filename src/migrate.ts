import { readdir, readFile } from "fs/promises";
import { join } from "path";
import * as pg from "pg";

interface ISchemaVersion {
  apply?: string;
  revert?: string;
}

interface IMigrationPathUnit {
  version: number;
  script: string;
}

const readFileIfExists = async (path: string) => {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      return;
    }
    throw err;
  }
};

type Logger = (msg: string) => void;

export type ClientConfig = pg.ClientConfig & { useNative?: boolean };

export class MigrationAssistant {
  private static readonly DATABASE_SCHEMA_HISTORY_TABLE =
    "dbflock_migration_history";

  static async withConnectionOnly(
    clientConfig?: ClientConfig,
    logger?: Logger
  ) {
    return new MigrationAssistant(clientConfig, [], logger);
  }

  static async fromSchemasDir(
    dir: string,
    clientConfig?: ClientConfig,
    logger?: Logger
  ) {
    const schemas: ISchemaVersion[] = [];
    const dirents = await readdir(dir);
    await Promise.all(
      dirents.map(async (dirent) => {
        const version = Number.parseInt(dirent, 10);
        if (!Number.isSafeInteger(version) || version < 0) {
          return;
        }
        const [apply, revert] = await Promise.all([
          readFileIfExists(join(dir, dirent, "apply.sql")),
          readFileIfExists(join(dir, dirent, "revert.sql")),
        ]);
        schemas[version] = { apply, revert };
      })
    );
    return new MigrationAssistant(clientConfig, schemas, logger);
  }

  constructor(
    private readonly clientConfig: ClientConfig | undefined,
    private readonly schemas: ISchemaVersion[],
    private readonly logger?: (msg: string) => void
  ) {}

  private async connectAndQuery(query: string, params?: (string | number)[]) {
    const config = this.clientConfig;
    let client: pg.Client;
    if (config?.useNative) {
      if (!pg.native) {
        throw new Error("pg native bindings are not available");
      }
      client = new pg.native.Client(config);
    } else {
      client = new pg.Client(config);
    }

    await client.connect();

    try {
      return await client.query(query, params);
    } finally {
      await client.end();
    }
  }

  async getCurrentVersion(): Promise<number | null> {
    await this.ensureHistoryTableExists();
    const res = await this.connectAndQuery(
      `SELECT version from ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} WHERE successful = TRUE ORDER BY time DESC LIMIT 1`
    ).then((q) => q.rows[0]);
    return res?.version ?? null;
  }

  async setCurrentVersion(version: number): Promise<void> {
    // getCurrentVersion will ensure table exists
    if ((await this.getCurrentVersion()) !== version) {
      await this.connectAndQuery(
        `INSERT INTO ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (version, successful) VALUES ($1, TRUE)`,
        [version]
      );
    }
  }

  buildMigrationPath(from: number, to: number): IMigrationPathUnit[] {
    const path = [];

    if (from > to) {
      // Downgrade
      for (let v = from; v > to; v--) {
        const revert = this.schemas[v]?.revert;
        if (revert === undefined) {
          throw new ReferenceError(`Schema version ${v} has no revert script`);
        }
        path.push({ version: v, script: revert });
      }
    } else {
      // Upgrade
      for (let v = from + 1; v <= to; v++) {
        const apply = this.schemas[v]?.apply;
        if (apply === undefined) {
          throw new ReferenceError(`Schema version ${v} has no apply script`);
        }
        path.push({ version: v, script: apply });
      }
    }

    return path;
  }

  async migrate(toVersion: number = this.schemas.length - 1): Promise<void> {
    const fromVersion = await this.getCurrentVersion();

    this.logger?.(`Currently on version ${fromVersion}`);
    this.logger?.(`Targeting version ${toVersion}`);

    if (toVersion === fromVersion) {
      // Current version already meets requirements
      this.logger?.(`No migration necessary`);
      return;
    }

    const path = this.buildMigrationPath(fromVersion ?? -1, toVersion);

    for (const { version, script } of path) {
      this.logger?.(`Starting migration to version ${version}...`);
      const migrationID = await this.recordStartOfMigration(version);
      await this.connectAndQuery(script);
      await this.recordSuccessfulMigration(migrationID);
      this.logger?.(`Migrated to version ${version}`);
    }
  }

  private async ensureHistoryTableExists(): Promise<void> {
    await this
      .connectAndQuery(`CREATE TABLE IF NOT EXISTS ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (
      id SERIAL NOT NULL,
      time TIMESTAMP NOT NULL DEFAULT NOW(),
      version INT NOT NULL CHECK (version >= 0),
      successful BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (id)
    )`);
  }

  private async recordStartOfMigration(to: number): Promise<number> {
    const res = await this.connectAndQuery(
      `INSERT INTO ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} (version) VALUES ($1) RETURNING id`,
      [to]
    ).then((q) => q.rows[0]);
    return res.id;
  }

  private async recordSuccessfulMigration(id: number): Promise<void> {
    await this.connectAndQuery(
      `UPDATE ${MigrationAssistant.DATABASE_SCHEMA_HISTORY_TABLE} SET successful = TRUE WHERE id = $1`,
      [id]
    );
  }
}

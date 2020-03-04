# dbflock

Run SQL scripts to upgrade and downgrade database schemas. Currently only works for PostgreSQL.

## How it works

dbflock works on a directory of sequentially-numbered integer schema versions, with each version being a folder containing three scripts:

- down.sql: script to execute when downgrading to the previous version 
- up.sql: script to execute when upgrading from the previous version
- abs.sql: script to execute on a new clean database

dbflock can then migrate to a version by applying scripts in order for all versions between the current and target.

For example, if the current database schema version is 12 and the target is 10, `12/down.sql` and `11/down.sql` will be applied in that order.
 
If the current database schema version is 12 and the target is 14, `13/up.sql` and `14/up.sql` will be applied in that order.

The current version, and a history of schema migrations, are stored in a table called `__dbflock_migration_history`, which is created automatically. 

## Usage

### Get the CLI

dbflock is a [Node.js](https://nodejs.org) application available on [npm](https://npmjs.org/package/dbflock), so Node.js is required. To install it globally as a command line application:

```bash
npm i -g dbflock
```

Make sure that npm's `bin` directory is in the `PATH` environment variable. The directory can be found using `npm bin -g`.

### Migrate to a schema version

The migration behaviour is described in the [How it works](#how-it-works) section. If there is no current schema version, only `abs.sql` for the target version will be applied.

For full options, see `dbflock migrate --help`.

```bash
dbflock migrate \
  -s /path/to/schemas/ \
  -c postgres://admin:admin@localhost/db?schema=schema \
  -v 42
```

### Set the current specific schema version

This can be useful if the current database is already a specific schema version due to application manually or through other tools.

**This does not apply any schema, and only updates the current schema version recorded in dbflock's internal table.**

For full options, see `dbflock set --help`.

```bash
dbflock set \
  -c postgres://admin:admin@localhost/db?schema=schema \
  -v 42
```

### Get the current specific schema version

For full options, see `dbflock get --help`.

```bash
dbflock get \
  -c postgres://admin:admin@localhost/db?schema=schema
```

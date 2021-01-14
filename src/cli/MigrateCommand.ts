import * as sacli from 'sacli';
import {enableMonitor, parseConnectionURI} from '../conn';
import {MigrationAssistant} from '../migrate';
import {handleCLIResult} from './handleCLIResult';

export interface IMigrateCommand {
  schemas: string;
  connection: string;
  version: number;
  debug: boolean;
}

export const MigrateCommand: sacli.Command = {
  name: 'migrate',
  description: 'Upgrade/downgrade/apply a database schema to a different version.',
  options: [
    {
      alias: 's',
      name: 'schemas',
      type: String,
      typeLabel: '{underline dir}',
      description: 'Directory containing schema versions.',
    },
    {
      alias: 'c',
      name: 'connection',
      type: String,
      typeLabel: '{underline URI}',
      description: 'Complete database connection URI in the form {bold.underline provider}://{bold.underline user}:{bold.underline password}@{bold.underline host}:{bold.underline port}/{bold.underline db}?schema={bold.underline schema}&ssl={bold.underline true} (e.g. {italic postgres://root:test@localhost:5432/mydatabase?schema=public&ssl=false})',
    },
    {
      alias: 'v',
      name: 'version',
      type: Number,
      typeLabel: '{underline natural}',
      description: 'Schema version to migrate to.',
    },
    {
      alias: 'd',
      name: 'debug',
      type: Boolean,
      description: 'Show data transferred between dbflock and the database.',
    },
  ],
  action: ({schemas, version, connection, debug}: IMigrateCommand) => {
    if (schemas == undefined || version == undefined || connection == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    const conn = parseConnectionURI(connection);

    if (debug) {
      enableMonitor();
    }

    handleCLIResult(new MigrationAssistant(conn, schemas).migrate(version));
  },
};

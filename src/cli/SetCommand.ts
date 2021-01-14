import * as sacli from 'sacli';
import {enableMonitor, parseConnectionURI} from '../conn';
import {MigrationAssistant} from '../migrate';
import {handleCLIResult} from './handleCLIResult';

export interface ISetCommand {
  connection: string;
  version: number;
  debug: boolean;
}

export const SetCommand: sacli.Command = {
  name: 'set',
  description: 'Set the current version of the schema without migrating to or applying it.',
  options: [
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
      description: 'Schema version to set to.',
    },
    {
      alias: 'd',
      name: 'debug',
      type: Boolean,
      description: 'Show data transferred between dbflock and the database.',
    },
  ],
  action: ({version, connection, debug}: ISetCommand) => {
    if (version == undefined || connection == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    let conn = parseConnectionURI(connection);

    if (debug) {
      enableMonitor();
    }

    handleCLIResult(new MigrationAssistant(conn, null).setCurrentVersion(version));
  },
};

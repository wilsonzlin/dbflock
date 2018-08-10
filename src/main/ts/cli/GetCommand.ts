import * as sacli from "sacli/dist/main";
import {enableMonitor, parseConnectionURI} from "../conn";
import {MigrationAssistant} from "../migrate";
import { handleCLIResult } from "./handleCLIResult";

export interface IGetCommand {
  connection: string;
  debug: boolean;
}

export const GetCommand: sacli.Command = {
  name: "get",
  description: "Get the current version of the schema.",
  options: [
    {
      alias: "c",
      name: "connection",
      type: String,
      typeLabel: "{underline URI}",
      description: "Complete database connection URI in the form {bold.underline provider}://{bold.underline user}:{bold.underline password}@{bold.underline host}:{bold.underline port}/{bold.underline db}?schema={bold.underline schema}&ssl={bold.underline true} (e.g. {italic postgres://root:test@localhost:5432/mydatabase?schema=public&ssl=false})"
    },
    {
      alias: "d",
      name: "debug",
      type: Boolean,
      description: "Show data transferred between dbflock and the database.",
    },
  ],
  action: ({connection, debug}: IGetCommand) => {
    if (connection == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    let conn = parseConnectionURI(connection);

    if (debug) {
      enableMonitor();
    }

    handleCLIResult(new MigrationAssistant(conn, null).getCurrentVersion());
  },
};

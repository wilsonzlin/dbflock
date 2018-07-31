#!/usr/bin/env node

import {URL} from "url";
import * as sacli from "sacli";
import {enableMonitor, IDatabaseConnectionConfig} from "./conn";
import {MigrationAssistant} from "./migrate";

export * from "./conn";
export * from "./diff";
export * from "./migrate";

interface IMigrateCommand {
  schemas: string;
  connection: string;
  version: number;
  debug: boolean;
}

const MigrateCommand: sacli.Command = {
  name: "migrate",
  description: "Upgrade/downgrade/apply a database schema to a different version.",
  options: [
    {
      alias: "s",
      name: "schemas",
      type: String,
      typeLabel: "{underline dir}",
      description: "Directory containing schema versions."
    },
    {
      alias: "c",
      name: "connection",
      type: String,
      typeLabel: "{underline URI}",
      description: "Complete database connection URI in the form {bold.underline provider}://{bold.underline user}:{bold.underline password}@{bold.underline host}:{bold.underline port}/{bold.underline db}?schema={bold.underline schema}&ssl={bold.underline true} (e.g. {italic postgres://root:test@localhost:5432/mydatabase?schema=public&ssl=false})"
    },
    {
      alias: "v",
      name: "version",
      type: Number,
      typeLabel: "{underline natural}",
      description: "Schema version to migrate to.",
    },
    {
      alias: "d",
      name: "debug",
      type: Boolean,
      description: "Show data transferred between dbflock and the database.",
    },
  ],
  action: ({schemas, version, connection, debug}: IMigrateCommand) => {
    if (schemas == undefined || version == undefined || connection == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    let {
      username: user,
      password,
      hostname: host,
      port: portRaw,
      pathname,
      searchParams,
    } = new URL(connection);

    if (!user || !password || !host || !pathname) {
      throw new SyntaxError(`Invalid connection URI`);
    }

    let port: number | undefined;
    if (portRaw) {
      port = Number.parseInt(portRaw, 10);
    }

    if (!/^\/[^\/]+$/.test(pathname)) {
      throw new SyntaxError(`Invalid connection URI`);
    }
    let database = pathname.slice(1);

    let sslParam = searchParams.get("ssl");
    let SSL = sslParam != undefined && !["false", "0", "n", "no", "off", "f"].includes(sslParam.toLowerCase());

    let schema = searchParams.get("schema") || undefined;

    let con: IDatabaseConnectionConfig = {
      user, password, SSL, host, port, database, schema
    };

    if (debug) {
      enableMonitor();
    }

    return new MigrationAssistant(con, schemas).migrate(version);
  },
};

if (!module.parent) {
  let cli = sacli.build({
    name: "dbflock",
    commands: [
      MigrateCommand,
    ],
  });

  sacli.parse(process.argv.slice(2), cli);
}

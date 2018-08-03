#!/usr/bin/env node

import * as sacli from "sacli";
import {MigrateCommand} from "./cli/MigrateCommand";

export * from "./conn";
export * from "./migrate";

if (!module.parent) {
  let cli = sacli.build({
    name: "dbflock",
    commands: [
      MigrateCommand,
    ],
  });

  sacli.parse(process.argv.slice(2), cli);
}

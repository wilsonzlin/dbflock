#!/usr/bin/env node

import * as sacli from "sacli";
import {MigrateCommand} from "./cli/MigrateCommand";
import {GetCommand} from "./cli/GetCommand";
import {SetCommand} from "./cli/SetCommand";

export * from "./conn";
export * from "./migrate";

if (!module.parent) {
  let cli = sacli.build({
    name: "dbflock",
    commands: [
      MigrateCommand,
      GetCommand,
      SetCommand,
    ],
  });

  sacli.parse(process.argv.slice(2), cli);
}

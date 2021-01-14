#!/usr/bin/env node

import * as sacli from "sacli";
import { GetCommand } from "./cli/GetCommand";
import { MigrateCommand } from "./cli/MigrateCommand";
import { SetCommand } from "./cli/SetCommand";

export * from "./conn";
export * from "./migrate";

if (!module.parent) {
  const cli = sacli.build({
    name: "dbflock",
    commands: [MigrateCommand, GetCommand, SetCommand],
  });

  sacli.parse(process.argv.slice(2), cli);
}

#!/usr/bin/env node

import * as sacli from "sacli";
import { GetCommand } from "./cli/GetCommand";
import { MigrateCommand } from "./cli/MigrateCommand";
import { SetCommand } from "./cli/SetCommand";

export * from "./migrate";

if (require.main === module) {
  const cli = sacli.build({
    name: "dbflock",
    commands: [MigrateCommand, GetCommand, SetCommand],
  });

  sacli.exec(process.argv.slice(2), cli);
}

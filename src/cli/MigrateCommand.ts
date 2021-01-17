import * as sacli from "sacli";
import { MigrationAssistant } from "../migrate";
import { handleCLIResult } from "./handleCLIResult";

export interface IMigrateCommand {
  schemas: string;
  version: number;
}

export const MigrateCommand: sacli.Command = {
  name: "migrate",
  description: "Upgrade/downgrade the database schema to a different version.",
  options: [
    {
      alias: "s",
      name: "schemas",
      type: String,
      typeLabel: "{underline dir}",
      description: "Directory containing schema versions.",
    },
    {
      alias: "v",
      name: "version",
      type: Number,
      typeLabel: "{underline natural}",
      description:
        "Schema version to migrate to. If omitted, the highest version available is used.",
    },
  ],
  action: ({ schemas, version }: IMigrateCommand) => {
    if (schemas == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    handleCLIResult(
      MigrationAssistant.fromSchemasDir(schemas).then((a) =>
        a.migrate(version ?? null)
      )
    );
  },
};

import * as sacli from "sacli";
import { MigrationAssistant } from "../migrate";
import { handleCLIResult } from "./handleCLIResult";

export interface ISetCommand {
  version: number;
}

export const SetCommand: sacli.Command = {
  name: "set",
  description: "Set the current version of the schema without migrating to it.",
  options: [
    {
      alias: "v",
      name: "version",
      type: Number,
      typeLabel: "{underline natural}",
      description: "Schema version to set to.",
    },
  ],
  action: ({ version }: ISetCommand) => {
    if (version == undefined) {
      throw new TypeError(`Missing arguments`);
    }

    handleCLIResult(
      MigrationAssistant.withConnectionOnly().then((a) =>
        a.setCurrentVersion(version)
      )
    );
  },
};

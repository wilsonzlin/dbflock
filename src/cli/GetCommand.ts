import * as sacli from "sacli";
import { MigrationAssistant } from "../migrate";
import { handleCLIResult } from "./handleCLIResult";

export interface IGetCommand {}

export const GetCommand: sacli.Command = {
  name: "get",
  description: "Get the current version of the schema.",
  options: [],
  action: ({}: IGetCommand) => {
    handleCLIResult(
      MigrationAssistant.withConnectionOnly(undefined, console.log).then((a) =>
        a.getCurrentVersion()
      )
    );
  },
};

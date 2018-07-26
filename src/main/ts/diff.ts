import * as shelljs from "shelljs";
import { IDatabaseConnectionConfig } from "./conn";

export enum SchemaType {
  SCHEMA = "SCHEMA",
  ROLE = "ROLE",
  SEQUENCE = "SEQUENCE",
  TABLE = "TABLE",
  COLUMN = "COLUMN",
  INDEX = "INDEX",
  VIEW = "VIEW",
  FOREIGN_KEY = "FOREIGN_KEY",
  FUNCTION = "FUNCTION",
  TRIGGER = "TRIGGER",
  OWNER = "OWNER",
  GRANT_RELATIONSHIP = "GRANT_RELATIONSHIP",
  GRANT_ATTRIBUTE = "GRANT_ATTRIBUTE",
}

export function pgdiff(from: IDatabaseConnectionConfig, to: IDatabaseConnectionConfig, schemaType: SchemaType): string {
  let fromOptions = `-u ${from.user} -w ${from.password} -h ${from.host} -p ${from.port} -d ${from.database} -o 'sslmode=${from.SSL ? "enable" : "disable"} -s ${from.schema}`;
  let toOptions = `-U ${to.user} -W ${to.password} -H ${to.host} -P ${to.port} -D ${to.database} -O 'sslmode=${to.SSL ? "enable" : "disable"} -S ${to.schema}`;

  let res = shelljs.exec(`${__dirname}/../resources/pgdiff ${fromOptions} ${toOptions} ${schemaType}`);
  let status = res.code;
  let diff = res.stdout;
  let errors = res.stderr;

  console.error(errors);

  if (status) {
    throw new Error(`Failed to run pgdiff with error ${status}`);
  }

  return diff;
}

export function diff(from: IDatabaseConnectionConfig, to: IDatabaseConnectionConfig): string {
  return [
    pgdiff(from, to, SchemaType.ROLE),
    pgdiff(from, to, SchemaType.FUNCTION),
    pgdiff(from, to, SchemaType.SCHEMA),
    pgdiff(from, to, SchemaType.SEQUENCE),
    pgdiff(from, to, SchemaType.TABLE),
    pgdiff(from, to, SchemaType.COLUMN),
    pgdiff(from, to, SchemaType.INDEX),
    pgdiff(from, to, SchemaType.VIEW),
    pgdiff(from, to, SchemaType.TRIGGER),
    pgdiff(from, to, SchemaType.OWNER),
    pgdiff(from, to, SchemaType.FOREIGN_KEY),
    pgdiff(from, to, SchemaType.GRANT_RELATIONSHIP),
    pgdiff(from, to, SchemaType.GRANT_ATTRIBUTE),
  ].join("\n");
}

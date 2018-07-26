export interface IDatabaseConnectionConfig {
  user: string;
  password: string;
  SSL: boolean;
  host: string;
  port: number;
  database: string;
  schema: string;
}

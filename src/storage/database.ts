import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";

export interface Database {
  rebalance_runs: {
    id: string;
    quarter: string;
    executed_at: string;
    total_assets: number;
    investment_amount: number;
    cash_target: number;
    status: string;
  };
  factor_scores: {
    run_id: string;
    code: string;
    name: string;
    value_score: number;
    quality_score: number;
    earnings_score: number;
    momentum_score: number;
    final_score: number;
    rank: number;
  };
  portfolios: {
    run_id: string;
    code: string;
    name: string;
    action: string;
    current_quantity: number;
    target_quantity: number;
    order_quantity: number;
    target_amount: number;
  };
  fundamental_snapshots: {
    run_id: string;
    code: string;
    per: number | null;
    pbr: number | null;
    psr: number | null;
    pcr: number | null;
    gpa: number | null;
    roa: number | null;
    asset_growth: number | null;
    debt_ratio: number | null;
    op_growth_yoy: number | null;
    ni_growth_yoy: number | null;
  };
}

let db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (db) return db;

  const sqliteDb = new SQLite("quant.db");
  db = new Kysely<Database>({
    dialect: new SqliteDialect({ database: sqliteDb }),
  });

  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS rebalance_runs (
      id TEXT PRIMARY KEY,
      quarter TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL,
      total_assets REAL NOT NULL,
      investment_amount REAL NOT NULL,
      cash_target REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed'
    )
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS factor_scores (
      run_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      value_score REAL NOT NULL,
      quality_score REAL NOT NULL,
      earnings_score REAL NOT NULL,
      momentum_score REAL NOT NULL,
      final_score REAL NOT NULL,
      rank INTEGER NOT NULL,
      PRIMARY KEY (run_id, code),
      FOREIGN KEY (run_id) REFERENCES rebalance_runs(id)
    )
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS portfolios (
      run_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      action TEXT NOT NULL,
      current_quantity INTEGER NOT NULL,
      target_quantity INTEGER NOT NULL,
      order_quantity INTEGER NOT NULL,
      target_amount REAL NOT NULL,
      PRIMARY KEY (run_id, code),
      FOREIGN KEY (run_id) REFERENCES rebalance_runs(id)
    )
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS fundamental_snapshots (
      run_id TEXT NOT NULL,
      code TEXT NOT NULL,
      per REAL,
      pbr REAL,
      psr REAL,
      pcr REAL,
      gpa REAL,
      roa REAL,
      asset_growth REAL,
      debt_ratio REAL,
      op_growth_yoy REAL,
      ni_growth_yoy REAL,
      PRIMARY KEY (run_id, code),
      FOREIGN KEY (run_id) REFERENCES rebalance_runs(id)
    )
  `.execute(database);
}

import { 
  resolve,
  ensureDir
} from "../deps.ts";

const dbDir = resolve("./", "assets", "database"); 
const dbPath = resolve(dbDir, "kv.sqlite3"); 

await ensureDir(dbDir);

const kv = await Deno.openKv(dbPath);

export { kv }
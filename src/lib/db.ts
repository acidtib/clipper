import { 
  resolve,
  ensureDir,
  z,
  createPentagon
} from "../deps.ts";

const dbDir = resolve("./", "assets", "database"); 
const dbPath = resolve(dbDir, "kv.sqlite3"); 

await ensureDir(dbDir);

// open db
const kv = await Deno.openKv(dbPath);

// models
const Video = z.object({
  id: z.string().describe("primary"),
  createdAt: z.date(),
  step: z.string(),
  output: z.string().optional(),
});

const Clip = z.object({
  id: z.string().describe("primary"),
  createdAt: z.date(),
  username: z.string(),
  source: z.string(),
  source_url: z.string(),
  duration: z.number(),
  order: z.number(),
  file_path: z.string().optional(),

  trim_start: z.number().optional(),
  trim_end: z.number().optional(),
  trim_action: z.boolean().optional(),

  videoId: z.string(),
});

// schema
const db = createPentagon(kv, {
  videos: {
    schema: Video,
    relations: {
      clips: ["clips", [Clip], "id", "videoId"],
    }
  },
  clips: {
    schema: Clip,
    relations: {
      video: ["videos", Video, "videoId", "id"],
    },
  }
});

export { db, Video, Clip }
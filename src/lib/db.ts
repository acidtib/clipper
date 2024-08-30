import { 
  resolve,
  ensureDir,
  z,
  ulid
} from "../deps.ts";

import { kvdex, model, collection } from "jsr:@olli/kvdex"

const dbDir = resolve("./", "assets", "database"); 
const dbPath = resolve(dbDir, "kv.sqlite3"); 

await ensureDir(dbDir);

// open db
const kv = await Deno.openKv(dbPath);

// models
type Video = z.infer<typeof VideoModel>
type Streamer = z.infer<typeof StreamerModel>
type Clip = z.infer<typeof ClipModel>

const VideoModel = z.object({
  video_id: z.string().describe("primary"),
  createdAt: z.date(),
  step: z.string(),
  output: z.string().optional(),
});

const StreamerModel = z.object({
  username: z.string(),
  platform: z.string(),
  platform_id: z.string(),
})

const ClipModel = z.object({
  clip_id: z.string().describe("primary"),
  createdAt: z.date(),
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
const db = kvdex(kv, {
  videos: collection(VideoModel, {
    idGenerator: (video) => video.video_id
  }),
  streamers: collection(StreamerModel),
  clips: collection(ClipModel, {
    idGenerator: (clip) => clip.clip_id
  }),
})

export { db }
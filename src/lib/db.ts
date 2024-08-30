import { 
  resolve,
  ensureDir,
  z,
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

const VideoModel = z.object({
  id: z.string().describe("primary"),
  createdAt: z.date(),
  step: z.string(),
  output: z.string().optional(),
});

const StreamerModel = z.object({
  id: z.string().describe("primary"),
  username: z.string(),
  platform: z.string(),
  platform_id: z.string(),
})

// const Clip = z.object({
//   id: z.string().describe("primary"),
//   createdAt: z.date(),
//   username: z.string(),
//   source: z.string(),
//   source_url: z.string(),
//   duration: z.number(),
//   order: z.number(),
//   file_path: z.string().optional(),

//   trim_start: z.number().optional(),
//   trim_end: z.number().optional(),
//   trim_action: z.boolean().optional(),

//   videoId: z.string(),
// });

// // schema
// const db = createPentagon(kv, {
//   videos: {
//     schema: Video,
//     relations: {
//       clips: ["clips", [Clip], "id", "videoId"],
//     }
//   },
//   clips: {
//     schema: Clip,
//     relations: {
//       video: ["videos", Video, "videoId", "id"],
//     },
//   }
// });

const db = kvdex(kv, {
  videos: collection(VideoModel, {
    idGenerator: (video) => video.id
  }),
  streamers: collection(StreamerModel, {
    indices: {}
  }),
})

export { db }
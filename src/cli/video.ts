import log from "https://deno.land/x/logger@v1.1.6/stdout.ts";
import { Command, colors, resolve, ensureDir, logger, kv, FFmpeg, } from "../deps.ts";

interface Options {
  debug?: boolean;
  crf?: number;
}

export default new Command()
  .description("Create a new video")
  .arguments("<id:string>")

  .action((options: Options, ...args) => {
    const action = new Action(options, ...args);
    return action.execute();
  })

  .command("info", (await import("./info.ts")).default);

class Action {
  options: Options;
  id: string;
  kvKey: string[];
  basePath: string;
  ffmpeg: FFmpeg;

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`,
        options,
      );
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`,
        args,
      );
    }

    this.options = options;
    this.id = args[0];
    this.kvKey = ["videos", this.id];

    this.basePath = resolve("./", "results", this.id);
    this.options.debug &&
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`,
        this.basePath,
      );

    this.ffmpeg = new FFmpeg(this.options.crf, this.options.debug);
  }

  async execute() {
    const checkVideo = await kv.get(this.kvKey);

    this.options.debug &&
      logger.warn(
        `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / checkVideo:`,
        checkVideo,
      );

    // check that video id exists
    if (checkVideo.value === null) {
      logger.info(
        `${colors.bold.yellow.underline(this.id)} / Cant find video.`,
      );
      return;
    }

    // create folder
    await ensureDir(this.basePath);

    const entryClips = await Array.fromAsync(kv.list({ prefix: ["videos", this.id, "clips"] }))
    console.log("clips:", entryClips.length);
    this.options.debug && logger.warn(entryClips);

    if (entryClips.length === 0) {
      logger.info(
        `${colors.bold.yellow.underline(this.id)} / Video has no clips.`,
      );
      return;
    }

    // stitch clips into video
    await this.ffmpeg.concat(
      entryClips.map((c) => c.value.file_path),
      resolve(this.basePath, "output.mp4"),
    )

  }
}

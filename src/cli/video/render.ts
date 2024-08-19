import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  kv,
  FFmpeg
} from "../../deps.ts";

interface Options {
  debug?: boolean;
  overwrite: boolean;
  device: string;
  quality: string;
}

export default new Command()
  .description("Render a video.")
  .arguments("<id:string>")
  .action((options: void, ...args) => {
    const action = new Action(options as unknown as Options, ...args);
    return action.execute();
  });


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
  
      this.ffmpeg = new FFmpeg(this.options.quality, this.options.device, this.options.debug);
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

      logger.info(
        `${colors.bold.yellow.underline(this.id)} / Render complete.`,
        `${colors.bold.yellow.underline(this.id)} / ${resolve(this.basePath, "output.mp4")}`,
      );
  
    }
  }
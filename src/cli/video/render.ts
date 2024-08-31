import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  db,
  FFmpeg,
} from "../../deps.ts";

interface Options {
  debug?: boolean;
  force: boolean;
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
  
      this.basePath = resolve("./", "results", this.id);
      this.options.debug &&
        logger.warn(
          `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`,
          this.basePath,
        );
  
      this.ffmpeg = new FFmpeg(this.options.quality, this.options.device, this.options.debug);
    }
  
    async execute() {
      // check that video id exists
      const video = await db.videos.find(this.id)
  
      this.options.debug &&
        logger.warn(
          `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / video:`,
          video,
        );
  
      // check that video id exists
      if (video) {
        if (!video.value.output || video.value.output === "") {
          logger.info(
            `${colors.bold.yellow.underline(this.id)} / First render.`,
          );
        } else {
          if (this.options.force) {
            logger.info(
              `${colors.bold.yellow.underline(this.id)} / Overwriting render.`,
            );  
          } else {
            logger.info(
              `${colors.bold.yellow.underline(this.id)} / Video render already exists. Use --force to overwrite it.`,
            );
            return;
          }
        }        
      } else {
        logger.info(
          `${colors.bold.yellow.underline(this.id)} / Cant find video.`,
        );
        return;
      }

      // update step value
      await db.videos.update(
        this.id,
        { step: "rendering" },
        { strategy: "merge" },
      )

      // create folder
      await ensureDir(this.basePath);
      
      const { result: clips } = await db.clips.getMany({
        filter: (doc) => doc.value.videoId === this.id,
      })

      this.options.debug && logger.warn(clips);
  
      if (clips.length === 0) {
        logger.info(
          `${colors.bold.yellow.underline(this.id)} / Video has no clips.`,
        );
        return;
      }

      logger.info(`${colors.bold.yellow.underline(this.id)} / Redering video with ${clips.length} clips using ${this.options.device} at ${this.options.quality} quality.`);

      // stitch clips into video
      await this.ffmpeg.concat(
        clips.sort((a, b) => a.value.order - b.value.order),
        resolve(this.basePath, "output.mp4"),
      )

      await db.videos.update(
        this.id,
        { output: resolve(this.basePath, "output.mp4") },
        { strategy: "merge" },
      )

      logger.info(`${colors.bold.yellow.underline(this.id)} / Render complete.`);
      logger.info(`${colors.bold.yellow.underline(this.id)} / Output: ${resolve(this.basePath, "output.mp4")}`);

      const videoDetails = await this.ffmpeg.getVideoInfo(resolve(this.basePath, "output.mp4"));
      logger.info(`${colors.bold.yellow.underline(this.id)} / Video Details:`, videoDetails);
  
    }
  }
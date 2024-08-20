import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  db,
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
      const video = await db.videos.findFirst({
        where: { id: this.id },
        include: {
          clips: true
        }
      });
  
      this.options.debug &&
        logger.warn(
          `${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / video:`,
          video,
        );

      // check that video exists
      if (!video) {
        logger.info(`${colors.bold.yellow.underline(this.id)} / Cant find video.`);
        return;
      }

      // check if we have already rendered the video
      if (video.output) {
        if (this.options.overwrite) {
          logger.info(
            `${colors.bold.yellow.underline(this.id)} / Overwriting files.`,
          );
          // proceed with rendering
        } else {
          logger.info(
            `${colors.bold.yellow.underline(this.id)} / Video has already been rendered. Use --overwrite to re-render it.`,
          );
          return;
        }
      }
      
      // create folder
      await ensureDir(this.basePath);

      const clips = video.clips;

      this.options.debug && logger.warn(clips);
      
      // ensure we have clips
      if (clips.length === 0) {
        logger.info(
          `${colors.bold.yellow.underline(this.id)} / Video has no clips.`,
        );
        return;
      }

      logger.info(`${colors.bold.yellow.underline(this.id)} / Redering video with ${clips.length} clips using ${this.options.device} at ${this.options.quality} quality.`);

      // stitch clips into video
      await this.ffmpeg.concat(
        clips
          .sort((a, b) => a.order - b.order)
          .map((c) => c.file_path!),
        resolve(this.basePath, "output.mp4"),
      )

      await db.videos.update({
        where: { id: this.id },
        data: {
          output: resolve(this.basePath, "output.mp4"),
        },
      })

      logger.info(`${colors.bold.yellow.underline(this.id)} / Render complete.`);
      logger.info(`${colors.bold.yellow.underline(this.id)} / Output: ${resolve(this.basePath, "output.mp4")}`);

      const videoDetails = await this.ffmpeg.getVideoInfo(resolve(this.basePath, "output.mp4"));
      logger.info(`${colors.bold.yellow.underline(this.id)} / Video Details:`, videoDetails);
  
    }
  }
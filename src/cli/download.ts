import { 
  Command,
  colors,
  resolve,
  ensureDir,
  exists,
  logger,
  YtDlp,
  FFmpeg
} from "../deps.ts";

interface Options {
  debug?: boolean,
  crf?: number,
  overwrite: boolean,
}

const command = new Command()
  .description("Return video information.")
  .arguments("<id:string>")

  .option("--overwrite", "Overwrite existing files.", { default: false })

  .action((options: Options, ...args) => {
    const action = new Action(options, ...args);
    return action.execute();
  })

export default command

class Action {
  options: Options;
  id: string;
  kvKey: string[];
  basePath: string;
  downloadsFilePath: string;
  ffmpeg: FFmpeg;
  clipList: { url: string; start: string; end: string; }[];

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.options = options

    this.id = args[0]

    this.downloadsFilePath = resolve("./", "to_download.txt")
    this.basePath = resolve("./", "results", this.id, "clips")
    this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`, this.basePath);

    this.kvKey = ["videos", this.id]

    this.ffmpeg = new FFmpeg(this.options.crf, this.options.debug)

    this.clipList = [];
  }

  async execute() {
    let content
    try {
      content = await Deno.readTextFile(this.downloadsFilePath);
    } catch (error) {
      logger.error(`${colors.bold.yellow.underline(this.downloadsFilePath)} / Error reading the file.`);
      logger.error(error);
      throw new Error("Error reading the file.");
    }

    await ensureDir(this.basePath);

    // download each clip and normalize the audio
    content.split("\n").forEach(async (line, index) => {
      let clipData = this.parseLine(line.trim())
      let trimClip = false
      logger.info(`${colors.bold.yellow.underline(this.id)} / Working on ${clipData.url}.`);
      this.options.debug && logger.warn(colors.bold.green(`[DEBUG:]`), clipData);
      this.clipList.push(clipData)

      const { clipId, username } = this.parseClipUrl(clipData.url)
      const rawPath = resolve(this.basePath, `raw_${index}_${username}_${clipId}.mp4`)
      let sourcePath = rawPath
      
      // download the clip using yt-dlp
      await new YtDlp(clipData.url, rawPath.replace(".mp4", ".%(ext)s"), this.options.debug).fetch()

      // get the duration of the clip
      const clipDuration = Math.floor(await this.ffmpeg.getAudioDuration(rawPath) * 1000) / 1000  

      // trim clip
      const startTime = await this.ffmpeg.parseTime(clipData.start)
      let endTime = await this.ffmpeg.parseTime(clipData.end)
      if (endTime === 0) {
        clipData.end = await this.ffmpeg.formatTime(clipDuration)
        endTime = await this.ffmpeg.parseTime(clipData.end)
      }

      this.options.debug && logger.warn(colors.bold.green(`[DEBUG:]`), clipData);

      if (startTime !== 0 || endTime !== clipDuration) {
        trimClip = true
      }

      if (this.options.debug) {
        console.log("startTime", startTime);
        console.log("endTime", endTime);
        console.log("clipDuration", clipDuration);
        console.log("trimClip", trimClip);
      }
      
      if (trimClip) {
        logger.warn(`${colors.bold.yellow.underline(this.id)} / trimming clip`)        
        await this.ffmpeg.trim(rawPath, resolve(this.basePath, `trim_${index}_${username}_${clipId}.mp4`), startTime, endTime)

        sourcePath = resolve(this.basePath, `trim_${index}_${username}_${clipId}.mp4`)
      }

      // normalize the audio
      await this.ffmpeg.normalizeAudio(sourcePath, resolve(this.basePath, `${index}_${username}_${clipId}.mp4`))

      // remove the temp files
      for (const file of [
        rawPath, 
        sourcePath
      ]) {
        if (await exists(file)) {
          Deno.removeSync(file);
        }
      }
    })
  }

  // parse username and clip ID from the URL
  private parseClipUrl(clipUrl: string) {
    const url = new URL(clipUrl);
    let username
    let clipId

    if (url.host.includes("twitch.tv")) {
      // Split the pathname to extract username and clip ID
      const segments = url.pathname.split('/');
      username = segments[1].toLowerCase();
      clipId = segments[3].toLowerCase();
    }

    return { username, clipId };
  }

  // parse the line data
  private parseLine(line: string) {
    const parts = line.split(",");
    let start = "00:00:00.000";
    let end = "00:00:00.000";
    let url = "";
  
    parts.forEach(part => {
      if (part.startsWith("s:")) {
        start = part.substring(2);
      } else if (part.startsWith("e:")) {
        end = part.substring(2);
      } else if (part.startsWith("https://")) {
        url = part;
      }
    });
  
    return { start, end, url };
  }
}
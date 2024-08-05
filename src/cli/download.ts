import { 
  Command,
  colors,
  resolve,
  ensureDir,
  logger,
  YtDlp,
  FFmpeg
} from "../deps.ts";

interface Options {
  debug?: boolean,
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
  clipList: { url: string; start: string; end: string | null; }[];

  constructor(options: Options, ...args: Array<string>) {
    if (options.debug) {
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / options:`, options);
      logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(args[0])} / args:`, args);
    }

    this.options = options

    this.id = args[0]

    this.downloadsFilePath = resolve("./", "assets", "clips.txt")
    this.basePath = resolve("./", "results", this.id, "clips")
    this.options.debug && logger.warn(`${colors.bold.green("[DEBUG:]")} ${colors.bold.yellow.underline(this.id)} / basePath:`, this.basePath);

    this.kvKey = ["videos", this.id]

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
      const clipData = this.parseLine(line.trim())
      logger.info(`${colors.bold.yellow.underline(this.id)} / Downloading ${clipData.url}.`);
      this.options.debug && logger.warn(colors.bold.green(`[DEBUG:]`), clipData);
      this.clipList.push(clipData)

      const { clipId, username } = this.parseClipUrl(clipData.url)
      
      // download the clip
      await this.download(clipData.url, index, clipId!, username!)

      // normalize the audio
      await this.normalize_audio(index, clipId!, username!)

      // remove the raw file
      await Deno.remove(resolve(this.basePath, `raw_${index}_${username}_${clipId}.mp4`))
    })
  }

  // download the clip using yt-dlp
  private async download(clipUrl: string, index: number, clipId: string, username: string) {
    await new YtDlp(clipUrl, resolve(this.basePath, `raw_${index}_${username}_${clipId}.%(ext)s`), this.options.debug).fetch()
  }

  // normalize the audio
  private async normalize_audio(index: number, clipId: string, username: string) {
    await new FFmpeg(resolve(this.basePath, `raw_${index}_${username}_${clipId}.mp4`), resolve(this.basePath, `${index}_${username}_${clipId}.mp4`), this.options.debug).normalize_audio()
  }

  // parse username and clip ID from the URL
  private parseClipUrl(clipUrl: string) {
    const url = new URL(clipUrl);
    let username
    let clipId

    if (url.host.includes("twitch.tv")) {
      // Split the pathname to extract username and clip ID
      const segments = url.pathname.split('/');
      username = segments[1];
      clipId = segments[3];
    }

    return { username, clipId };
  }

  // parse the line data
  private parseLine(line: string) {
    const parts = line.split(",");
    let start = "0";
    let end = null;
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
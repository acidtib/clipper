import { 
  colors,
  logger
} from "../deps.ts";

class YtDlp {
  mediaUrl: string;
  filePath: string;
  debug: boolean;

  constructor(mediaUrl: string, filePath: string, debug = false) {
    this.mediaUrl = mediaUrl;
    this.filePath = filePath;
    this.debug = debug;
  }

  async fetch(): Promise<number> {
    const args = [
      "--quiet", 
      "--no-progress", 
      "--no-cache-dir",
      "--output", this.filePath, 
      this.mediaUrl
    ]

    const command = new Deno.Command("yt-dlp", {
      args: args
    });

    const { code, stdout, stderr } = await command.output();


    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(this.mediaUrl)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`fetch failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }
}

export { YtDlp }
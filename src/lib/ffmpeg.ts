import { 
  colors,
  logger
} from "../deps.ts";

class FFmpeg {
  filePath: string;
  savePath: string;
  debug: boolean;

  constructor(filePath: string, savePath: string, debug = false) {
    this.filePath = filePath;
    this.savePath = savePath;
    this.debug = debug;
  }

  async normalize_audio(): Promise<number> {
    const command = new Deno.Command("ffmpeg-normalize", {
      args: [
        this.filePath, 
        "-c:a", "aac",
        "-b:a", "320k",
        "-o", this.savePath,
        "-f"
      ]
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(this.filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`fetch failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }
}

export { FFmpeg }
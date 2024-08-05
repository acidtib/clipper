import { 
  colors,
  logger
} from "../deps.ts";

import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

class FFmpeg {
  debug: boolean;
  crf: number;

  constructor(crf: number = 5, debug = false) {
    this.debug = debug;
    this.crf = crf;
  }

  async normalizeAudio(filePath: string, savePath: string): Promise<number> {
    const command = new Deno.Command("ffmpeg-normalize", {
      args: [
        filePath, 
        "-c:a", "aac",
        "-b:a", "320k",
        "-o", savePath,
        "-f"
      ]
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`fetch failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async getAudioDuration(filePath: string): Promise<number> {
    const command = new Deno.Command("ffprobe", {
      args: [
        "-i", 
        filePath, 
        "-show_entries", 
        "format=duration", 
        "-v", 
        "quiet", 
        "-of", 
        "csv=p=0"
      ],
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`getAudioDuration failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async trim(filePath: string, savePath: string, startTime: number, endTime: number): Promise<number> {
    const command = new Deno.Command("ffmpeg", {
      args: [
        "-y", 
        "-loglevel", "error", 
        "-i", filePath, 
        "-ss", startTime.toString(), 
        "-to", endTime.toString(), 
        "-c:v", "libx264", 
        "-c:a", "aac", 
        "-crf", this.crf.toString(), 
        savePath
      ],
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`trim failed with code ${code}`);
    }

    return Number(new TextDecoder().decode(stdout));
  }

  async formatTime(seconds: number) {
    const duration = moment.duration(seconds, 'seconds');

    const hours = duration.hours().toString().padStart(2, '0');
    const minutes = duration.minutes().toString().padStart(2, '0');
    const secs = duration.seconds().toString().padStart(2, '0');
    const milliseconds = duration.milliseconds().toString().padStart(3, '0');

    const formattedDuration = `${hours}:${minutes}:${secs}.${milliseconds}`;

    return formattedDuration;
  }

  async parseTime(timeString: string) {
    const [hours, minutes, secondsWithMilliseconds] = timeString.split(':');
    const [seconds, milliseconds] = secondsWithMilliseconds.split('.');
  
    const totalSeconds =
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      (parseInt(milliseconds, 10) || 0) / 1000;
  
    return totalSeconds;
  }
  
}

export { FFmpeg }
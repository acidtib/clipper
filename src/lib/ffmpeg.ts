import { 
  colors,
  logger
} from "../deps.ts";

import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

class FFmpeg {
  debug: boolean;
  device: string;
  quality: string;

  constructor(quality: string = "high", device: string = "cpu", debug = false) {
    this.debug = debug;
    this.quality = quality;
    this.device = device.toLowerCase();
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

  async getVideoInfo(filePath: string): Promise<Record<string, any>> {
    const command = new Deno.Command("ffprobe", {
      args: [
        "-i",
        filePath,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
      ],
    });
  
    const { code, stdout, stderr } = await command.output();
  
    if (this.debug) {
      logger.warn(
        colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(filePath)}`),
        new TextDecoder().decode(stdout)
      );
    }
  
    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`getVideoInfo failed with code ${code}`);
    }
  
    const info = JSON.parse(new TextDecoder().decode(stdout));
  
    // Extract relevant details
    const format = info.format;
    const streams = info.streams;
    
    const videoStream = streams.find((stream: any) => stream.codec_type === "video");
    const audioStream = streams.find((stream: any) => stream.codec_type === "audio");
  
    return {
      format_long_name: format.format_long_name,
      duration: Number(format.duration),
      size: this.formatBytes(Number(format.size)),
      video: videoStream
        ? {
            codec_name: videoStream.codec_long_name,
            width: videoStream.width,
            height: videoStream.height,
            frame_rate: videoStream.r_frame_rate,
            bit_rate: this.formatBitrateToKbps(Number(videoStream.bit_rate)),
          }
        : null,
      audio: audioStream
        ? {
            codec_name: audioStream.codec_long_name,
            channels: audioStream.channels,
            sample_rate: this.formatHertz(Number(audioStream.sample_rate)),
            bit_rate: this.formatBitrateToKbps(Number(audioStream.bit_rate)),
          }
        : null,
    };
  }

  async trim(filePath: string, savePath: string, startTime: number, endTime: number): Promise<number> {
    const command = new Deno.Command("ffmpeg", {
      args: [
        "-y", 
        "-loglevel", "error", 
        "-i", filePath, 
        "-ss", startTime.toString(), 
        "-to", endTime.toString(), 
        ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),
        ...(this.device === "gpu" ? ["-c:v", "h264_nvenc", "-preset", "slow", "-qp", this.atWhatQuality(), "-profile:v", "high"] : []),
        "-c:a", "aac", 
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

  async concat(fileList: string[], savePath: string): Promise<number> {
    // ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output.mp4

    // ffmpeg 
    //   -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\2_whothyfawk_busywildplumberyoudontsay-9nojqsw098-i1p_y.mp4 
    //   -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\1_whityyy_modernsucculentmonkeysquadgoals-cgunmp0lhnex_yzh.mp4 
    //   -filter_complex "[0:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v0]; [0:a]asetpts=PTS-STARTPTS[a0]; [1:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v1]; [1:a]asetpts=PTS-STARTPTS[a1]; [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]" 
    //   -map "[outv]" -map "[outa]" 
    //   -force_key_frames 'expr:gte(t,n_forced/2)' -c:v libx264 -crf 18 -bf 2 -c:a aac -q:a 1 -ac 2 -ar 48000 -use_editlist 0 -movflags +faststart -r 60 output.mp4

    const filterList = fileList.map((f, i) => `[${i}:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v${i}];`).join("");

    const filterListAudio = fileList.map((f, i) => `[${i}:a]asetpts=PTS-STARTPTS[a${i}];`).join("");

    const filterListSource = fileList.map((f, i) => `[v${i}][a${i}]`).join("");

    const args = [
      "-y", 
      ...fileList.flatMap(file => ["-i", file]),
      "-filter_complex", `${filterList}${filterListAudio}${filterListSource}concat=n=${fileList.length}:v=1:a=1[outv][outa]`, 
      "-map", "[outv]", 
      "-map", "[outa]",
      "-force_key_frames", "expr:gte(t,n_forced/2)",      

      ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),
      ...(this.device === "gpu" ? 
        [
          "-c:v", "h264_nvenc", 
          "-rc", "constqp",
          "-qmin", "17", "-qmax", "51",
          "-tune", "hq",
          "-preset", "p7", 
          "-qp", this.atWhatQuality()
        ] : []),

      "-bf", "2",
      "-c:a", "aac",
      "-q:a", "1",
      "-ac", "2",
      "-ar", "48000",
      "-use_editlist", "0",
      "-movflags", "+faststart",
      "-r", "60",
      savePath
    ];

    this.debug && console.log(args.join(" "));
    
    const command = new Deno.Command("ffmpeg", {
      args: args,
    });

    const { code, stdout, stderr } = await command.output();

    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(fileList.join(", "))}`), new TextDecoder().decode(stdout));

    // raise error if code is not 0
    if (code !== 0) {
      logger.error(new TextDecoder().decode(stdout));
      logger.error(new TextDecoder().decode(stderr));
      throw new Error(`concat failed with code ${code}`);
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

  private atWhatQuality() {
    // CRF 5 ≈ QP 10 (Very high quality, large file size)
    // CRF 18 ≈ QP 18 (Good quality, reasonable file size)
    // CRF 30 ≈ QP 28-30 (Lower quality, smaller file size)
    
    let qualityNumber: number;

    switch (this.quality) {
      case "high":
        qualityNumber = this.device === "cpu" ? 5 : 10;
        break;
      case "good":
        qualityNumber = this.device === "cpu" ? 15 : 18;
        break;
      case "low":
        qualityNumber = this.device === "cpu" ? 30 : 28;
        break;
      default:
        throw new Error(`quality must be one of high, good, or low`);
    }

    return qualityNumber.toString();
  }

  private formatBytes(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${sizes[i]}`;
  }

  private formatBitrateToKbps(bitrate: number): string {
    const kbps = Math.round(bitrate / 1000);
    return `${kbps}kbps`;
  }

  private formatHertz(hertz: number): string {
    const sizes = ["Hz", "KHz", "MHz", "GHz"];
    let i = 0;
    while (hertz >= 1000 && i < sizes.length) {
      hertz /= 1000;
      i++;
    }
    return `${hertz.toFixed(2)} ${sizes[i]}`;
  }
  
}

export { FFmpeg }
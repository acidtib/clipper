import { 
  colors,
  logger,
  config,
  resolve
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


  // ffmpeg -i video1.mp4 -i video2.mp4 -i video3.mp4 -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output.mp4 
  // ffmpeg 
  //   -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\2_whothyfawk_busywildplumberyoudontsay-9nojqsw098-i1p_y.mp4 
  //   -i C:\\Users\\acidtib\\code\\clipper\\results\\1\\clips\\1_whityyy_modernsucculentmonkeysquadgoals-cgunmp0lhnex_yzh.mp4 
  //   -filter_complex "[0:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v0]; [0:a]asetpts=PTS-STARTPTS[a0]; [1:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v1]; [1:a]asetpts=PTS-STARTPTS[a1]; [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]" 
  //   -map "[outv]" -map "[outa]" 
  //   -force_key_frames 'expr:gte(t,n_forced/2)' -c:v libx264 -crf 18 -bf 2 -c:a aac -q:a 1 -ac 2 -ar 48000 -use_editlist 0 -movflags +faststart -r 60 output.mp4  
  async concat(toConcat: any[], savePath: string): Promise<number> {

    const introEnabled = config.get<boolean>("use_intro");
    const outroEnabled = config.get<boolean>("use_outro");
    const transitionEnabled = config.get<boolean>("use_transition");
    const frameEnabled = true // config.get<boolean>("use_frame");
  
    const introPath = introEnabled ? resolve(config.get<string>("intro_path")!) : null;
    const outroPath = outroEnabled ? resolve(config.get<string>("outro_path")!) : null;
    const transitionPath = transitionEnabled ? resolve(config.get<string>("transition_path")!) : null;
    const framePath = resolve("C:\\Users\\acidtib\\code\\clipper\\assets\\media\\frame.png");


    // Build the adjusted file list
  let adjustedFileList: string[] = [];

  if (introEnabled) adjustedFileList.push(introPath!);

  toConcat.forEach((clip, i) => {
    adjustedFileList.push(clip.file_path);
    if (frameEnabled) adjustedFileList.push(framePath);

    if (transitionEnabled && i < toConcat.length - 1) {
      adjustedFileList.push(transitionPath!);
    }
  });

  if (outroEnabled) adjustedFileList.push(outroPath!);

  // Generate the filter_complex for video processing
  let filterIndex = 0;
  let videoFilters = "";
  let audioFilters = "";
  let filterOutputs = "";
  let videoCount = 0; // Track the number of video inputs used

  for (let i = 0; i < adjustedFileList.length; i++) {
    const isFrame = frameEnabled && (i % 2 === 1);
    const isTransition = transitionEnabled && (i % 3 === 2);

    if (isFrame || isTransition) {
      continue; // Skip adding filters for frame or transition elements
    }

    if (frameEnabled) {
      videoFilters += `[${filterIndex}:v]scale=1709x961[scaled_video${videoCount}];[${filterIndex + 1}:v]scale=1920:1080[overlay${videoCount}];[overlay${videoCount}][scaled_video${videoCount}]overlay=x=107:y=0[v${videoCount}];`;
      audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${videoCount}];`; // Apply audio filter to the video only
      filterIndex += 2; // Increment extra for the frame
    } else {
      videoFilters += `[${filterIndex}:v]scale=1920x1080,setsar=1[v${videoCount}];`;
      audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${videoCount}];`;
      filterIndex += 1;
    }

    filterOutputs += `[v${videoCount}][a${videoCount}]`;
    videoCount += 1;
  }

  const filterComplex = `${videoFilters}${audioFilters}${filterOutputs}concat=n=${videoCount}:v=1:a=1[outv][outa]`;

  // Construct the FFmpeg arguments
  const args = [
    "-y",
    ...adjustedFileList.flatMap(file => ["-i", file]),
    "-filter_complex", filterComplex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-force_key_frames", "expr:gte(t,n_forced/2)",
    
    // Options for CPU encoding
    ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),

    // Options for GPU encoding
    ...(this.device === "gpu" ? [
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
    
    // Execute the FFmpeg command
    const command = new Deno.Command("ffmpeg", { args });
    const { code, stdout, stderr } = await command.output();
  
    this.debug && logger.warn(colors.bold.green(`[DEBUG:] ${colors.bold.yellow.underline(savePath)}`), new TextDecoder().decode(stdout));
  
    // Raise error if code is not 0
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
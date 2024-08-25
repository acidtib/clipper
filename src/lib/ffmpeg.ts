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
    const frameEnabled = config.get<boolean>("use_frame");
  
    const introPath = introEnabled ? resolve(config.get<string>("intro_path")!) : null;
    const outroPath = outroEnabled ? resolve(config.get<string>("outro_path")!) : null;
    const transitionPath = transitionEnabled ? resolve(config.get<string>("transition_path")!) : null;
    const framePath = resolve("C:\\Users\\acidtib\\code\\clipper\\assets\\media\\frame.png");

    // Build the adjusted file list
    let adjustedFileList: string[] = [];

    if (introEnabled) adjustedFileList.push(introPath!);

    toConcat.forEach((clip, i) => {
      // add clip object to list
      adjustedFileList.push(clip);

      // add frame if enabled
      if (frameEnabled) adjustedFileList.push(framePath);

      // add transition if enabled
      if (transitionEnabled && i < toConcat.length - 1) {
        adjustedFileList.push(transitionPath!);
      }
    });

    if (outroEnabled) adjustedFileList.push(outroPath!);
   
    // Generate filter complex for video processing
    let filterIndex = 0;
    let filterVideoIndex = 0;
    let filterAudioIndex = 0;
    let filterOverlayIndex = 0;

    let videoFilters = "";
    let audioFilters = "";
    let filterOutputs = "";

    adjustedFileList.filter(item => item !== framePath).forEach((item, i) => {
      const isClip = typeof item === "object"
      const isIntro = item === introPath;
      const isOutro = item === outroPath;
      const isFrame = item === framePath;
      const isTransition = item === transitionPath;

      // if its frame go to next video
      if (isFrame) return;

      // add intro if enabled
      if (isIntro) {
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/CowboyHippiePro.otf:text='hello':x=(w-text_w)/2:y=700:fontsize=220:fontcolor=#78854A[v${i}];`;
      }

      // add outro if enabled
      if (isOutro) {
        videoFilters += `[${i}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v${i}];`;
      }

      // add transition if enabled
      if (isTransition) {
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v${i}];`;
      }

      if (isClip && frameEnabled) {
        // clip with frame
        videoFilters += `[${filterIndex}:v]scale=1709x961[scaled_video${i+1}];[${filterIndex += 1}:v]scale=1920:1080[overlay];[overlay][scaled_video${i+1}]overlay=x=107:y=0[v${i}];`
        audioFilters += `[${filterIndex - 1}:a]asetpts=PTS-STARTPTS[a${i}];`;
        filterOutputs += `[v${i}][a${i}]`;
      } else if (isClip) {
        // normal clip
        videoFilters += `[${filterIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/dDegradasi.ttf:text='${(item as unknown as { username: string }).username}':box=1:boxcolor=black@0.6:boxborderw=5:x=30:y=20:fontsize=50:fontcolor=#BEC581[v${i}];`;
        audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${i}];`;
        filterOutputs += `[v${i}][a${i}]`;
      }

      // if its a clip or transition, add the video and audio to the filter
      if (isIntro || isOutro || isTransition) {
        audioFilters += `[${filterIndex}:a]asetpts=PTS-STARTPTS[a${i}];`;
        filterOutputs += `[v${i}][a${i}]`;
      }
      
      filterIndex += 1
    })

    // for (let i = 0; i < adjustedFileList.length; i++) {
      
    //   // add clip
    //   if (isClip && frameEnabled) {
    //     // clip with frame
    //     // if (i !== 0) {
    //     //   filterIndex += 1;
    //     // }

    //     videoFilters += `[${filterVideoIndex}:v]scale=1709x961`
    //     if (filterVideoIndex !== 0) filterVideoIndex += 1;
    //     videoFilters += `[scaled_video${filterVideoIndex}];[${filterVideoIndex}:v]scale=1920:1080[overlay];[overlay][scaled_video${filterVideoIndex}]overlay=x=107:y=0[v${filterIndex}];`;
    //     filterIndex += 1
    //     // filterVideoIndex += 1;
    //     // audioFilters += `[${filterVideoIndex}:a]asetpts=PTS-STARTPTS[a${filterVideoIndex}];`;
    //     // filterOutputs += `[v${filterVideoIndex}][a${filterVideoIndex}]`;
    //     // filterVideoIndex += 1;
    //   } else if (isClip) {
    //     // normal clip
    //     videoFilters += `[${filterVideoIndex}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/dDegradasi.ttf:text='${(adjustedFileList[i] as unknown as { username: string }).username}':box=1:boxcolor=black@0.6:boxborderw=5:x=30:y=20:fontsize=50:fontcolor=#BEC581[v${filterVideoIndex}];`;
    //   }

    //   // if its a clip or transition, add the video and audio to the filter
    //   if (isClip || isIntro || isOutro || isTransition) {
    //     audioFilters += `[${filterVideoIndex}:a]asetpts=PTS-STARTPTS[a${filterVideoIndex}];`;
    //     filterOutputs += `[v${filterVideoIndex}][a${filterVideoIndex}]`;

    //     filterVideoIndex += 1;
    //   }
    // }

    // return 0

    const filterComplex = `${videoFilters}${audioFilters}${filterOutputs}concat=n=${adjustedFileList.filter(item => item !== framePath).length}:v=1:a=1[outv][outa]`;

    const args = [
      "-y",
      ...adjustedFileList.flatMap(file => typeof file === "string" ? ["-i", file] : ["-i", (file as { file_path: string }).file_path]),
      "-filter_complex", `${filterComplex}`,
      "-map", "[outv]",
      "-map", "[outa]",
      "-force_key_frames", "expr:gte(t,n_forced/2)",
      
      // options for cpu
      ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),

      // options for gpu
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

    console.log(args.join(" "));

    // return 0

    // const filterList = adjustedFileList.map((f, i) => {
    //   // check if its an intro
    //   if (introEnabled && i === 0) {
    //     return `[${i}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/CowboyHippiePro.otf:text='hello':x=(w-text_w)/2:y=700:fontsize=220:fontcolor=#78854A[v${i}];`;
    //   }
    //   // check if its an outro
    //   if (outroEnabled && i === adjustedFileList.length - 1) {
    //     return `[${i}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v${i}];`;
    //   }
    //   // check if its a transition
    //   if (transitionEnabled && typeof f === "string" && f === transitionPath) {
    //     return `[${i}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1[v${i}];`;
    //   }

    //   // normal clip
    //   // return `[${i}:v]scale=1709x961[scaled_video${i}];[6:v]scale=1920:1080[overlay${i}];[${i}:v]setpts=PTS-STARTPTS,settb=AVTB,scale=1709x961:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1,setsar=1,drawtext=fontfile=assets/fonts/dDegradasi.ttf:text='${(f as unknown as { username: string }).username}':box=1:boxcolor=black@0.6:boxborderw=5:x=30:y=20:fontsize=50:fontcolor=#BEC581[v${i}];`;
      
    //   // if (i !== 0) {
    //   //   filterStep = filterStep + 1
    //   // }
      
    //   // const filter = `[${filterStep}:v]scale=1709x961[scaled_video];[${filterStep + 1}:v]scale=1920:1080[overlay];[overlay][scaled_video]overlay=x=107:y=0[v${i}];`
    //   // filterStep += 1;
    //   // return filter
    // }).join("");

    // const filterListAudio = adjustedFileList.map((f, i) => `[${i}:a]asetpts=PTS-STARTPTS[a${i}];`).join("");

    // const filterListSource = adjustedFileList.map((f, i) => `[v${i}][a${i}]`).join("");

    // const args = [
    //   "-y",
    //   ...adjustedFileList.flatMap(file => typeof file === "string" ? ["-i", file] : ["-i", (file as { file_path: string }).file_path]),
    //   "-filter_complex", `${filterList}${filterListAudio}${filterListSource}concat=n=${adjustedFileList.length}:v=1:a=1[outv][outa]`,
    //   "-map", "[outv]",
    //   "-map", "[outa]",
    //   "-force_key_frames", "expr:gte(t,n_forced/2)",
      
    //   // options for cpu
    //   ...(this.device === "cpu" ? ["-c:v", "libx264", "-crf", this.atWhatQuality()] : []),

    //   // options for gpu
    //   ...(this.device === "gpu" ?
    //     [
    //       "-c:v", "h264_nvenc",
    //       "-rc", "constqp",
    //       "-qmin", "17", "-qmax", "51",
    //       "-tune", "hq",
    //       "-preset", "p7",
    //       "-qp", this.atWhatQuality()
    //     ] : []),
  
    //   "-bf", "2",
    //   "-c:a", "aac",
    //   "-q:a", "1",
    //   "-ac", "2",
    //   "-ar", "48000",
    //   "-use_editlist", "0",
    //   "-movflags", "+faststart",
    //   "-r", "60",
    //   savePath
    // ];
  
    this.debug && console.log(args.join(" "));
  
    const command = new Deno.Command("ffmpeg", {
      args: args,
    });
  
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
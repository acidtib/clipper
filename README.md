
# clipper

Easily create video compilations from Twitch clips with **clipper**. This CLI tool downloads clips and merges them into a single video. Customize your compilation with optional features such as:

Example video compilations can be found at [https://www.youtube.com/watch?v=rDKzzEqEEQ8](https://www.youtube.com/watch?v=rDKzzEqEEQ8)

- **Intro**: Add an introductory video to your compilation.
- **Outro**: Include an ending video to wrap up your content.
- **Transitions**: Smoothly transition between clips.
- **Video Frame Overlay**: Apply a custom frame around your video.

<div align="center">

<img src="https://raw.githubusercontent.com/acidtib/clipper/main/docs/clipper-animation.gif" alt="clipper in action" width="100%"/>

</div>

## Installation

### Prerequisites

Before installing clipper, ensure you have the following dependencies:

- [FFmpeg](https://ffmpeg.org/)
- [FFmpeg-normalize](https://github.com/slhck/ffmpeg-normalize)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

#### Windows
1. **Install Chocolatey**: Follow the instructions [here](https://chocolatey.org/install) to install Chocolatey.

2. **Install Dependencies**:
```powershell
# Open PowerShell as Administrator

  # Install FFmpeg
  choco install ffmpeg-full

  # Install Python for FFmpeg-normalize and yt-dlp
  choco install python

# Open Normal PowerShell non-Administrator

  # Install FFmpeg-normalize
  python -m pip install -U ffmpeg-normalize

  # Install yt-dlp
  python -m pip install -U yt-dlp
```

#### Ubuntu
1. **Install Dependencies**:
```bash
# Update package list and upgrade packages
sudo apt update && sudo apt upgrade

# Install FFmpeg
sudo apt install ffmpeg

# Install FFmpeg-normalize
pip3 install ffmpeg-normalize

# Install yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod a+rx ~/.local/bin/yt-dlp
```

#### MacOS
1. **Install Dependencies**:
```bash
# Update Homebrew and install FFmpeg
brew update
brew install ffmpeg

# Install FFmpeg-normalize
python -m pip install -U ffmpeg-normalize

# Install yt-dlp
brew install yt-dlp
```

## Usage

### General Usage

```bash
clipper
```

#### Description:

CLI for Bloodline Ranks Youtube videos.

#### Options:

- `-h, --help`     - Show this help.
- `-d, --debug`    - Run in debug mode.
- `-v, --version`  - Output the version number.

#### Commands:

- `init`               - Create local directory structure and config files.
- `video`              - Create and render a video.
- `twitch`             - Work with Twitch data.
- `help [command]`     - Show this help or the help of a sub-command.

### Initialize Configuration

Create a configuration environment and file:
```bash
clipper init
```

Modify global settings in the `config.yml` file.

Edit file `to_download.txt` with the links of the clips you want to download.

#### Options:

- `-h, --help`   - Show this help.
- `-d, --debug`  - Run in debug mode.

### Manage Clips

#### 1. List Videos

List all videos in the local database:
```bash
clipper video list
```

##### Options:

- `--device <device>`  - Device to use (Default: "cpu").
- `--quality <quality>` - Quality to use (Default: "high").
- `--force`            - Force action (Default: false).
- `-h, --help`         - Show this help.
- `-d, --debug`        - Run in debug mode.

#### 2. Get Video Information

Retrieve information about a video from the local database:
```bash
clipper video info <id>
```

##### Options:

- `--device <device>`  - Device to use (Default: "cpu").
- `--quality <quality>` - Quality to use (Default: "high").
- `--force`            - Force action (Default: false).
- `-h, --help`         - Show this help.
- `-d, --debug`        - Run in debug mode.

#### 3. Download Clips

Download clips from `to_download.txt`:
```bash
clipper video download <id>
```

##### Options:

- `--device <device>`  - Device to use (Default: "cpu").
- `--quality <quality>` - Quality to use (Default: "high").
- `--force`            - Force action (Default: false).
- `-h, --help`         - Show this help.
- `-d, --debug`        - Run in debug mode.

#### 4. Render Compilation

Render the video using the ID of the downloaded clips:
```bash
clipper video render <id>
```

##### Options:

- `--device <device>`  - Device to use (Default: "cpu").
- `--quality <quality>` - Quality to use (Default: "high").
- `--force`            - Force action (Default: false).
- `-h, --help`         - Show this help.
- `-d, --debug`        - Run in debug mode.

### Twitch Commands

#### 1. Fetch Twitch Clips

Fetch clips from Twitch using a list of streamers provided:
```bash
clipper twitch clips <usernames...>
```

##### Options:

- `--force`    - Force action (Default: false).
- `-h, --help` - Show this help.
- `-d, --debug` - Run in debug mode.
- `--merge`    - Merge links into current list (Default: false).

#### 2. Get Game Data

Get game data for the given game name:
```bash
clipper twitch games <game_name>
```

##### Options:

- `--force`    - Force action (Default: false).
- `-h, --help` - Show this help.
- `-d, --debug` - Run in debug mode.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements.

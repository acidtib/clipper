# clipper

Easily create video compilations from Twitch clips with **clipper**. This CLI tool downloads clips and merges them into a single video. Customize your compilation with optional features such as:

Example video compilations can be found at [https://www.youtube.com/watch?v=rDKzzEqEEQ8](https://www.youtube.com/watch?v=rDKzzEqEEQ8)

- **Intro**: Add an introductory video to your compilation.
- **Outro**: Include an ending video to wrap up your content.
- **Transitions**: Smoothly transition between clips.
- **Video Frame Overlay**: Apply a custom frame around your video.

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

### Usage
#### Initialize Configuration

Create a configuration environment and file:
```bash
clipper init
```

Modify global settings in the config.yml file.

Edit file `to_download.txt` with the links of the clips you want to download

#### Manage Clips
1. **Download Clips**: Edit the to_download.txt file with the links to the clips you want to download. Then use:
```bash
clipper video download <id>
```
- Replace `<id>` with a unique identifier for the video in your local database.

2. **Render Compilation**: Render the video using the ID of the downloaded clips:
```bash
clipper video render <id>
```

3. **Get Video Information**: Retrieve information about a video from the local database:
```bash
clipper video info <id>
```

#### Other Commands
**List Videos**: List all videos in the local database:
```bash
clipper video list
```

**Get Twitch Clip**: Fetch clips from list of Twitch users, urls are added to `to_download.txt`
```bash
clipper twitch get chiyo agent3540
```

## Contributing
Feel free to submit issues or pull requests if you have suggestions or improvements.
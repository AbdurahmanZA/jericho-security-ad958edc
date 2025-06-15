
# JERICHO Backend Server

This is the official Node.js backend for the JERICHO Security System.

## Setup

1. Make sure you have Node.js 20+ and `ffmpeg` installed
2. From the `backend/` directory:
   ```bash
   npm install
   npm start
   ```

- The backend exposes API on port `3001`
- HLS streams: `http://localhost:3001/hls/`
- Snapshots: `http://localhost:3001/snapshots/`
- WebSocket: `ws://localhost:3001`

## Notes

- Camera streams require working RTSP URLs and ffmpeg in your system PATH
- This backend is automatically deployed and managed by the Ubuntu install.sh script for production servers, but can be run solo for development/testing.

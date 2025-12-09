# Sound Files for Multi-Timer App

This directory contains alarm sound files for the timer notifications.

## Required Sound Files:
- `chime.mp3` - Default chime sound
- `bell.mp3` - Bell notification sound
- `melody.mp3` - Musical melody
- `beep.mp3` - Simple beep sound
- `buzz.mp3` - Buzzing alert sound

## Audio Requirements:
- Format: MP3 (for broad browser compatibility)
- Duration: 2-5 seconds recommended
- Volume: Normalized to prevent volume spikes
- Quality: 128kbps or higher

## Fallback:
If sound files are not available, the app will use the existing alarm audio from the original alarm clock implementation (`15.Alarm Clock/files/ringtone.mp3`).

## Usage:
Sound files are loaded dynamically based on user selection in the timer creation/edit modal. The volume is controlled by the user's volume setting (0-100%).

## Browser Support:
- Chrome: Full MP3 support
- Firefox: Full MP3 support
- Safari: Full MP3 support
- Edge: Full MP3 support

Note: Some browsers may require user interaction before playing audio. The app handles this by requesting audio permission on first timer creation.
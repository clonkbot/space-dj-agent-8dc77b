import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Track {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
}

const SpaceDJAgent: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(64).fill(0));
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  const updateWaveform = useCallback(() => {
    if (analyserRef.current && isPlaying) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setWaveformData(Array.from(dataArray));
    }
    animationRef.current = requestAnimationFrame(updateWaveform);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateWaveform);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, updateWaveform]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.name.endsWith('.mp3')) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          const newTrack: Track = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name.replace('.mp3', ''),
            file,
            url,
            duration: audio.duration
          };
          setTracks(prev => [...prev, newTrack]);
        });
      }
    });
  };

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setTimeout(() => {
        if (audioRef.current) {
          initAudioContext();
          audioRef.current.play();
        }
      }, 100);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        initAudioContext();
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      audioRef.current.currentTime = percent * audioRef.current.duration;
      setProgress(percent * 100);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    if (currentTrack?.id === id) {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] relative overflow-hidden flex flex-col">
      {/* Animated star field background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Nebula gradient overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-[#7B2FBF]/40 via-transparent to-transparent"
          style={{ transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-radial from-[#00F5FF]/20 via-transparent to-transparent"
          style={{ transform: 'translate(30%, 30%)' }} />
      </div>

      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="p-4 md:p-6 lg:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <motion.div
                className="relative"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-[#00F5FF] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7B2FBF] to-[#FF2D95] opacity-50" />
                  <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-[#00F5FF] relative z-10">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                  </svg>
                </div>
                <motion.div
                  className="absolute -inset-1 rounded-full border border-[#00F5FF]/30"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#00F5FF] via-[#FF2D95] to-[#7B2FBF]">
                  SPACE DJ AGENT
                </h1>
                <p className="text-[#E8E8FF]/50 text-xs md:text-sm tracking-[0.2em] uppercase">Cosmic Audio Command Center</p>
              </div>
            </div>

            {/* Live Status Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLive(!isLive)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-full border-2 transition-all duration-300 flex items-center gap-2 min-h-[44px] ${
                isLive
                  ? 'border-[#FF2D95] bg-[#FF2D95]/20 text-[#FF2D95]'
                  : 'border-[#E8E8FF]/30 text-[#E8E8FF]/50 hover:border-[#E8E8FF]/50'
              }`}
            >
              <motion.div
                className={`w-3 h-3 rounded-full ${isLive ? 'bg-[#FF2D95]' : 'bg-[#E8E8FF]/30'}`}
                animate={isLive ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-bold tracking-wider text-sm md:text-base">
                {isLive ? 'LIVE ON X SPACE' : 'GO LIVE'}
              </span>
            </motion.button>
          </div>
        </motion.header>

        {/* Visualizer Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="px-4 md:px-8 py-4 md:py-8"
        >
          <div className="relative mx-auto max-w-4xl h-24 md:h-32 lg:h-40 rounded-2xl bg-[#0a0a1a] border border-[#7B2FBF]/30 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#7B2FBF]/10 to-transparent" />

            {/* Waveform bars */}
            <div className="absolute inset-0 flex items-end justify-center gap-[2px] md:gap-1 px-2 md:px-4 pb-2 md:pb-4">
              {waveformData.map((value, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t-sm min-w-[2px]"
                  style={{
                    background: `linear-gradient(to top, #FF2D95, #00F5FF)`,
                    height: `${Math.max(4, (value / 255) * 100)}%`,
                    opacity: 0.7 + (value / 255) * 0.3,
                    boxShadow: value > 128 ? `0 0 10px #00F5FF` : 'none'
                  }}
                  animate={{
                    height: isPlaying ? `${Math.max(4, (value / 255) * 100)}%` : '4%'
                  }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>

            {/* Center text when not playing */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[#E8E8FF]/30 text-sm md:text-lg tracking-widest uppercase px-4 text-center">
                  {currentTrack ? 'PAUSED' : 'SELECT A TRACK TO BEGIN'}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Now Playing / Controls */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="px-4 md:px-8"
        >
          <div className="max-w-4xl mx-auto bg-[#0a0a1a]/80 backdrop-blur-xl border border-[#7B2FBF]/20 rounded-2xl p-4 md:p-6">
            <AnimatePresence mode="wait">
              {currentTrack ? (
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4 md:mb-6">
                    {/* Album art placeholder */}
                    <motion.div
                      className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-[#7B2FBF] to-[#FF2D95] flex items-center justify-center flex-shrink-0"
                      animate={isPlaying ? {
                        boxShadow: ['0 0 20px #7B2FBF', '0 0 40px #FF2D95', '0 0 20px #7B2FBF']
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 fill-white">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </motion.div>

                    <div className="flex-1 text-center md:text-left min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-[#E8E8FF] truncate">{currentTrack.name}</h2>
                      <p className="text-[#00F5FF] text-xs md:text-sm tracking-wider">{formatTime(audioRef.current?.currentTime || 0)} / {formatTime(currentTrack.duration)}</p>
                    </div>

                    {/* Play controls */}
                    <div className="flex items-center gap-2 md:gap-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#7B2FBF] flex items-center justify-center shadow-lg shadow-[#00F5FF]/30"
                      >
                        {isPlaying ? (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-white">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-white ml-1">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="h-2 md:h-3 bg-[#1a1a2e] rounded-full cursor-pointer overflow-hidden relative"
                    onClick={handleSeek}
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#00F5FF] to-[#FF2D95] rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg shadow-[#00F5FF]/50" />
                    </motion.div>
                  </div>

                  {/* Volume control */}
                  <div className="flex items-center gap-2 md:gap-4 mt-3 md:mt-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 fill-[#E8E8FF]/50 flex-shrink-0">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="flex-1 h-2 bg-[#1a1a2e] rounded-full appearance-none cursor-pointer max-w-[150px] md:max-w-[200px]
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00F5FF]
                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#00F5FF]/50"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4 md:py-8"
                >
                  <p className="text-[#E8E8FF]/40 text-sm md:text-lg">No track selected</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Track List & Upload */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex-1 px-4 md:px-8 py-6 md:py-8"
        >
          <div className="max-w-4xl mx-auto">
            {/* Upload zone */}
            <motion.div
              whileHover={{ borderColor: '#00F5FF', scale: 1.01 }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#7B2FBF]/50 rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all bg-[#0a0a1a]/50 backdrop-blur-sm mb-6"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <motion.div
                className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-full border-2 border-[#00F5FF]/50 flex items-center justify-center"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-8 md:h-8 fill-[#00F5FF]">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                </svg>
              </motion.div>
              <p className="text-[#E8E8FF] text-base md:text-lg font-medium">Drop MP3 files here or click to upload</p>
              <p className="text-[#E8E8FF]/40 text-xs md:text-sm mt-2">Upload your cosmic beats to broadcast on X Space</p>
            </motion.div>

            {/* Track list */}
            <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => playTrack(track)}
                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl cursor-pointer transition-all ${
                      currentTrack?.id === track.id
                        ? 'bg-gradient-to-r from-[#7B2FBF]/30 to-[#FF2D95]/30 border border-[#FF2D95]/50'
                        : 'bg-[#0a0a1a]/60 border border-transparent hover:border-[#7B2FBF]/30'
                    }`}
                  >
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      currentTrack?.id === track.id && isPlaying
                        ? 'bg-[#FF2D95]'
                        : 'bg-[#7B2FBF]/30'
                    }`}>
                      {currentTrack?.id === track.id && isPlaying ? (
                        <motion.div
                          className="flex items-end gap-[2px] h-4 md:h-5"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-white rounded-full"
                              animate={{ height: ['40%', '100%', '40%'] }}
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                            />
                          ))}
                        </motion.div>
                      ) : (
                        <span className="text-[#E8E8FF]/70 text-xs md:text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#E8E8FF] text-sm md:text-base font-medium truncate">{track.name}</p>
                      <p className="text-[#E8E8FF]/40 text-xs md:text-sm">{formatTime(track.duration)}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                      className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#FF2D95]/20 flex items-center justify-center hover:bg-[#FF2D95]/40 transition-colors flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-5 md:h-5 fill-[#FF2D95]">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {tracks.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <p className="text-[#E8E8FF]/30 text-sm md:text-base">Your playlist is empty</p>
                  <p className="text-[#E8E8FF]/20 text-xs md:text-sm mt-2">Upload some tracks to get started</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="relative z-10 py-4 px-4 text-center border-t border-[#7B2FBF]/10">
          <p className="text-[#E8E8FF]/30 text-xs">
            Requested by <a href="https://x.com/theweb3gidz" target="_blank" rel="noopener noreferrer" className="hover:text-[#00F5FF]/50 transition-colors">@theweb3gidz</a> · Built by <a href="https://x.com/clonkbot" target="_blank" rel="noopener noreferrer" className="hover:text-[#00F5FF]/50 transition-colors">@clonkbot</a>
          </p>
        </footer>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(123, 47, 191, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 245, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 245, 255, 0.5);
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
};

export default SpaceDJAgent;

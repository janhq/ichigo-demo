// AudioControllers.tsx
import { Button } from '@/components/ui/button';
import { ModalPermissionDenied } from '@/components/ui/modalPemissionDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/lib/utils';
import { useLongPress } from '@uidotdev/usehooks';
import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface RecordingControlsProps {
  isRecording: boolean;
  isPlayingAudio: boolean;
  isLoading: boolean;
  time: number;
  maxTime: number;
  os: string;
  waveBars: React.MutableRefObject<HTMLDivElement[]>;
  startRecording: () => void;
  stopRecording: () => void;
  stopAudio: () => void;
}

const AudioControllers: React.FC<RecordingControlsProps> = ({ isRecording, isPlayingAudio, isLoading, time, maxTime, os, waveBars, startRecording, stopRecording, stopAudio }) => {
  const [permission, setPermission] = useState<PermissionState>();

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const micPermission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setPermission(micPermission.state as PermissionState);

        micPermission.onchange = () => {
          setPermission(micPermission.state as PermissionState);
        };
      } catch (error) {
        console.error('Error checking microphone permission', error);
      }
    };

    checkMicrophonePermission();
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
    }
  };

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (time / (maxTime - 1)) * circumference;

  const longPressHandlers = useLongPress(startRecording, {
    onFinish: stopRecording,
    threshold: 500,
  });

  return (
    <>
      {permission === 'denied' && <ModalPermissionDenied />}
      <div className="flex flex-col justify-center items-center gap-4">
        <div className={twMerge('flex gap-3 justify-center items-end w-full p-4 rounded-lg absolute -top-24 h-20 invisible', isRecording && 'visible')}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              ref={el => {
                waveBars.current[i] = el as HTMLDivElement;
              }}
              className="w-2 rounded-md transition-[height] ease-in-out duration-150 bg-red-200"
              style={{
                height: '10px',
              }}
            />
          ))}
        </div>
        <p className={twMerge('text-xs invisible', isRecording && 'visible')}>{formatTime(time)}</p>
        <div className="flex">
          {isPlayingAudio && (
            <Button className="absolute -top-10 left-1/2 -translate-y-1/2 -translate-x-1/2" onClick={stopAudio}>
              Stop Audio
            </Button>
          )}
          {/* Mobile */}
          {permission === 'granted' && (
            <div
              className={twMerge('relative w-16 h-16 justify-center items-center cursor-pointer btn-custom flex lg:hidden', (isPlayingAudio || isLoading) && 'pointer-events-none opacity-50')}
              {...longPressHandlers}
            >
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 36 36">
                <circle className="stroke-foreground/50" strokeWidth="1.5" fill="transparent" r={radius} cx="18" cy="18" />
                {isRecording && (
                  <circle
                    className="stroke-red-500 -translate-y-1/2"
                    strokeWidth="1.5"
                    fill="transparent"
                    r={radius}
                    cx="18"
                    cy="18"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{
                      transition: 'stroke-dashoffset 1s linear',
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                    }}
                  />
                )}
              </svg>
              <div className={twMerge('w-9 h-9 rounded-full bg-red-500 transition-all duration-300 ease-linear', isRecording && 'w-6 h-6 rounded-sm bg-red-500')} />
            </div>
          )}
          {/* Desktop */}
          {permission === 'granted' && (
            <div
              className={twMerge('relative w-16 h-16 justify-center items-center cursor-pointer btn-custom hidden lg:flex', (isPlayingAudio || isLoading) && 'pointer-events-none opacity-50')}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 36 36">
                <circle className="stroke-foreground/50" strokeWidth="1.5" fill="transparent" r={radius} cx="18" cy="18" />
                {isRecording && (
                  <circle
                    className="stroke-red-500 -translate-y-1/2"
                    strokeWidth="1.5"
                    fill="transparent"
                    r={radius}
                    cx="18"
                    cy="18"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{
                      transition: 'stroke-dashoffset 1s linear',
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                    }}
                  />
                )}
              </svg>
              <div className={twMerge('w-9 h-9 rounded-full bg-red-500 transition-all duration-300 ease-linear', isRecording && 'w-6 h-6 rounded-sm bg-red-500')} />
            </div>
          )}
        </div>

        {permission === 'granted' && (
          <span className="hidden md:block text-xs">
            {os === 'undetermined' ? (
              <Skeleton className="h-4 w-[80px]" />
            ) : (
              <span className={twMerge((isPlayingAudio || isLoading) && 'pointer-events-none opacity-50')}>Hold space to talk to ichigo</span>
            )}
          </span>
        )}

        {permission === 'granted' && (
          <span className="block md:hidden text-xs mb-8">
            {os === 'undetermined' ? (
              <Skeleton className="h-4 w-[80px]" />
            ) : (
              <span className={twMerge((isPlayingAudio || isLoading) && 'pointer-events-none opacity-50')}>Press and hold record button to talk</span>
            )}
          </span>
        )}

        {(permission === 'prompt' || permission === undefined) && <Button onClick={requestMicrophonePermission}>Activate Microphone</Button>}
      </div>
    </>
  );
};

export default AudioControllers;

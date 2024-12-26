'use client';

import { audioVisualizerAtom } from '@/app/atoms/audioVisualizer';
import { audioVisualizerList } from '@/app/types/chat';
import GradientAnimtion from '@/components/animations/gradientAnimation';
import OldStrawberryAnimation from '@/components/animations/oldStraberry';
import StrawberryAnimation from '@/components/animations/strawberryAnimation';
import VertexAnimation from '@/components/animations/vertexAnimnation';
import { Skeleton } from '@/components/ui/skeleton';
import { useOs } from '@/hooks/useOs';
import { useAtom } from 'jotai/react';
import { twMerge } from 'tailwind-merge';

interface AudioVisualizersProps {
  frequency: number;
  isLoading: boolean;
  isPlayingAudio: boolean;
}

const AudioVisualizers = ({ frequency, isLoading, isPlayingAudio }: AudioVisualizersProps) => {
  const [selectedAudioVisualizer, setSelectedAudioVisualizer] = useAtom(audioVisualizerAtom);
  const os = useOs();

  return (
    <>
      <div className="absolute top-10 left-0 flex gap-2 z-20">
        {audioVisualizerList.map((item, i) => {
          const isActive = selectedAudioVisualizer === item.id;
          return (
            <div
              key={i}
              className={twMerge('w-10 h-10 border border-border flex items-center justify-center rounded-lg cursor-pointer', os !== 'undetermined' && isActive && 'border-2 border-blue-600')}
              onClick={() => setSelectedAudioVisualizer(item.id)}
            >
              <p>{item.display}</p>
            </div>
          );
        })}
      </div>

      {os === 'undetermined' ? (
        <Skeleton className="h-[300px] w-[300px] rounded-full" />
      ) : (
        <>
          {selectedAudioVisualizer === 'vertex' && (
            <div className="relative top-[50px] lg:top-0 w-full h-full">
              <VertexAnimation frequency={frequency + 20} />
            </div>
          )}
          {selectedAudioVisualizer === 'gradient' && <GradientAnimtion frequency={frequency} isLoading={isLoading} />}
          {selectedAudioVisualizer === 'strawberry' && <StrawberryAnimation frequency={frequency} isLoading={isLoading} isPlayingAudio={isPlayingAudio} />}
          {selectedAudioVisualizer === 'old-straw' && <OldStrawberryAnimation frequency={frequency} isLoading={isLoading} isPlayingAudio={isPlayingAudio} />}
        </>
      )}
    </>
  );
};

export default AudioVisualizers;

'use client';

import { audioVisualizerAtom } from '@/app/atoms/audioVisualizer';
import { audioVisualizerList } from '@/app/types/chat';
import { useOs } from '@/hooks/useOs';
import { useAtom } from 'jotai/react';
import { twMerge } from 'tailwind-merge';

const AudioVisualizers = () => {
  const [selectedAudioVisualizer, setSelectedAudioVisualizer] = useAtom(audioVisualizerAtom);
  const os = useOs();

  return (
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
  );
};

export default AudioVisualizers;

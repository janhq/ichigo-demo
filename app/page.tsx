'use client';
import SocialLinks from '@/app/components/Navbar/SocialLinks';
import GradientAnimtion from '@/components/animations/gradientAnimation';
import OldStrawberryAnimation from '@/components/animations/oldStraberry';
import StrawberryAnimation from '@/components/animations/strawberryAnimation';
import VertexAnimation from '@/components/animations/vertexAnimnation';
import AudioSelector from '@/components/ui/audioSelector';
import { ModalPermissionDenied } from '@/components/ui/modalPemissionDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { useOs } from '@/hooks/useOs';
import { useWindowEvent } from '@/hooks/useWindowEvent';
import { Message, useChat } from '@ai-sdk/react';
import { useAtom } from 'jotai/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IoChatbubbleEllipsesSharp, IoSettingsSharp } from 'react-icons/io5';
import { useGlobalAudioPlayer } from 'react-use-audio-player';
import { twMerge } from 'tailwind-merge';
import * as THREE from 'three';
import { setTimeout } from 'timers';
import WavEncoder from 'wav-encoder';
import { audioVisualizerAtom } from './atoms/audioVisualizer';
import AudioControllers from './components/Audio/AudioControllers';
import AudioVisualizers from './components/Audio/AudioVisualizers';
import ChatInput from './components/Chat/ChatInput';
import ChatMessages from './components/Chat/ChatMessages';

let spaceKeyHeld = false;
let spaceKeyTimer: ReturnType<typeof setTimeout> | null = null; // Define the correct type for setTimeout
let longPressTriggered = false;

const MainView = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isSettingVisible, setIsSettingVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frequency, setFrequency] = useState<number>(0);
  const audioURL = useRef<{ [key: number]: any }>({});
  const audioURLIndex = useRef(-1);
  const audioMapIndex = useRef(-1);
  const currentWaitingIndex = useRef(-1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { load, stop } = useGlobalAudioPlayer();
  const audioAnalyser = useRef<THREE.AudioAnalyser | null>(null);
  const currentText = useRef('');
  const currentCount = useRef(0);
  const lastMsg = useRef('');
  const checkpoint = useRef(10);
  let audioContext: AudioContext;
  let animationFrameId: number;

  const listRef = useRef<HTMLDivElement>(null);
  const prevScrollTop = useRef(0);
  const isUserManuallyScrollingUp = useRef(false);
  const waveBars = useRef<HTMLDivElement[]>([]);
  const maxTime = 10;
  const [time, setTime] = useState(0);

  const [permission, setPermission] = useState<PermissionState>(); // Microphone permission state

  const [selectedAudioVisualizer] = useAtom(audioVisualizerAtom);

  const punctuation = ['.', ',', '!', '?', ':', ';', '"', "'", '(', ')', '[', ']', '{', '}', '-', '--', '...', '/', '\\'];

  const { input, isLoading, messages, handleInputChange, handleSubmit, setInput } = useChat({
    keepLastMessageOnError: true,
    onFinish(message) {
      if (currentText.current) {
        addToFetchQueue(message.id, currentText.current);
      }

      console.debug('send on Finish: ', currentText.current);
    },
  });

  const isInputVoice = input.startsWith('<|sound_start|>');
  const maskingValueInput = isInputVoice ? '🔊 🔊 🔊 ' : input;

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const micPermission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setPermission(micPermission.state as PermissionState);

        // Watch for permission changes
        micPermission.onchange = () => {
          setPermission(micPermission.state as PermissionState);
        };
      } catch (error) {
        console.error('Error checking microphone permission', error);
      }
    };

    checkMicrophonePermission();
  }, []);

  // Update the timer every second while recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      if (time < maxTime) {
        interval = setInterval(() => {
          setTime(prev => prev + 1);
        }, 1000);
      } else {
        setIsRecording(false); // Automatically stop recording when max time is reached
      }
    }

    return () => clearInterval(interval);
  }, [isRecording, time]);

  // Send chat message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const newWord = lastMsg.current ? lastMessage?.content.replace(lastMsg.current, '') : lastMessage?.content;

    const chunkSize = checkpoint.current ?? 400;

    // console.debug("send first: ", newWord, punctuation.includes(newWord),currentCount.current , checkpoint.current);
    if (currentCount.current < chunkSize) {
      currentText.current = currentText.current + newWord;
    } else if (currentCount.current < 60 && punctuation.includes(newWord)) {
      console.debug('send first: ', currentText.current);
      if (currentText.current) {
        addToFetchQueue(lastMessage.id, currentText.current);
      }
      checkpoint.current = 60;
      currentText.current = ''; // in case of punctuation, reset the text
      currentCount.current = 0;
    } else if (chunkSize === 10) {
      // first chunk
      currentText.current = currentText.current + newWord;
    } else {
      console.debug('send: ', currentText.current);
      if (currentText.current) {
        addToFetchQueue(lastMessage.id, currentText.current);
      }
      checkpoint.current = chunkSize === 60 ? 60 : 400;
      currentText.current = newWord;
      currentCount.current = 0;
    }

    currentCount.current += 1;
    lastMsg.current = lastMessage?.content;
  }, [messages]);

  // Send message when user stop record
  useEffect(() => {
    const preventDefault = {
      preventDefault: function () {
        return undefined;
      },
    } as React.FormEvent;

    if (isInputVoice || time === maxTime) {
      handleFormSubmit(preventDefault);
    }
    if (time === maxTime) {
      stopRecording();
    }
  }, [isInputVoice, time]);

  const os = useOs();
  const isMac = os === 'macos';

  // Make the input focus when the chat is open.
  useEffect(() => {
    if (isChatVisible && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 500); // A timeout is needed because the element is invisible due to its parent, and there is a transition duration.

      return () => clearTimeout(timeoutId);
    }
  }, [isChatVisible]);

  // Hotkey toogle chatbox and record audio
  useWindowEvent('keydown', event => {
    const prefix = isMac ? event.metaKey : event.ctrlKey;

    // Toggle chat visibility with Ctrl/Command + B
    if (event.code === 'KeyB' && prefix) {
      setIsChatVisible(!isChatVisible);
    }

    // // Handle space key press (start timer for long press)
    if (event.code === 'Space' && event.repeat && !spaceKeyHeld) {
      spaceKeyHeld = true;
      longPressTriggered = false; // Reset the long press trigger

      spaceKeyTimer = setTimeout(() => {
        longPressTriggered = true; // Mark that a long press has been triggered
        if (!isLoading && !isPlayingAudio) {
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        }
      }, 300);
    }
  });

  useWindowEvent('keyup', event => {
    if (event.code === 'Space') {
      if (spaceKeyTimer !== null) {
        clearTimeout(spaceKeyTimer);
        spaceKeyTimer = null; // Reset the timer to null after clearing it
      }

      spaceKeyHeld = false;
      spaceKeyHeld = false;

      // Do nothing if long press wasn't triggered
      if (!longPressTriggered) {
        event.preventDefault();
        event.stopPropagation();
        stopRecording();
        console.debug('Space key released before 10 seconds, no action triggered.');
      } else {
        stopRecording();
      }
    }
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const currentScrollTop = event.currentTarget.scrollTop;

    if (prevScrollTop.current > currentScrollTop) {
      isUserManuallyScrollingUp.current = true;
    } else {
      const currentScrollTop = event.currentTarget.scrollTop;
      const scrollHeight = event.currentTarget.scrollHeight;
      const clientHeight = event.currentTarget.clientHeight;

      if (currentScrollTop + clientHeight >= scrollHeight) {
        isUserManuallyScrollingUp.current = false;
      }
    }
    prevScrollTop.current = currentScrollTop;
  }, []);

  useEffect(() => {
    if (isUserManuallyScrollingUp.current === true || !listRef.current) return;
    const scrollHeight = listRef.current?.scrollHeight ?? 0;
    listRef.current?.scrollTo({
      top: scrollHeight,
      behavior: 'instant',
    });
  }, [listRef.current?.scrollHeight, isUserManuallyScrollingUp]);

  // Play squance audio
  const playAudio = () => {
    if (audioURLIndex.current !== -1 && audioURL.current[audioURLIndex.current]) {
      console.debug('Playing: ', audioURLIndex.current);
      console.debug(audioURL.current[audioURLIndex.current], 'Playing');
      const listener = new THREE.AudioListener();
      const audio = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();

      const analyzeFrequency = () => {
        if (audioAnalyser.current) {
          const data = audioAnalyser.current.getFrequencyData();

          // Check if data contains non-zero values
          if (data.some(value => value > 0)) {
            const averageFrequency = data.reduce((sum, value) => sum + value, 0) / data.length;
            setFrequency(averageFrequency);
          } else {
          }

          // Call analyzeFrequency again if the audio is still playing
          if (audio.isPlaying) {
            requestAnimationFrame(analyzeFrequency);
          }
        }
      };

      load(audioURL.current[audioURLIndex.current], {
        autoplay: true,
        format: 'wav',
        initialMute: true,

        onload: () => {
          audioLoader.load(audioURL.current[audioURLIndex.current], buffer => {
            audio.setBuffer(buffer);
            audioAnalyser.current = new THREE.AudioAnalyser(audio, 32);
            console.debug(audioAnalyser.current, 'audioAnalyser.current');
            // Start playing the audio
            audio.play();
            setIsPlayingAudio(true);
            // Delay the analysis to ensure the audio is playing
            setTimeout(() => {
              analyzeFrequency();
            }, 100); // Wait 100ms before starting to analyze
          });
        },

        onstop() {
          audio.stop();
          setIsPlayingAudio(false);
        },

        onend: () => {
          if (audioURL.current[audioURLIndex.current + 1]) {
            audioURLIndex.current = audioURLIndex.current + 1;
            playAudio();
          } else if (audioURLIndex.current + 1 < audioMapIndex.current) {
            // It's not ready yet
            currentWaitingIndex.current = audioURLIndex.current + 1;
          } else {
            setIsPlayingAudio(false);
            audioURL.current = {};
            audioURLIndex.current = -1;
            audioMapIndex.current = -1;
            currentWaitingIndex.current = -1;
          }
        },
      });
    }
  };

  const addToFetchQueue = (messageId: string, text: string) => {
    fetchTTS(messageId, text);
  };

  const fetchTTS = async (messageId: string, text: string) => {
    try {
      const index = audioMapIndex.current + 1;
      audioMapIndex.current += 1;
      const response = await fetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: text,
          reference_id: messageId,
          normalize: true,
          format: 'wav',
          latency: 'balanced',
          max_new_tokens: 2048,
          chunk_length: 200,
          repetition_penalty: 1.5,
        }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioURL.current[index] = audioUrl;

      if (audioURLIndex.current === -1 && index === 0) {
        audioURLIndex.current = 0;
        playAudio();
      } else if (currentWaitingIndex.current !== -1 && currentWaitingIndex.current === index) {
        audioURLIndex.current += 1;
        playAudio();
      }
    } catch (error) {
      console.error('Error fetching TTS audio:', error);
    }
  };
  // Handle submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset messages
    currentText.current = '';
    currentCount.current = 0;
    lastMsg.current = '';
    checkpoint.current = 10;
    audioURL.current = {};
    audioURLIndex.current = -1;
    audioMapIndex.current = -1;
    currentWaitingIndex.current = -1;
    // setIsStopAudio(false);
    handleSubmit(e);
  };

  // Start recording audio
  const startRecording = async () => {
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext!.createMediaStreamSource(stream);

      analyser = audioContext!.createAnalyser();
      analyser.fftSize = 1024;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.debug(audioContext);
        // setIsPlayingAudio(true);
        if (audioContext) {
          audioContext.close();
        }
        cancelAnimationFrame(animationFrameId);
        waveBars.current.forEach(bar => {
          if (bar) {
            bar.style.height = '10px';
          }
        });

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioData = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = [];
        for (let i = 0; i < audioData.numberOfChannels; i++) {
          channelData.push(audioData.getChannelData(i));
        }

        const wavData = await WavEncoder.encode({
          sampleRate: audioData.sampleRate,
          channelData: channelData,
        });

        const wavBlob = new Blob([new Uint8Array(wavData)], {
          type: 'audio/wav',
        });

        // const audioUrl = URL.createObjectURL(wavBlob);
        // setAudioURL(audioUrl);

        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');

        try {
          const response = await fetch('/api/tokenize', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to tokenize audio');
          }

          const data = await response.json();
          setInput(`<|sound_start|>${data.tokens}`);
        } catch (error) {
          console.error('Error tokenizing audio:', error);
          setIsPlayingAudio(false);
        }
      };

      const animateWave = () => {
        analyser!.getByteFrequencyData(dataArray);

        // Adjust each bar height based on audio frequency data
        waveBars.current.forEach((bar, i) => {
          const value = dataArray[i];
          const barHeight = (value / 255) * 100; // Normalize to 100%
          if (bar) {
            bar.style.height = `${barHeight}px`;
          }
        });

        animationFrameId = requestAnimationFrame(animateWave);
      };

      animateWave();
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsPlayingAudio(false);
    }
  };

  // stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimeout(() => {
        setTime(0);
      }, 500);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
    } catch (error) {}
  };

  return (
    <main className="px-8 flex flex-col w-full h-svh overflow-hidden">
      {permission === 'denied' && <ModalPermissionDenied />}

      <div className="flex-shrink-0">
        <SocialLinks />
      </div>

      <div className="h-full bg-background flex justify-center items-center relative">
        <AudioVisualizers />
        {os == 'undetermined' ? (
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

        <div
          className={twMerge(
            'invisible flex flex-col overflow-x-hidden justify-between opacity-0 -right-80 w-full md:w-[400px] border border-border rounded-xl h-[calc(100%-24px)] absolute top-6 bg-background duration-500 transition-[transform, border-radius] z-40',
            isChatVisible && 'visible opacity-1 right-0',
          )}
        >
          <ChatMessages messages={messages as Message[]} containerRef={listRef} onScroll={handleScroll} />
          <ChatInput ref={inputRef} inputValue={maskingValueInput} isDisabled={isPlayingAudio || isLoading} onSubmit={handleFormSubmit} onInputChange={handleInputChange} setInput={setInput} />
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-center items-center h-32 lg:h-48 relative w-full ">
        <AudioControllers
          isRecording={isRecording}
          isPlayingAudio={isPlayingAudio}
          isLoading={isLoading}
          time={time}
          maxTime={maxTime}
          permission={permission}
          os={os}
          waveBars={waveBars}
          startRecording={startRecording}
          stopRecording={stopRecording}
          stopAudio={stop}
          requestMicrophonePermission={requestMicrophonePermission}
        />

        <div className={twMerge('absolute right-0 bottom-8 lg:bottom-16 transition-colors duration-500')}>
          <div className="flex gap-4 items-center">
            <span className="hidden md:block text-xs">{os == 'undetermined' ? <Skeleton className="h-4 w-[40px]" /> : <>{isMac ? '⌘' : 'Ctrl'} + B</>}</span>
            <IoChatbubbleEllipsesSharp size={28} onClick={() => setIsChatVisible(!isChatVisible)} className={twMerge('cursor-pointer', isChatVisible && 'dark:text-blue-300 text-blue-700 ')} />
          </div>
        </div>

        {permission === 'granted' && (
          <div
            className={twMerge(
              'fixed z-20 p-4 border border-border rounded-lg mb-2 -left-80 bottom-24 invisible transition-all duration-500 bg-background',
              isSettingVisible && 'visible opacity-1 left-0',
            )}
          >
            <AudioSelector />
          </div>
        )}

        {permission === 'granted' && (
          <div className="absolute left-0 bottom-4 lg:bottom-14 w-10 h-10">
            <IoSettingsSharp size={28} onClick={() => setIsSettingVisible(!isSettingVisible)} className={twMerge('cursor-pointer', isSettingVisible && 'dark:text-blue-300 text-blue-700 ')} />
          </div>
        )}
      </div>
    </main>
  );
};

export default MainView;

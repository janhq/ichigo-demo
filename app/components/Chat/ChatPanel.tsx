'use client';
import { Message } from '@ai-sdk/react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import ChatInput from './ChatInput';
import ChatMessages from './ChatMessages';

interface ChatPanelProps {
  isChatVisible: boolean;
  messages: Message[];
  maskingValueInput: string;
  isPlayingAudio: boolean;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  listRef: React.RefObject<HTMLDivElement>;
  handleScroll: (event: React.UIEvent<HTMLElement>) => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setInput: (value: string) => void;
}

const ChatPanel = ({ isChatVisible, messages, maskingValueInput, isPlayingAudio, isLoading, inputRef, listRef, handleScroll, handleFormSubmit, handleInputChange, setInput }: ChatPanelProps) => {
  return (
    <div
      className={twMerge(
        'invisible flex flex-col overflow-x-hidden justify-between opacity-0 -right-80 w-full md:w-[400px] border border-border rounded-xl h-[calc(100%-24px)] absolute top-6 bg-background duration-500 transition-[transform, border-radius] z-40',
        isChatVisible && 'visible opacity-1 right-0',
      )}
    >
      <ChatMessages messages={messages} containerRef={listRef} onScroll={handleScroll} />
      <ChatInput ref={inputRef} inputValue={maskingValueInput} isDisabled={isPlayingAudio || isLoading} onSubmit={handleFormSubmit} onInputChange={handleInputChange} setInput={setInput} />
    </div>
  );
};

export default ChatPanel;

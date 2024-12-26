import { Input } from '@/components/ui/input';
import React, { forwardRef } from 'react';
import { IoSend } from 'react-icons/io5';

interface ChatInputProps {
  inputValue: string;
  isDisabled: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setInput: (value: string) => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(({ inputValue, isDisabled, onSubmit, onInputChange, setInput }, ref) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="relative">
        <IoSend size={20} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" />
        <Input
          ref={ref}
          value={inputValue}
          disabled={isDisabled}
          onClick={onSubmit}
          onChange={e => {
            onInputChange(e);
            if (e.target.value.includes('<|sound_start|>')) {
              setInput('This is an audio message');
            }
          }}
          type="text"
          placeholder="Type a message..."
          className="w-full h-12 p-4 border-0 border-t rounded-t-none focus-within:outline-none focus-visible:ring-0 cursor-pointer"
        />
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;

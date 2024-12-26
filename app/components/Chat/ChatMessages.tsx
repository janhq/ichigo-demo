import { Message } from '@ai-sdk/react';
import { twMerge } from 'tailwind-merge';

interface ChatMessagesProps {
  messages: Message[];
  containerRef: React.RefObject<HTMLDivElement>;
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
}

const ChatMessages = ({ messages, containerRef, onScroll }: ChatMessagesProps) => {
  return (
    <div className="h-full overflow-x-hidden mt-2 mb-4" ref={containerRef} onScroll={onScroll}>
      <div className={twMerge('space-y-4 h-full p-4', !messages.length && 'flex justify-center items-center')}>
        {!messages.length && (
          <div className="flex justify-center items-center flex-col w-full">
            <h2 className="text-xl font-semibold">No chat history</h2>
            <p className="mt-1 text-muted-foreground">How can I help u today?</p>
          </div>
        )}
        <div className="flex flex-col gap-4 overflow-x-hidden">
          {messages.map(m => {
            const displayContent = m.role === 'user' ? m.content.startsWith('<|sound_start|>') ? <i>🔊 This is an audio message 🔊</i> : m.content.split(' ').slice(0, 10).join(' ') : m.content;
            return (
              <div key={m.id} className={twMerge('px-3 py-1.5 rounded-lg max-w-[80%] shadow-sm', m.role === 'user' ? 'bg-foreground text-background ml-auto border' : 'border ')}>
                <p className="whitespace-pre-wrap">{displayContent}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessages;

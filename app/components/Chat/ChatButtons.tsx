import { Skeleton } from '@/components/ui/skeleton';
import { IoChatbubbleEllipsesSharp } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';

interface ChatToggleButtonProps {
  os: string;
  isMac: boolean;
  isChatVisible: boolean;
  onToggle: () => void;
}

const ChatButtons = ({ os, isMac, isChatVisible, onToggle }: ChatToggleButtonProps) => {
  return (
    <div className={twMerge('absolute right-0 bottom-8 lg:bottom-16 transition-colors duration-500')}>
      <div className="flex gap-4 items-center">
        <span className="hidden md:block text-xs">{os == 'undetermined' ? <Skeleton className="h-4 w-[40px]" /> : <>{isMac ? '⌘' : 'Ctrl'} + B</>}</span>
        <IoChatbubbleEllipsesSharp size={28} onClick={onToggle} className={twMerge('cursor-pointer', isChatVisible && 'dark:text-blue-300 text-blue-700 ')} />
      </div>
    </div>
  );
};

export default ChatButtons;

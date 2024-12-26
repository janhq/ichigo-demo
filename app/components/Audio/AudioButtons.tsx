import { IoSettingsSharp } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import AudioSettings from './AudioSettings';

interface SettingsButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  permission: PermissionState | undefined;
}

const AudioButtons = ({ isVisible, onToggle, permission }: SettingsButtonProps) => {
  return (
    <>
      {permission === 'granted' && (
        <>
          <div className="absolute left-0 bottom-4 lg:bottom-14 w-10 h-10">
            <IoSettingsSharp size={28} onClick={onToggle} className={twMerge('cursor-pointer', isVisible && 'dark:text-blue-300 text-blue-700')} />
          </div>
          <AudioSettings isVisible={isVisible} />
        </>
      )}
    </>
  );
};

export default AudioButtons;

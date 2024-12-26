import { FaDiscord, FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

import Logo from '../../../components/ui/logo';
import RealtimeTracker from '../../../components/ui/realtimeTracker';
import ThemeSwitch from '../../../components/ui/themeSwitch';

const SocialLinks = () => {
  return (
    <div className="flex-shrink-0">
      <nav className="h-20 flex justify-between items-center">
        <div className="flex gap-2">
          <Logo />
          <span className="font-medium">Ichigo</span>
        </div>
        <RealtimeTracker />
        <div className=" gap-4 text-foreground items-center hidden md:flex">
          <a href="https://github.com/homebrewltd/ichigo" target="_blank">
            <FaGithub size={20} />
          </a>
          <a href="https://discord.com/invite/FTk2MvZwJH" target="_blank">
            <FaDiscord size={24} />
          </a>
          <a href="https://x.com/homebrewltd" target="_blank">
            <FaXTwitter size={20} />
          </a>
          <ThemeSwitch />
        </div>
      </nav>
    </div>
  );
};

export default SocialLinks;

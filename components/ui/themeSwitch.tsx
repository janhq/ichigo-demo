import { MdOutlineDarkMode, MdOutlineWbSunny } from 'react-icons/md';

import { useTheme } from 'next-themes';

const ThemeSwitch = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const renderIcon = () => {
    switch (resolvedTheme) {
      case 'light':
        return <MdOutlineWbSunny size={24} />;

      default:
        return <MdOutlineDarkMode size={24} />;
    }
  };

  return (
    <div className="hidden md:flex ml-8 items-center justify-center cursor-pointer" onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}>
      {renderIcon()}
    </div>
  );
};

export default ThemeSwitch;

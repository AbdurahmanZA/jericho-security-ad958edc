
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('jericho-theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Default to dark theme
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('jericho-theme', newTheme ? 'dark' : 'light');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
    >
      {isDark ? <Sun className="w-3 h-3 mr-2" /> : <Moon className="w-3 h-3 mr-2" />}
      {isDark ? 'Light' : 'Dark'}
    </Button>
  );
};

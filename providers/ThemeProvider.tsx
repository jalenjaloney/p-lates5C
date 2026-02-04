import React, { createContext, useContext, useState, ReactNode } from 'react';
import { tokens, ColorScheme } from '../constants/tokens';

type ThemeContextType = {
  colorScheme: ColorScheme;
  colors: typeof tokens.color.light | typeof tokens.color.dark;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

  const colors = colorScheme === 'dark' ? tokens.color.dark : tokens.color.light;

  const toggleColorScheme = () => {
    setColorSchemeState('light');
  };

  const setColorScheme = (_scheme: ColorScheme) => {
    setColorSchemeState('light');
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, colors, toggleColorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset PrimeNG com a identidade Zentro:
 * primaria = azul #2563EB (proposta A); o dark mode usa o seletor
 * [data-theme="dark"] alinhado aos tokens CSS (proposta B).
 */
export const ZentroPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },
});

export const ZENTRO_THEME = {
  preset: ZentroPreset,
  options: {
    darkModeSelector: '[data-theme="dark"]',
  },
};

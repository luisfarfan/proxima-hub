import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const proximaAuraPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
    transitionDuration: '0.15s',
    focusRing: {
      width: '2px',
      style: 'solid',
      offset: '0',
      color: '{primary.color}',
      shadow: 'none',
    },
    content: {
      borderRadius: '{border.radius.md}',
    },
    overlay: {
      popover: {
        borderRadius: '{border.radius.lg}',
        shadow: 'none',
      },
      modal: {
        borderRadius: '{border.radius.xl}',
        shadow: 'none',
      },
      select: {
        borderRadius: '{border.radius.md}',
        shadow: 'none',
      },
    },
    navigation: {
      item: {
        padding: '0.625rem',
        borderRadius: '{border.radius.md}',
        gap: '0.5rem',
      },
      list: {
        gap: '0.125rem',
      },
    },
  },
  components: {
    dialog: {
      root: {
        borderRadius: '{overlay.modal.borderRadius}',
      },
      header: {
        padding: '1rem 1.25rem',
      },
      content: {
        padding: '0 1.25rem 1rem',
      },
      footer: {
        padding: '1rem 1.25rem',
      },
    },
    card: {
      root: {
        borderRadius: '{border.radius.lg}',
        shadow: 'none',
      },
      body: {
        padding: '1rem 1.25rem',
      },
      title: {
        fontSize: '0.8125rem',
        fontWeight: '600',
      },
    },
  },
});

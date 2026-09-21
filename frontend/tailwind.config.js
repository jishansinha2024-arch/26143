/** @type {import('tailwindcss').Config} */
module.exports = {
    // `overline` is a Tailwind utility; without this an app's own eyebrow-label class draws a line above the text.
    blocklist: ["overline"],
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '0.75rem',
        '2xl': '1rem'
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        gutter: '0.75rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        'template-display': ['\"Bricolage Grotesque\"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['\"Bricolage Grotesque\"', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
        'display-lg': ['Geist', 'Inter', 'sans-serif'],
        'headline-lg': ['Geist', 'Inter', 'sans-serif'],
        'headline-md': ['Geist', 'Inter', 'sans-serif'],
        'headline-sm': ['Geist', 'Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'code-telemetry': ['"JetBrains Mono"', 'monospace'],
        'code-telemetry-sm': ['"JetBrains Mono"', 'monospace']
      },
      transitionTimingFunction: { surge: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['15px', { lineHeight: '20px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-md': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-lg': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }],
        'code-telemetry': ['12px', { lineHeight: '16px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'code-telemetry-sm': ['10px', { lineHeight: '12px', letterSpacing: '0.02em', fontWeight: '500' }]
      },
      colors: {
        paper: '#f3f1ec',
        mist: '#ffffff',
        shell: '#e7e3da',
        ink: '#16262e',
        muted: '#5f7684',
        tide: '#1f7f93',
        flare: '#c25a49',
        signal: '#b8862a',
        /* ---- Varuna Netra redesign palette (Material-style tonal surfaces) ---- */
        'surface': '#f7f9fb',
        'surface-bright': '#f7f9fb',
        'surface-dim': '#d8dadc',
        'surface-tint': '#006398',
        'surface-variant': '#e0e3e5',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-surface': '#191c1e',
        'on-surface-variant': '#3f4850',
        'on-background': '#191c1e',
        'outline': '#707881',
        'outline-variant': '#bfc7d2',
        'inverse-surface': '#2d3133',
        'inverse-on-surface': '#eff1f3',
        'inverse-primary': '#93ccff',
        'primary-container': '#007bb9',
        'primary-fixed': '#cce5ff',
        'primary-fixed-dim': '#93ccff',
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        'on-primary-fixed': '#001d31',
        'on-primary-fixed-variant': '#004b73',
        'secondary-container': '#86f2e4',
        'secondary-fixed': '#89f5e7',
        'secondary-fixed-dim': '#6bd8cb',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#006f66',
        'on-secondary-fixed': '#00201d',
        'on-secondary-fixed-variant': '#005049',
        'tertiary': '#545c72',
        'tertiary-container': '#6c748b',
        'tertiary-fixed': '#dae2fd',
        'tertiary-fixed-dim': '#bec6e0',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fefcff',
        'on-tertiary-fixed': '#131b2e',
        'on-tertiary-fixed-variant': '#3f465c',
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        /* ---- The app was authored for a dark UI. These scales are re-mapped so every existing
              text-slate-*, bg-slate-*, text-cyan-* ... class resolves to the light redesign
              (100 = strongest text ... 900 = subtle panel tint). ---- */
        slate: {
          50: '#f7f9fb', 100: '#191c1e', 200: '#24292c', 300: '#3f4850', 400: '#566069', 500: '#707881',
          600: '#8b939b', 700: '#bfc7d2', 800: '#e6e8ea', 900: '#f2f4f6', 950: '#ffffff'
        },
        cyan: {
          50: '#eaf5fc', 100: '#004b73', 200: '#004b73', 300: '#006a9e', 400: '#006194', 500: '#006194', 600: '#004b73', 700: '#004b73', 800: '#003a5a', 900: '#002b44', 950: '#001d31'
        },
        sky: {
          50: '#eaf5fc', 100: '#cce5ff', 200: '#93ccff', 300: '#006194', 400: '#007bb9', 500: '#006194', 600: '#004b73', 700: '#004b73', 800: '#003a5a', 900: '#002b44', 950: '#001d31'
        },
        amber: {
          50: '#fff8ea', 100: '#ffefc9', 200: '#7a4b00', 300: '#8a5300', 400: '#b26a00', 500: '#b26a00', 600: '#8a5300', 700: '#6b4000', 800: '#4f2f00', 900: '#3a2200', 950: '#261600'
        },
        emerald: {
          50: '#e8f6f3', 100: '#c9ece6', 200: '#005049', 300: '#006a61', 400: '#00796b', 500: '#006a61', 600: '#005a52', 700: '#005049', 800: '#003d37', 900: '#002b27', 950: '#001a17'
        },
        rose: {
          50: '#fff0ee', 100: '#ffdad6', 200: '#93000a', 300: '#ba1a1a', 400: '#ba1a1a', 500: '#ba1a1a', 600: '#a11616', 700: '#93000a', 800: '#7a0008', 900: '#5c0006', 950: '#3d0004'
        },
        red: {
          50: '#ffffff', 100: '#ffdad6', 200: '#93000a', 300: '#ba1a1a', 400: '#ba1a1a', 500: '#ba1a1a', 600: '#a11616', 700: '#93000a', 800: '#7a0008', 900: '#5c0006', 950: '#3d0004'
        },
        purple: {
          50: '#f4effb', 100: '#e7dcf6', 200: '#4a3480', 300: '#6f4fa8', 400: '#7a57b8', 500: '#6f4fa8', 600: '#5d3f92', 700: '#4a3480', 800: '#382768', 900: '#281b4c', 950: '#180f30'
        },
        violet: {
          50: '#f0eefc', 100: '#e2defa', 200: '#3f3396', 300: '#5b4bb7', 400: '#6e5cd0', 500: '#5b4bb7', 600: '#4b3da0', 700: '#3f3396', 800: '#31277a', 900: '#221b56', 950: '#150f38'
        },
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'hsl(var(--chart-1) / <alpha-value>)',
          '2': 'hsl(var(--chart-2) / <alpha-value>)',
          '3': 'hsl(var(--chart-3) / <alpha-value>)',
          '4': 'hsl(var(--chart-4) / <alpha-value>)',
          '5': 'hsl(var(--chart-5) / <alpha-value>)'
        }
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
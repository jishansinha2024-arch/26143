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
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      transitionTimingFunction: {
        surge: 'cubic-bezier(0.23, 1, 0.32, 1)'
      },
      colors: {
        /* Daylight palette (login / entry screen) */
        paper: '#f3f1ec',
        mist: '#ffffff',
        shell: '#e7e3da',
        ink: '#16262e',
        fog: '#5f7684',
        tide: '#1f7f93',
        flare: '#c25a49',
        signal: '#b8862a',
        /* Neutral scale re-tinted to the ink palette so every existing
           text-slate-* / bg-slate-* / border-slate-* follows the new theme */
        slate: {
          50: '#f7f6f2',
          100: '#efede7',
          200: '#e2dfd6',
          300: '#c9cfd0',
          400: '#7d919c',
          500: '#667b88',
          600: '#506672',
          700: '#3a4f5b',
          800: '#24373f',
          900: '#16262e',
          950: '#0e1a20'
        },
        /* Blue / cyan accents collapse into the single "tide" teal */
        sky: {
          50: '#eef7f9',
          100: '#d9edf1',
          200: '#b3dbe3',
          300: '#82c2cf',
          400: '#4aa3b6',
          500: '#1f7f93',
          600: '#1a6c7e',
          700: '#155766',
          800: '#114654',
          900: '#0d3540',
          950: '#082530'
        },
        cyan: {
          50: '#eef7f9',
          100: '#d9edf1',
          200: '#b3dbe3',
          300: '#82c2cf',
          400: '#4aa3b6',
          500: '#1f7f93',
          600: '#1a6c7e',
          700: '#155766',
          800: '#114654',
          900: '#0d3540',
          950: '#082530'
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
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
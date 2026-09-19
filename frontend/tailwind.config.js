/** @type {import('tailwindcss').Config} */
module.exports = {
  blocklist: ["overline"],
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ink:{950:'#05080F',900:'#080D18',850:'#0B1120',800:'#101829',750:'#151F33',700:'#1C2740'},
        mist:{DEFAULT:'#E9EEF8',soft:'#C3CDDF',muted:'#8D9AB3',faint:'#606E88'},
        aqua:{300:'#8CEEF8',400:'#54DDEE',500:'#22C3DC',600:'#0E9CB6'},
        iris:{300:'#C4B5FD',400:'#A78BFA',500:'#8B7DF6',600:'#6D5DE8'},
        mint:'#3DD68C',amber:'#F5B544',rose:'#FB7185'
      },
      fontFamily:{
        display:['"Plus Jakarta Sans"','Inter','system-ui','sans-serif'],
        sans:['Inter','system-ui','sans-serif'],
        mono:['"JetBrains Mono"','ui-monospace','monospace']
      },
      borderRadius:{'2xl':'1.15rem','3xl':'1.6rem','4xl':'2.2rem'},
      boxShadow:{
        lift:'0 1px 0 0 rgba(255,255,255,0.05) inset, 0 18px 44px -24px rgba(0,0,0,0.85)',
        panel:'0 1px 0 0 rgba(255,255,255,0.04) inset, 0 30px 70px -40px rgba(0,0,0,0.95)',
        glowAqua:'0 0 0 1px rgba(84,221,238,0.25), 0 16px 40px -18px rgba(34,195,220,0.55)',
        glowIris:'0 0 0 1px rgba(167,139,250,0.25), 0 16px 40px -18px rgba(139,125,246,0.5)'
      },
      transitionTimingFunction:{premium:'cubic-bezier(0.23,1,0.32,1)'},
      keyframes:{
        float:{'0%,100%':{transform:'translate3d(0,0,0)'},'50%':{transform:'translate3d(0,-14px,0)'}},
        drift:{'0%,100%':{transform:'translate3d(0,0,0) rotate(0deg)'},'50%':{transform:'translate3d(10px,-18px,0) rotate(4deg)'}},
        spinSlow:{to:{transform:'rotate(360deg)'}},
        shimmer:{'100%':{transform:'translateX(100%)'}},
        pulseDot:{'0%,100%':{opacity:'1',transform:'scale(1)'},'50%':{opacity:'.45',transform:'scale(.82)'}},
        sweep:{to:{transform:'rotate(360deg)'}}
      },
      animation:{
        float:'float 7s cubic-bezier(.45,0,.55,1) infinite',
        drift:'drift 11s cubic-bezier(.45,0,.55,1) infinite',
        spinSlow:'spinSlow 38s linear infinite',
        shimmer:'shimmer 1.9s linear infinite',
        pulseDot:'pulseDot 2.2s ease-in-out infinite',
        sweep:'sweep 4.5s linear infinite'
      }
    }
  },
  plugins:[require("tailwindcss-animate")]
};

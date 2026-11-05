/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        abyss: {
          950: '#030712',
          900: '#060B14',
          800: '#0A1322',
          700: '#0E1D33',
          600: '#142948',
          500: '#1B3760',
        },
        biolum: {
          cyan: '#00F2FE',
          teal: '#05D5B2',
          electric: '#4FACFE',
          emerald: '#00E676',
        },
        alert: {
          amber: '#FF9F1C',
          crimson: '#FF4757',
        },
        sensor: {
          imu: '#9D4EDD',
          depth: '#00D2D3',
          turbidity: '#E67E22',
          fused: '#00F2FE',
          fixed: '#F39C12',
          dr: '#FF4757',
          truth: '#FFFFFF',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Space Mono"', 'Consolas', 'monospace'],
        display: ['"Orbitron"', '"Rajdhani"', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        glowCyan: {
          '0%': { boxShadow: '0 0 10px rgba(0, 242, 254, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 242, 254, 0.8), 0 0 40px rgba(79, 172, 254, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}

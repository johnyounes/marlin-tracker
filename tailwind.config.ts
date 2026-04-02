import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a1628', light: '#122240', mid: '#1a3055' },
        accent: { DEFAULT: '#00d4ff', dim: '#0099bb' },
        ocean: {
          green: '#00e676',
          orange: '#ff9100',
          red: '#ff1744',
          gold: '#ffc107',
          blue: '#448aff',
          purple: '#7c4dff',
          teal: '#00bcd4',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config

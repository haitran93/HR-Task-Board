/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        bg: '#FDF6EA',
        surface: '#FFFFFF',
        ink: '#141414',
        muted: '#6F6A60',
        faded: '#CDC5B2',
        subtleBorder: '#EEE3CF',
        accent: '#FFD23F',
        program: {
          salary: '#EAB308',
          feedback: '#2E5FE4',
          training: '#2E7D4F',
          retreat: '#E4572E',
        },
        overdueTint: '#FFE9E0',
        todayTint: '#FDF0D0',
        weekendTint: '#FDFAF3',
        sticky: {
          yellow: '#FFD23F',
          green: '#B9E4C5',
          pink: '#F6C6DA',
          blue: '#CFD8F9',
        },
      },
      borderRadius: {
        screen: '18px',
        card: '16px',
        btn: '11px',
        btnLg: '12px',
        pill: '22px',
        chip: '9px',
        sticky: '4px',
      },
      boxShadow: {
        card: '4px 4px 0 #141414',
        btn: '3px 3px 0 #141414',
        btnPressed: '1px 1px 0 #141414',
        emphasisRed: '3px 3px 0 #E4572E',
        emphasisYellow: '4px 4px 0 #FFD23F',
        stickyShadow: '4px 5px 0 rgba(20,20,20,.25)',
      },
    },
  },
  plugins: [],
}

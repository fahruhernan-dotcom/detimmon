/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'Inter',
  				'Plus Jakarta Sans',
  				'system-ui',
  				'-apple-system',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'monospace'
  			],
  			display: [
  				'Plus Jakarta Sans',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'Newsreader',
  				'Georgia',
  				'serif'
  			],
  			editorial: [
  				'Newsreader',
  				'Georgia',
  				'serif'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			slate: {
  				'700': '#22365F',
  				'800': '#172544',
  				'850': '#0F1A30',
  				'900': '#0B1324',
  				'950': '#060B13'
  			},
  			gold: {
  				'300': '#F5E8BA',
  				'400': '#E6CB72',
  				'500': '#D4AF37',
  				'600': '#AA881E',
  				'700': '#806411'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				blue: '#2563EB',
  				cyan: '#0EA5E9',
  				emerald: '#10B981',
  				amber: '#F59E0B',
  				rose: '#F43F5E'
  			}
  		},
  		boxShadow: {
  			diffusion: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
  			'gold-subtle': '0 4px 20px -2px rgba(212, 175, 55, 0.15)',
  			'glass-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			bento: '1.5rem'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontSize: {
        // Standardized typography scale using rem units
        // Base font size: 16px (1rem), scale ratio: 1.25 (major third)

        // Micro text - for captions, metadata, small labels
        'xs': ['0.75rem', {
          lineHeight: '1.5',
          letterSpacing: '0.025em'
        }],

        // Small text - for secondary information, form labels
        'sm': ['0.875rem', {
          lineHeight: '1.5',
          letterSpacing: '0.025em'
        }],

        // Base text - for body text, paragraphs
        'base': ['1rem', {
          lineHeight: '1.6',
          letterSpacing: '0.01em'
        }],

        // Large text - for emphasized content, lead paragraphs
        'lg': ['1.125rem', {
          lineHeight: '1.6',
          letterSpacing: '0.005em'
        }],

        // Extra large - for section headings, important content
        'xl': ['1.25rem', {
          lineHeight: '1.4',
          letterSpacing: '0'
        }],

        // 2XL - for page section titles, major headings
        '2xl': ['1.5rem', {
          lineHeight: '1.3',
          letterSpacing: '-0.005em'
        }],

        // 3XL - for page titles, hero headings
        '3xl': ['1.875rem', {
          lineHeight: '1.2',
          letterSpacing: '-0.01em'
        }],

        // 4XL - for major hero titles, landing pages
        '4xl': ['2.25rem', {
          lineHeight: '1.1',
          letterSpacing: '-0.015em'
        }],

        // 5XL - for very large display text
        '5xl': ['3rem', {
          lineHeight: '1',
          letterSpacing: '-0.02em'
        }],

        // 6XL - for maximum impact display text
        '6xl': ['3.75rem', {
          lineHeight: '0.95',
          letterSpacing: '-0.025em'
        }],

        // Specialized sizes for specific use cases
        'caption': ['0.6875rem', {
          lineHeight: '1.4',
          letterSpacing: '0.05em'
        }],

        'button': ['0.875rem', {
          lineHeight: '1.2',
          letterSpacing: '0.025em',
          fontWeight: '500'
        }],

        'input': ['0.875rem', {
          lineHeight: '1.5',
          letterSpacing: '0.01em'
        }],

        'label': ['0.8125rem', {
          lineHeight: '1.4',
          letterSpacing: '0.025em',
          fontWeight: '500'
        }],

        'overline': ['0.75rem', {
          lineHeight: '1.4',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }]
      },
      fontFamily: {
        // Standardized font stacks for better cross-platform consistency
        'sans': [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji'
        ],
        'mono': [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Code',
          'Droid Sans Mono',
          'Source Code Pro',
          'Consolas',
          'Roboto Mono',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      spacing: {
        // Responsive spacing scale that scales with viewport
        'fluid-xs': 'clamp(0.5rem, 1vw, 0.75rem)',
        'fluid-sm': 'clamp(0.75rem, 1.5vw, 1rem)',
        'fluid-md': 'clamp(1rem, 2vw, 1.5rem)',
        'fluid-lg': 'clamp(1.5rem, 3vw, 2rem)',
        'fluid-xl': 'clamp(2rem, 4vw, 3rem)',
        'fluid-2xl': 'clamp(3rem, 6vw, 4rem)',
      },
      screens: {
        // Enhanced responsive breakpoints with better mobile coverage
        'xss': '375px',
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'tall': { 'raw': '(min-height: 800px)' },
        'short': { 'raw': '(max-height: 600px)' },
      },
      colors: {
        // app-inspired comprehensive color palette
        primary: {
          50: '#f0fdf4',   // Very light green
          100: '#dcfce7',  // Light green
          200: '#bbf7d0',  // Light green
          300: '#86efac',  // Light green
          400: '#4ade80',  // Medium green
          500: '#07C160',  // app green
          600: '#059669',  // Darker green
          700: '#047857',  // Dark green
          800: '#065f46',  // Very dark green
          900: '#064e3b'   // Darkest green
        },
        // Comprehensive app color system
        app: {
          light: {
            // Background colors
            bg: '#F7F7F7',           // Main background
            surface: '#FFFFFF',      // Card/surface background
            'surface-secondary': '#FAFAFA', // Secondary surface
            'surface-hover': '#F0F0F0',     // Hover surface
            'surface-active': '#E8E8E8',    // Active surface
            'surface-dark': '#F5F5F5',      // Darker surface for depth

            // Text colors
            'text-primary': '#333333',      // Primary text
            'text-secondary': '#666666',    // Secondary text
            'text-secondary-dark': '#555555', // Darker secondary text
            'text-tertiary': '#999999',     // Tertiary text
            'text-on-accent': '#FFFFFF',    // Text on accent backgrounds

            // Border colors
            border: '#E5E5E5',        // Default border
            'border-light': '#F0F0F0', // Light border
            'border-hover': '#CCCCCC', // Hover border
            'border-dark': '#D0D0D0',  // Darker border for emphasis

            // Accent colors for different element types
            accent: '#07C160',           // Primary accent (app green)
            'accent-hover': '#06AD56',   // Hover accent
            'accent-light': '#E8F5E8',   // Light accent background
            'accent-secondary': '#10B981', // Secondary accent (emerald)
            'accent-tertiary': '#059669',  // Tertiary accent

            // Status colors
            success: '#07C160',        // Success (green)
            'success-light': '#E8F5E8', // Success background
            warning: '#FF8C00',        // Warning (orange)
            'warning-light': '#FFF4E6', // Warning background
            error: '#FF4757',          // Error (red)
            'error-light': '#FFE6E6',   // Error background
            info: '#007AFF',           // Info (blue)
            'info-light': '#E6F3FF',    // Info background

            // Interactive elements
            'button-primary': '#07C160',    // Primary button
            'button-secondary': '#FFFFFF',  // Secondary button
            'button-outline': '#07C160',    // Outline button
            'link': '#007AFF',              // Link color
            'link-hover': '#0056CC',        // Link hover

            // Form elements
            'input-bg': '#F5F5F5',          // Darker surface for form depth
            'input-border': '#E5E5E5',      // Default border
            'input-focus': '#07C160',       // Input focus ring
            'placeholder': '#555555',       // Darker placeholder text

            // Navigation
            'nav-bg': '#FFFFFF',            // Navigation background
            'nav-border': '#E5E5E5',        // Navigation border
            'nav-active': '#07C160',        // Active navigation item
          },
          dark: {
            // Background colors
            bg: '#1A1A1A',           // Main background
            surface: '#2A2A2A',      // Card/surface background
            'surface-secondary': '#333333', // Secondary surface
            'surface-hover': '#404040',     // Hover surface
            'surface-active': '#4A4A4A',    // Active surface
            'surface-dark': '#252525',      // Darker surface for depth

            // Text colors
            'text-primary': '#FFFFFF',      // Primary text
            'text-secondary': '#CCCCCC',    // Secondary text
            'text-tertiary': '#999999',     // Tertiary text
            'text-secondary-dark': '#AAAAAA',    // Darker secondary text
            'text-on-accent': '#FFFFFF',    // Text on accent backgrounds

            // Border colors
            border: '#404040',        // Default border
            'border-light': '#4A4A4A', // Light border
            'border-hover': '#666666', // Hover border
            'border-dark': '#353535',  // Darker border for emphasis

            // Accent colors for different element types
            accent: '#07C160',           // Primary accent (app green)
            'accent-hover': '#06AD56',   // Hover accent
            'accent-light': '#1A3320',   // Light accent background
            'accent-secondary': '#10B981', // Secondary accent (emerald)
            'accent-tertiary': '#059669',  // Tertiary accent

            // Status colors
            success: '#07C160',        // Success (green)
            'success-light': '#1A3320', // Success background
            warning: '#FF8C00',        // Warning (orange)
            'warning-light': '#332600', // Warning background
            error: '#FF4757',          // Error (red)
            'error-light': '#331A1A',   // Error background
            info: '#007AFF',           // Info (blue)
            'info-light': '#001A33',    // Info background

            // Interactive elements
            'button-primary': '#07C160',    // Primary button
            'button-secondary': '#2A2A2A',  // Secondary button
            'button-outline': '#07C160',    // Outline button
            'link': '#007AFF',              // Link color
            'link-hover': '#4D9EFF',        // Link hover

            // Form elements
            'input-bg': '#252525',          // Darker surface for form depth
            'input-border': '#404040',      // Default border
            'input-focus': '#07C160',       // Input focus ring
            'placeholder': '#AAAAAA',       // Darker placeholder text

            // Navigation
            'nav-bg': '#2A2A2A',            // Navigation background
            'nav-border': '#404040',        // Navigation border
            'nav-active': '#07C160',        // Active navigation item
          }
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
        'fadeOut': 'fadeOut 0.3s ease-out',
        'slideInRight': 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slideOutRight': 'slideOutRight 0.3s ease-in',
        'slideDownFade': 'slideDownFade 0.4s ease-out',
        'slideUpFade': 'slideUpFade 0.4s ease-out',
        'bounceIn': 'bounceIn 0.6s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'sidebarSlideIn': 'sidebarSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'sidebarSlideOut': 'sidebarSlideOut 0.3s cubic-bezier(0.55, 0, 0.68, 0.53)',
        'backdropFadeIn': 'backdropFadeIn 0.3s ease-out',
        'backdropFadeOut': 'backdropFadeOut 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(100%) scale(0.95)', opacity: '0' },
        },
        slideDownFade: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUpFade: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        sidebarSlideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        sidebarSlideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        backdropFadeIn: {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(4px)' },
        },
        backdropFadeOut: {
          '0%': { opacity: '1', backdropFilter: 'blur(4px)' },
          '100%': { opacity: '0', backdropFilter: 'blur(0px)' },
        },
      },
    }
  },
  plugins: []
};
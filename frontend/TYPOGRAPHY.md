# Responsive Typography System

This application uses a standardized, responsive typography system designed to work consistently across all devices and screen sizes.

## Key Features

- **Fluid Typography**: Uses `clamp()` functions to scale smoothly between minimum and maximum sizes
- **Relative Units**: All sizes use `rem` units for better accessibility and scaling
- **Modular Scale**: Font sizes follow a 1.25 ratio (major third) for visual harmony
- **Cross-Platform Fonts**: Optimized font stacks for consistent rendering across platforms

## Font Size Scale

| Class       | Min Size | Max Size | Use Case                            |
| ----------- | -------- | -------- | ----------------------------------- |
| `text-xs`   | 12px     | 14px     | Captions, metadata, small labels    |
| `text-sm`   | 14px     | 16px     | Secondary text, form labels         |
| `text-base` | 16px     | 18px     | Body text, paragraphs               |
| `text-lg`   | 18px     | 20px     | Lead paragraphs, emphasized content |
| `text-xl`   | 20px     | 24px     | Section headings                    |
| `text-2xl`  | 24px     | 32px     | Page section titles                 |
| `text-3xl`  | 30px     | 40px     | Page titles, hero headings          |
| `text-4xl`  | 36px     | 56px     | Major hero titles                   |
| `text-5xl`  | 48px     | 80px     | Large display text                  |
| `text-6xl`  | 60px     | 112px    | Maximum impact display              |

## Specialized Sizes

- `text-caption`: For image captions and small metadata
- `text-button`: Optimized for button text
- `text-input`: For form input text
- `text-label`: For form labels
- `text-overline`: For uppercase labels and tags

## Responsive Behavior

- **Mobile (< 640px)**: Fixed base font size (16px) to prevent zoom issues
- **Tablet/Desktop**: Fluid scaling based on viewport width
- **Large screens**: Capped maximum sizes to maintain readability

## Usage Guidelines

### Headings

```jsx
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-medium">Subsection Title</h3>
```

### Body Text

```jsx
<p className="text-base">Regular paragraph text</p>
<p className="text-sm text-secondary">Secondary information</p>
```

### Interactive Elements

```jsx
<button className="text-button">Click me</button>
<label className="text-label">Form label</label>
<input className="text-input" placeholder="Enter text" />
```

## Font Families

- **Sans-serif**: System font stack for optimal performance and native feel
- **Monospace**: Code-friendly font stack for technical content

## Accessibility

- All font sizes scale with user preferences (browser zoom, system font size)
- Minimum contrast ratios maintained across all sizes
- Line heights optimized for readability at each size
- Letter spacing adjusted for better legibility

## Customization

Font sizes can be customized in `tailwind.config.js` under the `fontSize` extension. The clamp functions ensure smooth scaling while maintaining minimum and maximum bounds for optimal readability.</content>
<parameter name="filePath">c:\Users\ggak7\Documents\CST\2025-2026\1st Semester\hakathon 2025-2026\ActivityPass\frontend\TYPOGRAPHY.md

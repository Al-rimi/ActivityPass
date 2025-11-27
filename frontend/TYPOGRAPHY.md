# Standardized Typography System

This application uses a standardized typography system designed for consistent appearance across desktop and mobile devices, similar to popular web applications like YouTube and WeChat.

## Key Features

- **Standard Font Sizes**: Fixed `rem` units for predictable sizing
- **Device-Specific Scaling**: 16px base on desktop, 14px on mobile
- **Relative Units**: All sizes use `rem` units for accessibility and scaling
- **Modular Scale**: Font sizes follow a 1.25 ratio (major third) for visual harmony
- **Cross-Platform Fonts**: Optimized font stacks for consistent rendering

## Font Size Scale

| Class       | Desktop | Mobile | Use Case                            |
| ----------- | ------- | ------ | ----------------------------------- |
| `text-xs`   | 12px    | 10.5px | Captions, metadata, small labels    |
| `text-sm`   | 14px    | 12.25px| Secondary text, form labels         |
| `text-base` | 16px    | 14px   | Body text, paragraphs               |
| `text-lg`   | 18px    | 15.75px| Lead paragraphs, emphasized content |
| `text-xl`   | 20px    | 17.5px | Section headings                    |
| `text-2xl`  | 24px    | 21px   | Page section titles                 |
| `text-3xl`  | 30px    | 26.25px| Page titles, hero headings          |
| `text-4xl`  | 36px    | 31.5px | Major hero titles                   |
| `text-5xl`  | 48px    | 42px   | Large display text                  |
| `text-6xl`  | 60px    | 52.5px | Maximum impact display              |

## Specialized Sizes

- `text-caption`: For image captions and small metadata (11px / 9.625px)
- `text-button`: Optimized for button text (14px / 12.25px)
- `text-input`: For form input text (14px / 12.25px)
- `text-label`: For form labels (13px / 11.375px)
- `text-overline`: For uppercase labels and tags (12px / 10.5px)

## Responsive Behavior

- **Desktop/Laptop**: 16px base font size for standard web experience
- **Mobile (≤640px)**: 14px base font size for better mobile readability
- **No viewport scaling**: Consistent sizes regardless of screen width

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

## Implementation

- **Base Font Size**: Set via CSS `html { font-size: 16px; }` with mobile override
- **Tailwind Config**: Fixed `rem` values instead of `clamp()` functions
- **CSS Custom Properties**: Available for programmatic access

## Customization

Font sizes can be customized in `tailwind.config.js` under the `fontSize` extension. All values are fixed `rem` units that scale with the base font size.</content>
<parameter name="filePath">c:\Users\ggak7\Documents\CST\2025-2026\1st Semester\hakathon 2025-2026\ActivityPass\frontend\TYPOGRAPHY.md

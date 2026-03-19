# 🎨 CropGear Design System - Quick Reference

## Color Palette

### Primary Colors
```css
--primary: #10b981 (Emerald Green) - Primary actions, success
--primary-700: #059669 (Dark Green) - Hover states
--primary-600: #047857 (Medium Green) - Active states
```

### Secondary Colors
```css
--secondary: #3b82f6 (Blue) - Alternative actions, info
--secondary-700: #1d4ed8 (Dark Blue) - Hover states
```

### Accent Colors
```css
--accent: #f59e0b (Amber) - Warnings, highlights
```

### Neutral Colors
```css
--bg: #f0f9f7 (Light Green) - Page background
--text: #1a202c (Dark Gray) - Primary text
--muted: #64748b (Medium Gray) - Secondary text
--border: #e2e8f0 (Light Gray) - Borders
--card: #ffffff (White) - Card backgrounds
```

---

## Button Quick Reference

### Basic Buttons
```jsx
// Primary action
<button className="button lg gradient pill">Get Started</button>

// Secondary action
<button className="button secondary lg">Learn More</button>

// Outline button
<button className="button outline pill">Cancel</button>

// Accent button
<button className="button accent lg">Important</button>

// Dark button
<button className="button dark-lg">Advanced</button>
```

### Button Sizes
```jsx
<button className="button sm">Small (8px × 16px)</button>
<button className="button">Medium (12px × 24px)</button>
<button className="button lg">Large (16px × 32px)</button>
```

### Button States
```jsx
<button className="button" disabled>Disabled</button>
<button className="button loading">Loading</button>
```

---

## Component Usage

### Card Component
```jsx
<div className="card">
  <h3>Title</h3>
  <p>Content here</p>
</div>
```

### Hero Section
```jsx
<section className="hero">
  <div className="hero-inner">
    <h1>Title</h1>
    <p>Subtitle</p>
  </div>
</section>
```

### Form Input
```jsx
<input
  type="text"
  placeholder="Enter text"
  style={{
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: 10
  }}
/>
```

### Grid Layout
```jsx
<div className="grid">
  {/* Items auto-fill, min 280px width */}
</div>
```

### Metrics/Stats
```jsx
<div className="metrics">
  {/* Items in responsive columns */}
</div>
```

---

## Typography

### Headers
```jsx
<h1>Display (42px, 900) - Hero titles</h1>
<h2 className="section-title">H2 (32px, 900) - Sections</h2>
<h3>H3 (24px, 900) - Subsections</h3>
```

### Text Styles
```jsx
<p>Body (16px, 400) - Regular text</p>
<p className="subtitle">Subtitle (gray text)</p>
<p className="help-text">Help text (small, muted)</p>
```

---

## Spacing Classes

```
Base unit: 4px

xs: 4px    (1 unit)
sm: 8px    (2 units)
md: 12px   (3 units)
lg: 16px   (4 units)
xl: 24px   (6 units)
2xl: 32px  (8 units)
3xl: 48px  (12 units)
4xl: 60px  (15 units)
```

---

## Class Reference

| Class | Purpose |
|-------|---------|
| `.button` | Base button styling |
| `.button.lg` | Large button |
| `.button.sm` | Small button |
| `.button.pill` | Rounded button |
| `.button.gradient` | Primary gradient |
| `.button.secondary` | Blue gradient |
| `.button.outline` | Transparent outline |
| `.button.accent` | Amber gradient |
| `.button.dark` | Dark gradient |
| `.card` | Card component |
| `.hero` | Hero section |
| `.hero-inner` | Hero content wrapper |
| `.metrics` | Stats grid |
| `.metric` | Single stat |
| `.grid` | Auto-fill grid |
| `.container` | Max-width wrapper |
| `.section` | Section wrapper |
| `.section-title` | Large gradient title |
| `.section-subtitle` | Muted subtitle |
| `.badge` | Status badge |
| `.status-success` | Green status |
| `.status-pending` | Yellow status |
| `.status-error` | Red status |
| `.status-info` | Blue status |
| `.nav` | Navigation bar |
| `.brand` | Logo/brand text |
| `.button.loading` | Loading state |
| `.spinner` | Loading spinner |
| `.fade-in-up` | Fade animation |
| `.slide-in-right` | Slide animation |
| `.bounce` | Bounce animation |

---

## Responsive Design

```css
/* Mobile: < 480px */
Default mobile-first layout

/* Tablet: 481px - 768px */
@media (min-width: 481px) { }

/* Desktop: > 768px */
@media (min-width: 769px) { }
```

---

## Gradients

### Primary Green
```css
linear-gradient(135deg, #10b981 0%, #059669 100%)
```

### Secondary Blue
```css
linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)
```

### Accent Amber
```css
linear-gradient(135deg, #f59e0b 0%, #d97706 100%)
```

### Dark
```css
linear-gradient(135deg, #1f2937 0%, #111827 100%)
```

---

## Shadows

```css
--shadow-sm: 0 4px 12px rgba(0,0,0,0.08);
--shadow-md: 0 8px 24px rgba(0,0,0,0.12);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.15);
```

---

## Common Patterns

### Call-to-Action Section
```jsx
<section style={{
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  padding: '80px 24px',
  textAlign: 'center',
  color: 'white'
}}>
  <div className="container">
    <h2>Ready to get started?</h2>
    <button className="button lg outline pill">Get Started</button>
  </div>
</section>
```

### Feature Grid
```jsx
<section className="section container">
  <h2 className="section-title">Features</h2>
  <p className="section-subtitle">Why choose us?</p>
  <div className="grid">
    {/* Feature cards */}
  </div>
</section>
```

### Form Layout
```jsx
<div style={{ maxWidth: 480, margin: '0 auto' }}>
  <input type="text" placeholder="Name" />
  <input type="email" placeholder="Email" />
  <button className="button lg gradient pill" style={{ width: '100%' }}>
    Submit
  </button>
</div>
```

### Hero with Buttons
```jsx
<section className="hero">
  <div className="hero-inner">
    <h1>Title</h1>
    <p>Subtitle</p>
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
      <button className="button lg gradient pill">Primary</button>
      <button className="button lg outline pill">Secondary</button>
    </div>
  </div>
</section>
```

---

## Animation Timing

```css
/* Standard transitions */
transition: all 0.3s ease;

/* Quick feedback */
transition: all 0.15s ease;

/* Material Design timing */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Animation durations */
Fade In Up: 0.6s ease-out
Slide In Right: 0.6s ease-out
Bounce: 2s infinite
Loading Spin: 1s linear infinite
```

---

## Common Issues & Solutions

### Button not showing properly?
- Make sure to include `.button` class
- Add a variant class (`.gradient`, `.secondary`, `.outline`, etc.)
- For size, add `.lg`, `.sm`, or leave as default

### Card not styling?
- Use `.card` class
- Add class to parent div, not the content
- Cards have default padding (24px) and border-radius (20px)

### Form focus state not working?
- Check border color is changing to `#10b981`
- Shadow should show `0 0 0 3px rgba(16,185,129,0.1)`
- Test in different browsers

### Responsive layout broken?
- Check media queries are in correct order
- Mobile-first approach (small screens first)
- Use percentage widths or grid for flexibility

---

## Performance Tips

1. **Use CSS Classes** - Instead of inline styles when possible
2. **Minimize Refactors** - Avoid changing DOM frequently
3. **Lazy Load Images** - Use `loading="lazy"` attribute
4. **Defer Non-Critical** - Load non-essential CSS later
5. **Compress Assets** - Minify CSS and JavaScript

---

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

---

## File Locations

```
src/
├── components/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Form.jsx
│   ├── EquipmentCard.jsx
│   ├── BookingCard.jsx
│   ├── Navbar.jsx
│   └── Footer.jsx
├── pages/
│   ├── Home.jsx
│   ├── StyleGuide.jsx (Visit /style-guide)
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   └── ...
├── index.css (Main stylesheet - 600+ lines)
└── ...

styles.css (Additional styling)
DESIGN_SYSTEM.md (Complete reference)
README_DESIGN.md (Implementation guide)
IMPLEMENTATION_SUMMARY.md (Overview)
QUICK_REFERENCE.md (This file)
```

---

## Testing Checklist

- [ ] Buttons display correctly in all browsers
- [ ] Hover effects work smoothly
- [ ] Forms focus states visible
- [ ] Responsive layout works on mobile
- [ ] Colors accessible (contrast ratios)
- [ ] Animations smooth and not distracting
- [ ] All links working properly
- [ ] Images loading correctly
- [ ] No console errors
- [ ] Print styles looking good

---

## Useful Links

- **Style Guide Page**: `/style-guide` - Interactive component showcase
- **Design System Docs**: `DESIGN_SYSTEM.md` - Complete reference
- **Implementation Guide**: `README_DESIGN.md` - How to use components
- **Summary**: `IMPLEMENTATION_SUMMARY.md` - Overview of changes

---

**Last Updated**: February 23, 2026
**Version**: 1.0
**Status**: Complete ✅

# CropGear - Modern Design System

## Overview
This document outlines the design system and styling guidelines for the CropGear website.

---

## Color Palette

### Primary Colors
- **Green (#10b981)** - Primary action, success states
- **Green Dark (#059669)** - Hover states, emphasis
- **Green Light (#047857)** - Pressed states

### Secondary Colors
- **Blue (#3b82f6)** - Secondary actions, info
- **Blue Dark (#1d4ed8)** - Hover states

### Accent Colors
- **Amber (#f59e0b)** - Warnings, highlights
- **Amber Dark (#d97706)** - Hover states

### Neutral Colors
- **Background (#f0f9f7)** - Light background
- **Text (#1a202c)** - Primary text
- **Muted (#64748b)** - Secondary text
- **Border (#e2e8f0)** - Border lines

---

## Typography

### Font Family
`'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

### Font Sizes & Weights
- **Display (42px, 900)** - Hero titles
- **H1 (42px, 900)** - Main page titles
- **H2 (32px, 900)** - Section titles
- **H3 (24px, 900)** - Subsection titles
- **Body (16px, 400)** - Regular text
- **Small (14px, 600)** - Labels, hints

---

## Components

### Buttons

#### Variants
1. **Primary (Gradient)** - Main actions
   - Background: Gradient from #10b981 → #059669
   - Text: White
   - Shadow: 0 4px 15px rgba(16,185,129,0.3)

2. **Secondary** - Alternative actions
   - Background: Gradient from #3b82f6 → #1d4ed8
   - Text: White
   - Shadow: 0 4px 15px rgba(59,130,246,0.3)

3. **Outline** - Tertiary actions
   - Background: Transparent
   - Border: 2px solid primary color
   - Text: Primary color

4. **Accent** - Special emphasis
   - Background: Gradient from #f59e0b → #d97706
   - Text: White
   - Shadow: 0 4px 15px rgba(245,158,11,0.3)

5. **Dark** - Subtle actions
   - Background: Gradient from #1f2937 → #111827
   - Text: White

#### Sizes
- **LG (16px × 32px)** - Large buttons for important actions
- **MD (12px × 24px)** - Standard buttons
- **SM (8px × 16px)** - Small buttons for secondary actions

#### Shapes
- **Rounded (12px)** - Default button corners
- **Pill (50px)** - Fully rounded buttons

#### States
- **Hover** - Elevated shadow, slight color darkening
- **Active** - Reduced elevation
- **Disabled** - 50% opacity, no hover effect
- **Loading** - 70% opacity, disabled cursor

---

### Cards

**Styling:**
- Border: 1px solid rgba(16,185,129,0.1)
- Background: White with subtle gradient overlay
- Border-radius: 20px
- Padding: 24px
- Box-shadow: 0 4px 12px rgba(0,0,0,0.08)

**Hover State:**
- Transform: translateY(-4px)
- Box-shadow: 0 12px 32px rgba(0,0,0,0.15)
- Border-color: rgba(16,185,129,0.3)

---

### Form Inputs

**Default State:**
- Border: 2px solid #e2e8f0
- Border-radius: 10px
- Padding: 12px 16px
- Font-size: 14px

**Focus State:**
- Border-color: #10b981
- Box-shadow: 0 0 0 3px rgba(16,185,129,0.1)

**Error State:**
- Border-color: #ef4444
- Box-shadow: 0 0 0 3px rgba(239,68,68,0.1)

---

## Spacing Scale

- `xs: 4px`
- `sm: 8px`
- `md: 12px`
- `lg: 16px`
- `xl: 24px`
- `2xl: 32px`
- `3xl: 48px`
- `4xl: 60px`

---

## Shadows

- **sm:** 0 4px 12px rgba(0,0,0,0.08)
- **md:** 0 8px 24px rgba(0,0,0,0.12)
- **lg:** 0 12px 32px rgba(0,0,0,0.15)

---

## Animations

### Fade In Up
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
Duration: 0.6s
Easing: ease-out

### Slide In Right
```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```
Duration: 0.6s
Easing: ease-out

### Bounce
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```
Duration: 2s
Iteration: infinite

---

## Responsive Design

### Breakpoints
- **Mobile:** < 480px
- **Tablet:** 481px - 768px
- **Desktop:** > 768px

### Mobile Optimizations
- Hero titles: 32px (from 42px)
- Button sizes remain consistent
- Grid collapses to single column
- Padding reduced on smaller screens

---

## Best Practices

1. **Consistency** - Use the defined color palette and typography
2. **Accessibility** - Maintain sufficient contrast ratios
3. **Spacing** - Follow the spacing scale for consistent layouts
4. **Animation** - Use animations to enhance, not distract
5. **Mobile First** - Design for mobile, enhance for desktop
6. **Semantic HTML** - Use appropriate HTML elements
7. **Performance** - Optimize images and minimize CSS

---

## Usage Examples

### Primary Button
```jsx
<button className="button lg gradient pill">
  🚀 Get Started
</button>
```

### Card with Hover Effect
```jsx
<div className="card">
  <h3>Title</h3>
  <p>Description</p>
</div>
```

### Form Input with Focus
```jsx
<input 
  type="text" 
  placeholder="Enter text" 
  style={{ border: '2px solid #e2e8f0' }}
/>
```

---

## File Structure

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
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   └── ...
├── index.css (Main stylesheet)
└── ...
```

---

## Last Updated
February 23, 2026

---
name: Academic Excellence Portal
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#465f88'
  primary: '#002046'
  on-primary: '#ffffff'
  primary-container: '#1b365d'
  on-primary-container: '#87a0cd'
  inverse-primary: '#aec7f7'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#1d2123'
  on-tertiary: '#ffffff'
  tertiary-container: '#333638'
  on-tertiary-container: '#9c9fa1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aec7f7'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2e476f'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for a high-stakes educational environment, prioritizing clarity, authority, and professional reliability. The target audience includes prospective students, parents, and university administrators who require a seamless, error-free path from application to enrollment.

The aesthetic follows a **Corporate / Modern** style with a focus on structured information density and "Institutional Precision." It utilizes ample white space to reduce cognitive load during complex form-filling processes, while maintaining a prestigious feel through refined typography and a controlled color palette. The UI should evoke an emotional response of confidence, stability, and aspiration.

## Colors

The palette is anchored by **Trustworthy Navy**, used for primary actions, navigation, and structural headings to establish authority. **Academic Gold** serves as a sophisticated accent color, reserved for high-value highlights, call-to-action details, and achievement markers. 

Backgrounds utilize a "Clean Slate" approach with off-whites and light grays to ensure high legibility and a contemporary feel. Functional colors for statuses (Pending, Approved, Rejected) are tuned for high accessibility while remaining distinct from the core brand colors.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic weight distribution. 

- **Headlines:** Use Bold and Semi-Bold weights in Trustworthy Navy to create a clear hierarchy. 
- **Body Text:** Use Regular weight in a dark gray (Slate 800) for long-form content to ensure comfort during extended reading sessions.
- **Labels:** Use Medium or Semi-Bold weights. Tracking (letter-spacing) is slightly increased for all-caps labels to improve scanning.
- **Scale:** On mobile devices, headline sizes shift down to prevent excessive line-breaking, while body sizes remain constant to preserve accessibility.

## Layout & Spacing

The layout follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **Rhythm:** An 8px linear scale governs all padding and margin decisions. 
- **Forms:** Input fields and form sections use a "vertical stack" model with 24px spacing between field groups and 8px between labels and inputs.
- **Tables:** Data tables should occupy the full width of their containers, using horizontal scrolling on mobile to maintain data integrity.
- **Alignment:** Content is centered in a max-width container on wide screens to prevent eye strain, while dashboards may use a full-width "sidebar + stage" layout for administrative efficiency.

## Elevation & Depth

To maintain a professional and "grounded" feel, the design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface 0:** Main application background (#F8FAFC).
- **Surface 1:** Primary cards and containers (White) with a subtle 1px border (#E2E8F0).
- **Surface 2:** Active states or hovered elements, using a very soft, diffused shadow (0px 4px 12px rgba(27, 54, 93, 0.05)).
- **Depth Hierarchy:** Modals and dropdowns use a more pronounced shadow to separate them from the application plane, but always maintain a crisp border to match the institutional aesthetic.

## Shapes

The design system employs **Soft** (4px/0.25rem) corner radii. This subtly rounds off the harshness of a purely "sharp" system while maintaining a structured, formal appearance suitable for a university setting.

- **Standard Elements:** Buttons, inputs, and checkboxes use the base 4px radius.
- **Large Containers:** Cards and modals use a slightly larger 8px (rounded-lg) radius to feel more approachable.
- **Status Badges:** Use a fully rounded (pill) shape to clearly distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Trustworthy Navy background, white text. No gradient. 
- **Secondary:** White background, Trustworthy Navy border (1px) and text.
- **Tertiary/Ghost:** No background or border, Navy text. Used for "Cancel" or "Go Back."

### Status Badges
Badges use a "Tinted Background" style:
- **Approved:** Emerald green text on a light emerald background.
- **Pending:** Amber text on a light amber background.
- **Rejected:** Rose red text on a light rose background.

### Data Tables
- **Header:** Light gray background (#F1F5F9) with Semi-Bold Navy text.
- **Rows:** White background with subtle bottom borders. Zebra striping is not used; instead, use high-contrast hover states.
- **Alignment:** Text data is left-aligned; numerical/date data is right-aligned.

### Forms & Inputs
- **Inputs:** 1px border (#CBD5E1) that shifts to Trustworthy Navy (2px) on focus.
- **Error State:** Border shifts to Red with a small error message below the field.
- **Selects:** Custom chevron icon in Navy.

### Progress Indicator
A horizontal "Stepper" component for applications, using Academic Gold for the active step and Trustworthy Navy for completed steps.
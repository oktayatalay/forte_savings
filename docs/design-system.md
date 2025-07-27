# Forte Savings Design System

## Overview

This document outlines the design system for Forte Savings application, providing guidelines for consistent UI/UX implementation across all pages and components.

## Design Principles

### 1. User Experience First
- Prioritize user experience over visual complexity
- Ensure fast load times and smooth interactions
- Provide clear feedback for all user actions
- Maintain accessibility standards (WCAG 2.1 AA)

### 2. Professional & Modern
- Clean, professional appearance suitable for enterprise use
- Modern visual language with subtle animations
- Consistent spacing and typography hierarchy
- Theme-aware design (light/dark mode support)

### 3. Performance Focused
- Optimize for Core Web Vitals
- Use progressive enhancement
- Implement efficient loading states
- Maintain smooth 60fps animations

## Color System

### Primary Colors
- **Primary**: `hsl(221.2 83.2% 53.3%)` - Main brand color
- **Primary Foreground**: `hsl(210 40% 98%)` - Text on primary background
- **Primary/80**: `hsl(221.2 83.2% 53.3% / 0.8)` - Slightly transparent primary
- **Primary/20**: `hsl(221.2 83.2% 53.3% / 0.2)` - Very light primary overlay

### Semantic Colors
- **Green (Success/Savings)**: `#22c55e` - For positive values, savings
- **Blue (Information/Cost Avoidance)**: `#3b82f6` - For informational content, cost avoidance
- **Red (Error/Danger)**: `#ef4444` - For errors, destructive actions
- **Orange (Warning)**: `#f59e0b` - For warnings, admin actions
- **Emerald**: `#10b981` - For financial success indicators

### Background & Surface Colors
- **Background**: Light/dark theme aware base background
- **Card**: Elevated surface color with slight transparency
- **Muted**: Subtle background for secondary areas
- **Border**: Subtle borders with transparency

## Typography

### Hierarchy
1. **Page Titles**: `text-3xl font-bold` (30px) - Main page headings
2. **Section Titles**: `text-xl font-semibold` (20px) - Section headings
3. **Card Titles**: `text-lg font-medium` (18px) - Card headings
4. **Body Text**: `text-base` (16px) - Regular content
5. **Small Text**: `text-sm` (14px) - Secondary information
6. **Captions**: `text-xs` (12px) - Labels and captions

### Special Text Effects
- **Gradient Text**: Use `bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent` for emphasis
- **Muted Text**: Use `text-muted-foreground` for secondary information

## Layout & Spacing

### Container System
- **Main Container**: `container mx-auto px-4 py-8`
- **Page Spacing**: `space-y-8` between major sections
- **Card Spacing**: `space-y-6` between cards
- **Form Spacing**: `space-y-4` between form elements

### Grid System
- **Dashboard Stats**: 4-column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`)
- **Currency Cards**: 3-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- **Project Details**: 2-column grid (`grid-cols-1 lg:grid-cols-2`)

## Component Guidelines

### Cards

#### Standard Card
```tsx
<Card className="transition-all duration-300 hover:shadow-medium">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      Title
    </CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Enhanced Card with Gradient Header
```tsx
<Card className="transition-all duration-300 hover:shadow-medium">
  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
    <CardTitle className="flex items-center gap-2 text-primary">
      <Icon className="w-5 h-5" />
      Title
    </CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Buttons

#### Primary Button
```tsx
<Button className="shadow-sm hover:shadow-md transition-all duration-200">
  Primary Action
</Button>
```

#### Outline Button with Hover Effects
```tsx
<Button 
  variant="outline" 
  className="shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
>
  Secondary Action
</Button>
```

### Tables

#### Enhanced Table Container
```tsx
<div className="rounded-lg border border-border/50 overflow-hidden">
  <Table>
    <TableHeader className="bg-muted/30">
      <TableRow className="hover:bg-muted/50 transition-colors">
        <TableHead className="cursor-pointer group font-semibold">
          <div className="flex items-center gap-2 hover:text-primary transition-colors">
            Header Text
            <SortIcon />
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item, index) => (
        <TableRow 
          key={item.id}
          className={cn(
            "hover:bg-muted/30 transition-all duration-200",
            index % 2 === 0 && "bg-muted/10"
          )}
        >
          {/* Row content */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Forms

#### Enhanced Input
```tsx
<Input
  className={cn(
    "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
    "bg-background/50 border-border/60 focus:border-primary/50",
    disabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

## Animation Guidelines

### Transitions
- **Standard Duration**: `duration-200` (200ms) for most interactions
- **Slow Duration**: `duration-300` (300ms) for complex transitions
- **Card Hover**: `transition-all duration-300 hover:shadow-medium`
- **Button Hover**: `transition-all duration-200 hover:scale-105`

### Loading States
- **Spinner**: Use `animate-spin` for loading indicators
- **Skeleton**: Use `animate-shimmer` for content loading
- **Fade In**: Use `animate-fade-in-up` for page entrance

### Micro-animations
- **Hover Scale**: `hover:scale-105` for interactive elements
- **Pulse**: `animate-pulse` for emphasis
- **Gentle Bounce**: `animate-bounce-gentle` for success indicators

## Shadow System

### Shadow Levels
- **Soft**: `shadow-soft` - Subtle elevation
- **Medium**: `shadow-medium` - Standard hover state
- **Strong**: `shadow-strong` - High elevation
- **Glow**: `shadow-glow` - Primary color glow effect

### Usage
- Use `shadow-sm` for resting state
- Use `hover:shadow-md` for hover states
- Use `shadow-glow` for highlighted/primary elements

## Theme Support

### Dark Mode Implementation
All components must support both light and dark themes:

```tsx
// Use theme-aware colors
const textColor = cn(
  "dark:text-gray-200 text-gray-700"
);

// Background gradients
<div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
```

### Chart.js Theme Integration
```tsx
const { resolvedTheme } = useTheme();
const [chartKey, setChartKey] = useState(0);

useEffect(() => {
  setChartKey(prev => prev + 1);
}, [resolvedTheme]);

const getTextColor = () => {
  const isDark = resolvedTheme === 'dark';
  return isDark ? '#e5e7eb' : '#374151';
};
```

## Currency Display

### Currency Cards
Use the `CurrencyCards` component for displaying financial data:

```tsx
<CurrencyCards 
  data={currencyData}
  compact={false} // or true for smaller displays
  showChange={true} // for trend indicators
/>
```

### Currency Mini Cards
For compact displays use `CurrencyMiniCards`:

```tsx
<CurrencyMiniCards 
  data={currencyData}
  className="flex-wrap"
/>
```

## Error Handling & Empty States

### Error Display
```tsx
<Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-shake">
  <AlertDescription>{error}</AlertDescription>
</Alert>
```

### Empty States
```tsx
<div className="text-center py-12">
  <Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
  <h3 className="text-lg font-medium mb-2">No Data Found</h3>
  <p className="text-muted-foreground mb-4">Description of empty state</p>
  <Button>Call to Action</Button>
</div>
```

## Accessibility Guidelines

### Focus Management
- Use `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`
- Ensure keyboard navigation works for all interactive elements
- Provide clear focus indicators

### Color Contrast
- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text
- Test in both light and dark modes

### Semantic HTML
- Use appropriate HTML elements (`button`, `nav`, `main`, etc.)
- Provide meaningful `aria-label` attributes
- Use heading hierarchy correctly

## Performance Best Practices

### Loading Strategies
- Show skeleton loaders for content
- Use progressive enhancement
- Implement smooth loading transitions

### Bundle Optimization
- Lazy load components when possible
- Optimize images and assets
- Use efficient re-rendering strategies

### Animation Performance
- Use `transform` and `opacity` for animations
- Avoid animating layout properties
- Use `will-change` sparingly

## Implementation Examples

### Page Header Template
```tsx
<Card className="transition-all duration-300 hover:shadow-medium border-none bg-gradient-to-r from-primary/5 via-background to-primary/5">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button 
          onClick={() => router.back()}
          variant="outline" 
          size="sm"
          className="shadow-sm hover:shadow-md transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Page Title
          </h1>
          <p className="text-muted-foreground">Page description</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {/* Action buttons */}
      </div>
    </div>
  </CardContent>
</Card>
```

### Stats Grid Template
```tsx
<StatsGrid columns={4} className="mb-8">
  <EnhancedStatsCard
    title="Metric Title"
    value={value}
    icon={Icon}
    iconColor="text-blue-600"
    description="Description"
    variant="gradient" // or "modern", "minimal"
    interactive={true}
    change={{
      value: 12,
      type: 'increase',
      period: 'this month'
    }}
  />
</StatsGrid>
```

## Future Considerations

### Scalability
- Maintain consistent naming conventions
- Keep components reusable and composable
- Document any custom implementations

### Maintenance
- Regular review of design tokens
- Update guidelines as the system evolves
- Ensure backward compatibility when possible

### Testing
- Visual regression testing for UI changes
- Accessibility testing for new components
- Performance testing for animations

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0

This design system ensures consistent, accessible, and performant UI across the Forte Savings application.
import { RenderResult } from '@testing-library/react';

// Conditionally import and extend Jest matchers only in test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  const { axe, toHaveNoViolations } = require('jest-axe');
  expect.extend(toHaveNoViolations);
}

// Accessibility testing configuration
export const accessibilityConfig = {
  rules: {
    // Enable specific accessibility rules
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'semantic-markup': { enabled: true },
    
    // Disable rules that may conflict with our design system
    'color-contrast-enhanced': { enabled: false }, // We follow WCAG AA, not AAA
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  locale: 'tr-TR', // Turkish locale for Turkish content
};

// Custom accessibility testing function
export const testAccessibility = async (
  container: HTMLElement,
  options?: any
): Promise<void> => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    const { axe } = require('jest-axe');
    const results = await axe(container, {
      ...accessibilityConfig,
      ...options,
    });
    
    expect(results).toHaveNoViolations();
  }
};

// Test keyboard navigation
export const testKeyboardNavigation = (
  container: HTMLElement,
  testDescription?: string
) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    throw new Error(
      `${testDescription || 'Component'} has no focusable elements for keyboard navigation`
    );
  }

  // Test that all focusable elements can receive focus
  focusableElements.forEach((element, index) => {
    if (element instanceof HTMLElement) {
      element.focus();
      expect(document.activeElement).toBe(element);
    }
  });
};

// Test ARIA attributes
export const testAriaAttributes = (container: HTMLElement) => {
  const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
  
  elementsWithAria.forEach((element) => {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    const ariaDescribedby = element.getAttribute('aria-describedby');

    // Check if aria-label is not empty
    if (ariaLabel !== null) {
      expect(ariaLabel.trim()).not.toBe('');
    }

    // Check if referenced elements exist for aria-labelledby
    if (ariaLabelledby) {
      const referencedElements = ariaLabelledby.split(' ').map(id => 
        container.querySelector(`#${id}`)
      );
      referencedElements.forEach(refElement => {
        expect(refElement).toBeTruthy(); // Changed from toBeInTheDocument for build compatibility
      });
    }

    // Check if referenced elements exist for aria-describedby
    if (ariaDescribedby) {
      const referencedElements = ariaDescribedby.split(' ').map(id => 
        container.querySelector(`#${id}`)
      );
      referencedElements.forEach(refElement => {
        expect(refElement).toBeTruthy(); // Changed from toBeInTheDocument for build compatibility
      });
    }
  });
};

// Test form accessibility
export const testFormAccessibility = (container: HTMLElement) => {
  const formElements = container.querySelectorAll('input, select, textarea');
  
  formElements.forEach((element) => {
    const label = element.getAttribute('aria-label') || 
                 element.getAttribute('aria-labelledby') ||
                 container.querySelector(`label[for="${element.id}"]`);
    
    expect(label).toBeTruthy();
    
    // Check if required fields have proper indication
    if (element.hasAttribute('required') || element.getAttribute('aria-required') === 'true') {
      expect(element.getAttribute('aria-required')).toBe('true');
    }
  });
};

// Test table accessibility
export const testTableAccessibility = (container: HTMLElement) => {
  const tables = container.querySelectorAll('table');
  
  tables.forEach((table) => {
    // Check for table headers
    const headers = table.querySelectorAll('th');
    expect(headers.length).toBeGreaterThan(0);

    // Check for proper table structure
    const tbody = table.querySelector('tbody');
    const thead = table.querySelector('thead');
    
    if (thead) {
      expect(thead.querySelectorAll('th').length).toBeGreaterThan(0);
    }
    
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      if (rows.length > 0) {
        expect(rows[0].querySelectorAll('td, th').length).toBeGreaterThan(0);
      }
    }

    // Check for table caption or aria-label
    const caption = table.querySelector('caption');
    const ariaLabel = table.getAttribute('aria-label');
    const ariaLabelledby = table.getAttribute('aria-labelledby');
    
    expect(caption || ariaLabel || ariaLabelledby).toBeTruthy();
  });
};

// Test heading hierarchy
export const testHeadingHierarchy = (container: HTMLElement) => {
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(heading => parseInt(heading.tagName.charAt(1)))
    .sort((a, b) => a - b);

  if (headings.length === 0) return;

  // Check that headings start from an appropriate level and don't skip levels
  for (let i = 1; i < headings.length; i++) {
    const currentLevel = headings[i];
    const previousLevel = headings[i - 1];
    
    // Allow same level or one level deeper
    expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
  }
};

// Test button accessibility
export const testButtonAccessibility = (container: HTMLElement) => {
  const buttons = container.querySelectorAll('button, [role="button"]');
  
  buttons.forEach((button) => {
    // Check if button has accessible name
    const accessibleName = button.textContent?.trim() ||
                          button.getAttribute('aria-label') ||
                          button.getAttribute('aria-labelledby');
    
    expect(accessibleName).toBeTruthy();
    
    // Check if disabled buttons have proper ARIA state
    if (button.hasAttribute('disabled')) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
    }
  });
};

// Test landmark regions
export const testLandmarkRegions = (container: HTMLElement) => {
  const landmarks = container.querySelectorAll(
    'main, nav, aside, header, footer, section[aria-label], section[aria-labelledby], [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]'
  );

  // At least one main landmark should exist in a page
  const mainLandmarks = container.querySelectorAll('main, [role="main"]');
  expect(mainLandmarks.length).toBeGreaterThanOrEqual(1);
};

// Test color contrast (basic check)
export const testColorContrast = (container: HTMLElement) => {
  const elementsWithBackground = container.querySelectorAll('[style*="background"], [style*="color"]');
  
  elementsWithBackground.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;
    
    // Basic check that colors are not the same
    if (backgroundColor && color && backgroundColor !== 'transparent') {
      expect(backgroundColor).not.toBe(color);
    }
  });
};

// Test focus indicators
export const testFocusIndicators = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  focusableElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      element.focus();
      
      const styles = window.getComputedStyle(element);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;
      
      // Check that focused elements have some kind of focus indicator
      expect(outline !== 'none' || boxShadow !== 'none').toBe(true);
    }
  });
};

// Comprehensive accessibility test suite
export const runAccessibilityTestSuite = async (
  renderResult: RenderResult,
  options: {
    skipAxe?: boolean;
    skipKeyboard?: boolean;
    skipAria?: boolean;
    skipForms?: boolean;
    skipTables?: boolean;
    skipHeadings?: boolean;
    skipButtons?: boolean;
    skipLandmarks?: boolean;
    skipColorContrast?: boolean;
    skipFocusIndicators?: boolean;
    testDescription?: string;
  } = {}
) => {
  const { container } = renderResult;

  // Run axe accessibility tests
  if (!options.skipAxe) {
    await testAccessibility(container);
  }

  // Test keyboard navigation
  if (!options.skipKeyboard) {
    testKeyboardNavigation(container, options.testDescription);
  }

  // Test ARIA attributes
  if (!options.skipAria) {
    testAriaAttributes(container);
  }

  // Test form accessibility
  if (!options.skipForms) {
    testFormAccessibility(container);
  }

  // Test table accessibility
  if (!options.skipTables) {
    testTableAccessibility(container);
  }

  // Test heading hierarchy
  if (!options.skipHeadings) {
    testHeadingHierarchy(container);
  }

  // Test button accessibility
  if (!options.skipButtons) {
    testButtonAccessibility(container);
  }

  // Test landmark regions
  if (!options.skipLandmarks) {
    testLandmarkRegions(container);
  }

  // Test color contrast
  if (!options.skipColorContrast) {
    testColorContrast(container);
  }

  // Test focus indicators
  if (!options.skipFocusIndicators) {
    testFocusIndicators(container);
  }
};

// Higher-order test function for components
export const createAccessibilityTest = (
  componentName: string,
  renderComponent: () => RenderResult,
  options?: Parameters<typeof runAccessibilityTestSuite>[1]
) => {
  return async () => {
    const renderResult = renderComponent();
    await runAccessibilityTestSuite(renderResult, {
      ...options,
      testDescription: componentName,
    });
  };
};

// Utility to check screen reader compatibility
export const testScreenReaderContent = (container: HTMLElement) => {
  // Check for screen reader only content
  const srOnlyElements = container.querySelectorAll('.sr-only, .screen-reader-text');
  
  srOnlyElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    
    // Verify that sr-only content is visually hidden but accessible
    expect(
      styles.position === 'absolute' &&
      (styles.width === '1px' || styles.clip === 'rect(0, 0, 0, 0)')
    ).toBe(true);
  });
};

export default {
  testAccessibility,
  testKeyboardNavigation,
  testAriaAttributes,
  testFormAccessibility,
  testTableAccessibility,
  testHeadingHierarchy,
  testButtonAccessibility,
  testLandmarkRegions,
  testColorContrast,
  testFocusIndicators,
  runAccessibilityTestSuite,
  createAccessibilityTest,
  testScreenReaderContent,
};
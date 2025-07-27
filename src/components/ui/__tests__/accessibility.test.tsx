import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/lib/test-utils';
import { runAccessibilityTestSuite, createAccessibilityTest } from '../../../__tests__/utils/accessibility-utils';

// Import UI components
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { Alert, AlertDescription } from '../alert';
import { Badge } from '../badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Switch } from '../switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';

describe('UI Components Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Button',
      () => render(
        <div>
          <Button>Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button size="sm">Small Button</Button>
        </div>
      )
    ));

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      
      render(<Button onClick={onClick}>Test Button</Button>);
      
      const button = screen.getByRole('button');
      
      // Focus with tab
      await user.tab();
      expect(button).toHaveFocus();
      
      // Activate with Enter
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
      
      // Activate with Space
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('should handle disabled state properly', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Input Component', () => {
    it('should meet accessibility standards with label', createAccessibilityTest(
      'Input with Label',
      () => render(
        <div>
          <Label htmlFor="test-input">Test Input</Label>
          <Input id="test-input" placeholder="Enter text" />
        </div>
      )
    ));

    it('should support ARIA attributes', () => {
      render(
        <div>
          <Input 
            aria-label="Search field"
            aria-describedby="search-help"
            required
          />
          <div id="search-help">Enter keywords to search</div>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Search field');
      expect(input).toHaveAttribute('aria-describedby', 'search-help');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should handle error states accessibly', () => {
      render(
        <div>
          <Label htmlFor="error-input">Email</Label>
          <Input 
            id="error-input"
            aria-invalid="true"
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert">
            Please enter a valid email address
          </div>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Card Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Card',
      () => render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      )
    ));

    it('should have proper heading hierarchy', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Main Title</CardTitle>
          </CardHeader>
        </Card>
      );
      
      // CardTitle should render as h3 by default
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('Table Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Table',
      () => render(
        <Table aria-label="Test data table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    ));

    it('should have proper table structure', () => {
      render(
        <Table aria-label="Test table">
          <TableHeader>
            <TableRow>
              <TableHead>Column 1</TableHead>
              <TableHead>Column 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
              <TableCell>Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Test table');
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(2);
      
      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(2);
    });
  });

  describe('Alert Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Alert',
      () => render(
        <div>
          <Alert>
            <AlertDescription>Default alert message</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertDescription>Error alert message</AlertDescription>
          </Alert>
        </div>
      )
    ));

    it('should have proper ARIA roles', () => {
      render(
        <Alert>
          <AlertDescription>Alert message</AlertDescription>
        </Alert>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Dialog Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Dialog',
      () => render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </DialogHeader>
            <p>Dialog content goes here</p>
          </DialogContent>
        </Dialog>
      ),
      { skipLandmarks: true } // Dialog may not have main landmarks
    ));

    it('should handle focus management', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <Button>Close</Button>
          </DialogContent>
        </Dialog>
      );
      
      const triggerButton = screen.getByText('Open Dialog');
      await user.click(triggerButton);
      
      // Focus should be trapped within dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <Button>First Button</Button>
            <Button>Second Button</Button>
          </DialogContent>
        </Dialog>
      );
      
      // Escape should close dialog
      await user.keyboard('{Escape}');
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('DropdownMenu Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'DropdownMenu',
      () => render(
        <DropdownMenu open={true}>
          <DropdownMenuTrigger asChild>
            <Button>Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      { skipLandmarks: true }
    ));

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Option 1</DropdownMenuItem>
            <DropdownMenuItem>Option 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      // Arrow keys should navigate menu items
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('Option 1')).toHaveFocus();
    });
  });

  describe('Select Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Select',
      () => render(
        <div>
          <Label htmlFor="test-select">Choose option</Label>
          <Select>
            <SelectTrigger id="test-select">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3" disabled>Disabled Option</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
      { skipLandmarks: true }
    ));

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b">Option B</SelectItem>
          </SelectContent>
        </Select>
      );
      
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      
      // Should open listbox
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Arrow keys should navigate options
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('Option A')).toHaveAttribute('data-highlighted');
    });
  });

  describe('Switch Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Switch',
      () => render(
        <div>
          <Label htmlFor="test-switch">Enable notifications</Label>
          <Switch id="test-switch" />
        </div>
      )
    ));

    it('should have proper ARIA attributes', () => {
      render(
        <Switch 
          id="test-switch"
          aria-label="Toggle feature"
          checked={true}
        />
      );
      
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
      expect(switchElement).toHaveAttribute('aria-label', 'Toggle feature');
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(<Switch onCheckedChange={onChange} />);
      
      const switchElement = screen.getByRole('switch');
      
      // Focus and activate with Space
      switchElement.focus();
      await user.keyboard(' ');
      
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Tooltip Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Tooltip',
      () => render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              Tooltip content
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      { skipLandmarks: true }
    ));

    it('should have proper ARIA relationship', async () => {
      const user = userEvent.setup();
      
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Tooltip trigger</Button>
            </TooltipTrigger>
            <TooltipContent>
              Helpful information
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
      const trigger = screen.getByRole('button');
      await user.hover(trigger);
      
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      
      // Trigger should have aria-describedby pointing to tooltip
      expect(trigger).toHaveAttribute('aria-describedby');
    });
  });

  describe('Badge Component', () => {
    it('should meet accessibility standards', createAccessibilityTest(
      'Badge',
      () => render(
        <div>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      )
    ));

    it('should be readable by screen readers', () => {
      render(<Badge aria-label="Status: Active">Active</Badge>);
      
      const badge = screen.getByLabelText('Status: Active');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Form Combinations', () => {
    it('should handle complex forms accessibly', createAccessibilityTest(
      'Complex Form',
      () => render(
        <form>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" required aria-describedby="name-help" />
            <div id="name-help">Enter your full name</div>
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              aria-invalid="true"
              aria-describedby="email-error"
            />
            <div id="email-error" role="alert">
              Please enter a valid email
            </div>
          </div>
          
          <div>
            <Label htmlFor="country">Country</Label>
            <Select>
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="tr">Turkey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Switch id="newsletter" />
            <Label htmlFor="newsletter">Subscribe to newsletter</Label>
          </div>
          
          <Button type="submit">Submit Form</Button>
        </form>
      )
    ));
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', () => {
      const { container } = render(
        <div>
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Alert>
            <AlertDescription>Alert message</AlertDescription>
          </Alert>
          <Badge>Badge text</Badge>
        </div>
      );

      // This test would ideally use a color contrast checking library
      // For now, we'll check that elements have proper styling
      const button = screen.getByText('Primary Button');
      const styles = window.getComputedStyle(button);
      
      expect(styles.backgroundColor).not.toBe(styles.color);
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in interactive components', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <Button>First</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog</DialogTitle>
              <Input placeholder="Focus here" />
              <Button>Close</Button>
            </DialogContent>
          </Dialog>
          <Button>Last</Button>
        </div>
      );
      
      // Tab through elements
      await user.tab();
      expect(screen.getByText('First')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Open Dialog')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Last')).toHaveFocus();
    });
  });
});
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '../../components/ui/Input';

describe('Input', () => {
  it('renders a label when provided', () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message with role alert', () => {
    render(<Input id="email" label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Input id="email" label="Email" error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show error when no error prop', () => {
    render(<Input id="email" label="Email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an input element', () => {
    render(<Input id="name" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('defaults to type text', () => {
    render(<Input id="name" label="Name" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text');
  });

  it('renders hint text when no error', () => {
    render(<Input id="name" label="Name" hint="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(<Input id="name" label="Name" hint="Enter your full name" error="Required" />);
    expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
  });

  it('shows required asterisk when required prop is set', () => {
    render(<Input id="email" label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required asterisk without required prop', () => {
    render(<Input id="email" label="Email" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('accepts error as an object with message property', () => {
    render(<Input id="email" label="Email" error={{ message: 'Field required' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Field required');
  });

  it('passes through additional props to the input element', () => {
    render(<Input id="search" label="Search" placeholder="Type here..." />);
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineIndicator from '../../components/ui/OfflineIndicator';

describe('OfflineIndicator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders offline banner when offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('shows banner when offline event fires', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('hides banner when online event fires after going offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows cached data message when offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineIndicator />);
    expect(screen.getByText(/cached data/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import YachtListing from '@/pages/yacht-listing';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';

// Mock the Firebase modules
vi.mock('@/lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
  },
}));

const mockYachts = [
  {
    id: "1",
    name: "Ocean Paradise",
    description: "Luxurious megayacht with helipad",
    price: 50000,
    imageUrl: "https://example.com/yacht1.jpg",
    location: "Dubai Marina",
    capacity: 12,
    activities: ["yacht-cruise", "party"],
    duration: "full-day"
  },
  {
    id: "2",
    name: "Azure Dreams",
    description: "Perfect for water sports",
    price: 25000,
    imageUrl: "https://example.com/yacht2.jpg",
    location: "Palm Jumeirah",
    capacity: 8,
    activities: ["water-sports"],
    duration: "half-day"
  }
];

function renderYachtListing() {
  return render(
    <QueryClientProvider client={queryClient}>
      <YachtListing />
    </QueryClientProvider>
  );
}

describe('YachtListing Component - Search and Filter Functionality', () => {
  beforeEach(() => {
    // Reset query client
    queryClient.clear();
    // Mock the API response
    vi.mock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useQuery: () => ({
          data: mockYachts,
          isLoading: false,
        }),
      };
    });
  });

  it('should filter yachts based on search criteria', async () => {
    const user = userEvent.setup();
    renderYachtListing();

    // Test Step 1: Apply filters
    // Location filter
    const locationSelect = screen.getByRole('combobox', { name: /location/i });
    await user.click(locationSelect);
    await user.click(screen.getByRole('option', { name: /dubai marina/i }));

    // Date picker
    const dateButton = screen.getByRole('button', { name: /pick a date/i });
    await user.click(dateButton);
    const today = new Date();
    const formattedDate = format(today, 'PPP');
    await user.click(screen.getByRole('button', { name: formattedDate }));

    // Activity type
    const yachtCruiseCheckbox = screen.getByRole('checkbox', { name: /yacht cruise/i });
    await user.click(yachtCruiseCheckbox);

    // Price range (using the slider)
    const priceSlider = screen.getByRole('slider');
    await user.click(priceSlider); // Click at 50% of the slider

    // Duration
    const durationSelect = screen.getByRole('combobox', { name: /duration/i });
    await user.click(durationSelect);
    await user.click(screen.getByRole('option', { name: /full day/i }));

    // Test Step 2 & 3: Verify results
    await waitFor(() => {
      // Should only show Ocean Paradise yacht (matches all criteria)
      expect(screen.getByText('Ocean Paradise')).toBeInTheDocument();
      // Azure Dreams should not be visible (different location and duration)
      expect(screen.queryByText('Azure Dreams')).not.toBeInTheDocument();
    });

    // Test Step 4: Verify result details
    const resultCard = screen.getByText('Ocean Paradise').closest('div');
    expect(resultCard).toHaveTextContent('AED 50,000');
    expect(resultCard).toHaveTextContent('Luxurious megayacht');
    expect(resultCard).toHaveTextContent('Capacity: 12 guests');
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });
});

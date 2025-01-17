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

// Test data setup
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
  },
  {
    id: "3",
    name: "Royal Voyager",
    description: "Perfect for fishing trips",
    price: 35000,
    imageUrl: "https://example.com/yacht3.jpg",
    location: "Abu Dhabi",
    capacity: 6,
    activities: ["fishing"],
    duration: "full-day"
  },
  {
    id: "4",
    name: "Desert Pearl",
    description: "Corporate events and parties",
    price: 75000,
    imageUrl: "https://example.com/yacht4.jpg",
    location: "Dubai Marina",
    capacity: 20,
    activities: ["corporate", "party"],
    duration: "multi-day"
  },
  {
    id: "5",
    name: "Marina Star",
    description: "Family-friendly yacht with water sports",
    price: 15000,
    imageUrl: "https://example.com/yacht5.jpg",
    location: "Palm Jumeirah",
    capacity: 10,
    activities: ["yacht-cruise", "water-sports"],
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

  it('should show "no results" message when no yachts match filters', async () => {
    const user = userEvent.setup();
    renderYachtListing();

    // Apply filters that won't match any yachts
    // 1. Set location to Dubai Marina
    const locationSelect = screen.getByRole('combobox', { name: /location/i });
    await user.click(locationSelect);
    await user.click(screen.getByRole('option', { name: /dubai marina/i }));

    // 2. Set an extremely low price range that no yacht matches
    const priceSlider = screen.getByRole('slider');
    fireEvent.change(priceSlider, { target: { value: 1000 } }); // Set price below minimum

    // 3. Select a specific activity type
    const corporateCheckbox = screen.getByRole('checkbox', { name: /corporate/i });
    await user.click(corporateCheckbox);

    // 4. Set duration
    const durationSelect = screen.getByRole('combobox', { name: /duration/i });
    await user.click(durationSelect);
    await user.click(screen.getByRole('option', { name: /half day/i }));

    // Verify no results message
    await waitFor(() => {
      expect(screen.getByText(/no experiences match your criteria/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument();
    });

    // Test reset functionality
    const resetButton = screen.getByRole('button', { name: /reset filters/i });
    await user.click(resetButton);

    // Verify all yachts are shown after reset
    await waitFor(() => {
      mockYachts.forEach(yacht => {
        expect(screen.getByText(yacht.name)).toBeInTheDocument();
      });
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

  it('should reset filters when reset button is clicked', async () => {
    // TODO: Implement this test
  });

  it('should maintain filter state when navigating back to the page', async () => {
    // TODO: Implement this test
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import YachtDetails from '@/pages/yacht-details';
import userEvent from '@testing-library/user-event';

// Mock the Firebase modules
vi.mock('@/lib/firebase', () => ({
  db: {
    doc: vi.fn(),
    getDoc: vi.fn(),
  },
}));

// Mock useLocation hook
vi.mock('wouter', () => ({
  useLocation: () => ['/yacht/1', vi.fn()],
}));

// Test data setup
const mockYachtDetails = {
  id: "1",
  name: "Ocean Paradise",
  description: "Experience luxury at its finest aboard our flagship yacht.",
  price: 50000,
  location: "Dubai Marina",
  capacity: 12,
  activities: ["yacht-cruise", "party", "corporate"],
  duration: "full-day",
  gallery: [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ],
  addOns: [
    {
      id: "addon1",
      name: "Private Chef Service",
      description: "Enjoy gourmet meals prepared by our expert chef",
      price: 5000,
    },
    {
      id: "addon2",
      name: "Water Sports Package",
      description: "Access to jet skis, paddleboards, and snorkeling gear",
      price: 3000,
    },
  ],
  reviews: [
    {
      id: "review1",
      userName: "Ahmed K.",
      rating: 5,
      comment: "An unforgettable experience!",
      date: "2024-01-10",
    },
    {
      id: "review2",
      userName: "Sarah M.",
      rating: 4,
      comment: "Beautiful yacht and great crew.",
      date: "2024-01-05",
    },
  ],
};

function renderYachtDetails(id: string = "1") {
  return render(
    <QueryClientProvider client={queryClient}>
      <YachtDetails id={id} />
    </QueryClientProvider>
  );
}

describe('YachtDetails Component', () => {
  beforeEach(() => {
    // Reset query client
    queryClient.clear();
    // Mock the API response
    vi.mock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useQuery: () => ({
          data: mockYachtDetails,
          isLoading: false,
        }),
      };
    });
  });

  it('should display detailed yacht information correctly', async () => {
    const user = userEvent.setup();
    renderYachtDetails();

    // Verify basic information is displayed
    await waitFor(() => {
      expect(screen.getByText('Ocean Paradise')).toBeInTheDocument();
      expect(screen.getByText(/Experience luxury at its finest/)).toBeInTheDocument();
      expect(screen.getByText('Dubai Marina')).toBeInTheDocument();
      expect(screen.getByText('12 guests')).toBeInTheDocument();
      expect(screen.getByText('AED 50,000')).toBeInTheDocument();
    });

    // Check gallery images
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(mockYachtDetails.gallery.length);

    // Check add-ons tab
    const addOnsTab = screen.getByRole('tab', { name: /add-ons/i });
    await user.click(addOnsTab);
    await waitFor(() => {
      mockYachtDetails.addOns.forEach(addon => {
        expect(screen.getByText(addon.name)).toBeInTheDocument();
        expect(screen.getByText(addon.description)).toBeInTheDocument();
        expect(screen.getByText(`AED ${addon.price.toLocaleString()}`)).toBeInTheDocument();
      });
    });

    // Check reviews tab
    const reviewsTab = screen.getByRole('tab', { name: /reviews/i });
    await user.click(reviewsTab);
    await waitFor(() => {
      mockYachtDetails.reviews.forEach(review => {
        expect(screen.getByText(review.userName)).toBeInTheDocument();
        expect(screen.getByText(review.comment)).toBeInTheDocument();
      });
    });

    // Verify navigation
    const backButton = screen.getByRole('button', { name: /back to search results/i });
    expect(backButton).toBeInTheDocument();
  });

  it('should display loading state while fetching data', async () => {
    // Mock loading state
    vi.mock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useQuery: () => ({
          isLoading: true,
        }),
      };
    });

    renderYachtDetails();
    expect(screen.getByText(/back to search results/i)).toBeDisabled();
  });

  it('should handle missing yacht data gracefully', async () => {
    // Mock null data response
    vi.mock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useQuery: () => ({
          data: null,
          isLoading: false,
        }),
      };
    });

    renderYachtDetails();
    await waitFor(() => {
      expect(screen.getByText(/yacht details not found/i)).toBeInTheDocument();
    });
  });
});

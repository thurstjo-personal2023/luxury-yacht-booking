# Luxury Yacht Booking Platform

A sophisticated mobile-first luxury yacht booking platform designed to revolutionize water activity experiences for high-net-worth individuals and yacht enthusiasts.

## Technology Stack

- **Frontend**: React.js with mobile-first responsive design
- **Backend**: Firebase ecosystem (Authentication, Firestore, Cloud Functions, Storage)
- **Database**: PostgreSQL
- **Payment Processing**: Stripe integration
- **Architecture**: Serverless backend
- **Security**: Role-based access control with modern authentication flow

## Features

- Intuitive header design with logo positioning
- Authentication and authorization system
- Mobile-responsive interface
- Secure payment processing
- Real-time availability updates
- Yacht listing and booking management
- User profile and booking history

## Development

### Prerequisites

- Node.js (v20 or later)
- PostgreSQL database
- Firebase project credentials
- Stripe API keys

### Setup

1. Clone the repository:
```bash
git clone https://github.com/thurstjo-personal2023/luxury-yacht-booking.git
cd luxury-yacht-booking
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables:
```
DATABASE_URL=your_postgresql_connection_string
FIREBASE_API_KEY=your_firebase_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

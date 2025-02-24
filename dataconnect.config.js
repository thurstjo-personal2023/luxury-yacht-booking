module.exports = {
  emulators: {
    dataconnect: {
      port: 9399,
      host: '127.0.0.1'
    }
  },
  collections: {
    yacht_experiences: {
      source: 'yacht_experiences',
      schema: './shared/firestore-schema.ts',
      interface: 'YachtExperience'
    },
    yacht_profiles: {
      source: 'yacht_profiles',
      schema: './shared/firestore-schema.ts',
      interface: 'YachtProfile'
    },
    user_profiles_tourist: {
      source: 'user_profiles_tourist',
      schema: './shared/firestore-schema.ts'
    },
    articles_and_guides: {
      source: 'articles_and_guides',
      schema: './shared/firestore-schema.ts'
    },
    event_announcements: {
      source: 'event_announcements',
      schema: './shared/firestore-schema.ts'
    },
    notifications: {
      source: 'notifications',
      schema: './shared/firestore-schema.ts'
    },
    products_add_ons: {
      source: 'products_add_ons',
      schema: './shared/firestore-schema.ts'
    },
    promotions_and_offers: {
      source: 'promotions_and_offers',
      schema: './shared/firestore-schema.ts'
    },
    reviews_and_feedback: {
      source: 'reviews_and_feedback',
      schema: './shared/firestore-schema.ts'
    },
    support_content: {
      source: 'support_content',
      schema: './shared/firestore-schema.ts'
    },
    user_profiles_service_provider: {
      source: 'user_profiles_service_provider',
      schema: './shared/firestore-schema.ts'
    }
  }
};
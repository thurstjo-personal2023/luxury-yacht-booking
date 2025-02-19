import { db } from "../server/db";
import { users, yachts } from "@shared/schema";
import * as fs from 'fs';

async function exportData() {
  try {
    // Export users
    const allUsers = await db.select().from(users);
    const formattedUsers = allUsers.map(user => ({
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
      points: user.points,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));

    // Export yachts
    const allYachts = await db.select().from(yachts);
    const formattedYachts = allYachts.map(yacht => ({
      yachtId: yacht.id.toString(),
      name: yacht.name,
      description: yacht.description,
      price: yacht.price,
      capacity: yacht.capacity,
      producerId: yacht.producerId.toString(),
      imageUrl: yacht.imageUrl,
      location: yacht.location,
      activities: yacht.activities,
      duration: yacht.duration,
      availableFrom: yacht.availableFrom.toISOString(),
      availableTo: yacht.availableTo.toISOString()
    }));

    // Create export directory if it doesn't exist
    if (!fs.existsSync('exports')) {
      fs.mkdirSync('exports');
    }

    // Write to JSON files
    fs.writeFileSync(
      'exports/users.json',
      JSON.stringify({ users: formattedUsers }, null, 2)
    );

    fs.writeFileSync(
      'exports/yachts.json',
      JSON.stringify({ yachts: formattedYachts }, null, 2)
    );

    console.log('Data exported successfully to exports/users.json and exports/yachts.json');
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  }
}

exportData();

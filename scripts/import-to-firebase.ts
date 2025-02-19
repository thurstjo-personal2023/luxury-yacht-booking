import { db } from "./firebase-init";
import { collection, doc, setDoc } from "firebase/firestore";
import * as fs from 'fs';

async function importData() {
  try {
    // Read exported data
    const users = JSON.parse(fs.readFileSync('exports/users.json', 'utf-8')).users;
    const yachts = JSON.parse(fs.readFileSync('exports/yachts.json', 'utf-8')).yachts;

    console.log('Starting data import to Firestore...');

    // Import users
    for (const user of users) {
      await setDoc(doc(db, 'users', user.userId), user);
    }
    console.log(`Imported ${users.length} users`);

    // Import yachts
    for (const yacht of yachts) {
      await setDoc(doc(db, 'yachts', yacht.yachtId), yacht);
    }
    console.log(`Imported ${yachts.length} yachts`);

    console.log('Data import completed successfully');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importData();
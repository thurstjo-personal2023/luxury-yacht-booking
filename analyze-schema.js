/**
 * Analyze the schema of unified_yacht_experiences.json
 * This script identifies field inconsistencies and type discrepancies
 */

import { readFileSync } from 'fs';

// Load the data
try {
  const jsonData = readFileSync('unified_yacht_experiences.json', 'utf8');
  const data = JSON.parse(jsonData);
  
  console.log(`Analyzing ${data.length} yacht records...`);
  
  // Track field presence and types
  const fieldStats = {};
  const typeStats = {};
  
  // Analyze each record
  data.forEach((record, index) => {
    Object.entries(record).forEach(([field, value]) => {
      // Count field occurrences
      fieldStats[field] = fieldStats[field] || { count: 0, records: [] };
      fieldStats[field].count++;
      if (fieldStats[field].records.length < 3) {
        fieldStats[field].records.push(index);
      }
      
      // Determine and track value type
      let type;
      if (value === null) {
        type = 'null';
      } else if (Array.isArray(value)) {
        type = 'array';
        
        // Check if array has numeric keys (should be array but stored as object)
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => !isNaN(parseInt(k)))) {
          type = 'object-as-array';
        }
      } else if (typeof value === 'object' && value._seconds !== undefined) {
        type = 'timestamp';
      } else {
        type = typeof value;
      }
      
      // Track types for this field
      typeStats[field] = typeStats[field] || {};
      typeStats[field][type] = typeStats[field][type] || { count: 0, examples: [] };
      typeStats[field][type].count++;
      
      // Store a few example values for each type
      if (typeStats[field][type].examples.length < 2) {
        typeStats[field][type].examples.push(value);
      }
    });
  });
  
  // Print field statistics
  console.log('\n=== FIELD OCCURRENCE STATISTICS ===');
  console.log(`${data.length} total records analyzed`);
  console.log('-------------------------------------');
  
  Object.entries(fieldStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([field, stats]) => {
      const percentage = Math.round((stats.count / data.length) * 100);
      console.log(`${field}: ${stats.count}/${data.length} records (${percentage}%)`);
    });
  
  // Print key naming inconsistencies
  console.log('\n=== KEY NAMING PATTERNS ===');
  
  // Define pairs of fields that should be consolidated
  const fieldPairs = [
    ['isAvailable', 'availability_status', 'available'],
    ['title', 'name'],
    ['pricing', 'price'],
    ['pricingModel', 'pricing_model'],
    ['capacity', 'max_guests'],
    ['yachtType', 'yacht_type'],
    ['tags', 'features'],
    ['createdAt', 'created_date'],
    ['updatedAt', 'last_updated_date'],
    ['customizationOptions', 'customization_options'],
    ['virtualTour', 'virtual_tour'],
    ['isFeatured', 'featured'],
    ['isPublished', 'published_status']
  ];
  
  fieldPairs.forEach(relatedFields => {
    const stats = relatedFields.map(field => 
      `${field}: ${fieldStats[field]?.count || 0}/${data.length} (${Math.round(((fieldStats[field]?.count || 0) / data.length) * 100)}%)`
    ).join(', ');
    
    console.log(`${relatedFields.join('/')} -> ${stats}`);
  });
  
  // Print type inconsistencies
  console.log('\n=== TYPE INCONSISTENCIES ===');
  
  Object.entries(typeStats)
    .filter(([_, types]) => Object.keys(types).length > 1)
    .forEach(([field, types]) => {
      console.log(`${field} has inconsistent types:`);
      
      Object.entries(types).forEach(([type, stats]) => {
        console.log(`  - ${type}: ${stats.count} records`);
        console.log(`    Examples: ${JSON.stringify(stats.examples).substring(0, 100)}${JSON.stringify(stats.examples).length > 100 ? '...' : ''}`);
      });
    });
  
  // Structural recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('Based on analysis, standardize on these fields:');
  
  const primaryFields = [
    ['id', 'Primary identifier'],
    ['title', 'Yacht title (preferred over name)'],
    ['description', 'Description text'],
    ['category', 'Category classification'],
    ['yachtType', 'Type of yacht (camelCase)'],
    ['location', 'Location object with consistent structure'],
    ['capacity', 'Guest capacity (numeric)'],
    ['duration', 'Experience duration (numeric)'],
    ['pricing', 'Price amount (numeric)'],
    ['pricingModel', 'Pricing model (camelCase)'],
    ['customizationOptions', 'Customization options array (camelCase)'],
    ['media', 'Media items array'],
    ['mainImage', 'Main display image URL string'],
    ['isAvailable', 'Availability status (boolean, camelCase)'],
    ['isFeatured', 'Featured status (boolean, camelCase)'],
    ['isPublished', 'Publication status (boolean, camelCase)'],
    ['tags', 'Tags array (preferred over features)'],
    ['providerId', 'Provider/owner ID'],
    ['reviews', 'Reviews array'],
    ['virtualTour', 'Virtual tour data (camelCase)'],
    ['createdAt', 'Creation timestamp (camelCase)'],
    ['updatedAt', 'Last updated timestamp (camelCase)'],
    ['_lastUpdated', 'String timestamp for cache busting']
  ];
  
  primaryFields.forEach(([field, description]) => {
    console.log(`- ${field}: ${description} (${fieldStats[field]?.count || 0}/${data.length} records)`);
  });
  
} catch (error) {
  console.error('Error analyzing schema:', error);
}
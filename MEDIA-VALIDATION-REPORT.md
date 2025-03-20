# Media Validation and Repair System

This document provides an overview of the media validation and repair system for the Etoile Yachts platform.

## Overview

The media validation system identifies and repairs issues with media URLs in the Firestore database, including:

1. **Relative URLs**: Converts relative URLs (e.g., `/yacht-placeholder.jpg`) to absolute URLs
2. **Blob URLs**: Replaces blob URLs (e.g., `blob://...`) with appropriate placeholders
3. **Media Type Mismatches**: Detects when videos are incorrectly labeled as images

## Implementation

The system consists of several components:

### 1. Cloud Functions

- **scheduledMediaValidation**: Runs every 4 hours to check for media URL issues
- **processMediaValidation**: Processes batches of documents for validation

### 2. URL Validation Logic

The core validation logic:

```javascript
function processMediaUrl(url, declaredType) {
  // Skip empty URLs
  if (!url) {
    return {url, wasFixed: false};
  }

  let wasFixed = false;
  let detectedType;
  let processedUrl = url;

  // Fix relative URLs
  if (url.startsWith("/")) {
    // Convert to absolute URL with the correct base
    const baseUrl = "https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/";
    processedUrl = `${baseUrl}${url.substring(1)}`;
    wasFixed = true;
  }

  // Fix blob URLs
  if (url.startsWith("blob:")) {
    // Replace with placeholder
    processedUrl = "https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/yacht-placeholder.jpg";
    wasFixed = true;
  }

  // Detect if this should be a video based on URL patterns
  if (declaredType === "image" && isLikelyVideo(url)) {
    detectedType = "video";
    wasFixed = true;
  }

  return {url: processedUrl, wasFixed, detectedType};
}
```

### 3. Video Detection Patterns

The system uses these patterns to identify videos that may be incorrectly labeled as images:

```javascript
const VIDEO_PATTERNS = [
  "-SBV-",
  "Dynamic motion",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  "video/",
];
```

## Validation Reports

Validation results are stored in the `media_validation_reports` collection in Firestore. Each report includes:

- Collection name and document ID
- Timestamp of the validation
- List of fixed URLs (relative to absolute)
- List of fixed media types (image to video)

## Manual Validation Tools

Several scripts are provided to manually manage the validation process:

### 1. Trigger Media Validation

```
node scripts/trigger-media-validation.js [--collection=collection_name]
```

This script uses the Firebase Admin SDK to publish validation tasks to Pub/Sub, triggering the validation process.

### 2. Trigger Validation (CLI Version)

```
node scripts/trigger-validation-cli.js [--collection=collection_name]
```

A simpler alternative that uses the Firebase CLI to trigger the validation process.

### 3. HTTP Trigger

```
node scripts/trigger-http-validation.js [--collection=collection_name] [--token=firebase_id_token]
```

Triggers validation via direct HTTP calls to the Cloud Function.

### 4. Check Validation Reports

```
node scripts/check-validation-reports.js [--limit=10]
```

Checks recent validation reports to see what has been fixed.

### 5. Run Media Repair

```
node scripts/run-media-repair.js [--collection=collection_name] [--dry-run]
```

Directly runs the repair process locally, with an option for a dry run that shows what would be changed without making actual changes.

## Validation Status

The latest validation run found several issues that need to be addressed:

1. Relative URLs in various collections (`/yacht-placeholder.jpg`)
2. Media type mismatches (videos incorrectly labeled as images)

After fixing the validation logic to use the correct base URL, these issues can be resolved by:

1. Running the Cloud Function to process all collections
2. Using the manual repair script for immediate fixes

## Best Practices

1. Always run validation after importing new data
2. Periodically check validation reports to ensure media integrity
3. Use the `--dry-run` option with the repair script to preview changes
4. Update the base URL in the validation logic if the hosting domain changes

## Troubleshooting

If media still appears broken after validation:

1. Check that the correct base URL is being used in the validation logic
2. Verify that the Cloud Function has been redeployed with the latest code
3. Run the manual validation process to ensure immediate fixes
4. Check validation reports for any unexpected errors
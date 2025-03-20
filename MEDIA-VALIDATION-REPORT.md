# Media Validation System Documentation

## Overview

The Media Validation System is a comprehensive solution for detecting and repairing invalid media URLs across the Etoile Yachts platform. It provides automated validation, reporting, and repair capabilities for images and videos referenced in the Firestore database.

## Key Components

### 1. URL Validator
Located in `functions/media-validation/url-validator.ts`, this module provides utilities to validate URLs and check if they are accessible. It can detect various issues:
- Invalid URL formats
- Missing resources (404 errors)
- Server errors
- Media type mismatches (e.g., video content in image fields)
- Relative URLs that won't resolve properly

### 2. Media Validation Service
Located in `functions/media-validation/media-validation.ts`, this service validates media URLs in documents and generates reports. Features include:
- Document validation that extracts and checks all media URLs
- Report generation with detailed statistics by collection
- URL fixing capabilities that replace invalid URLs with placeholders

### 3. Worker Process
Located in `functions/media-validation/worker.ts`, the worker provides functionality to process validation tasks in batches:
- Processes documents in configurable batch sizes
- Validates and optionally fixes media URLs across collections
- Saves validation reports to Firestore for later reference

### 4. Scheduler
Located in `functions/media-validation/scheduler.ts`, the scheduler manages periodic validation tasks:
- Supports interval-based scheduling
- Configurable concurrency limits
- Task management with status tracking

### 5. Admin Interface
The admin interface includes:
- `MediaValidationPanel` component for visualization and control
- `useMediaValidation` hook for interacting with the validation API
- Dashboard with validation statistics and controls
- Results view with detailed error information
- History view for past validation reports

## Test Coverage

The system includes comprehensive test coverage:

### 1. URL Validator Tests
Tests in `tests/url-validator.test.ts` verify:
- Validation of valid and invalid URLs
- Detection of incorrect media types
- Handling of network errors and timeouts
- URL extraction from complex documents

### 2. Media Validation Service Tests
Tests in `tests/media-validation.test.ts` verify:
- Document validation across different document types
- Report generation with accurate statistics
- URL fixing logic
- Handling of nested fields and arrays

### 3. Worker Tests
Tests in `tests/worker.test.ts` verify:
- Batch processing of documents
- Error handling during processing
- Report generation and storage
- Task management and progress tracking

### 4. Hook Tests
Tests in `tests/use-media-validation.test.tsx` verify:
- Loading validation reports
- Running validation tasks
- Fixing invalid URLs
- Error handling in the UI layer

## Current Validation Results

The system has already identified several invalid URLs in the database:

1. **Relative URLs**: Several documents contain relative URL paths like `/yacht-placeholder.jpg` that cannot be directly resolved.
2. **Media Type Mismatches**: Several fields labeled as images actually contain video URLs.

These issues are now being tracked in Firestore and can be repaired through the admin interface.

## Implementation Status

- ✅ Core validation functionality
- ✅ Worker for batch processing
- ✅ Scheduler for periodic validation
- ✅ Admin interface for visualization and control
- ✅ Test coverage for key components

## Next Steps

1. **Integration with Firebase Functions**: Deploy the validation system as scheduled Cloud Functions.
2. **Email Notifications**: Implement email alerts for critical media issues.
3. **Advanced Repair Options**: Add custom repair rules for different collections.
4. **Validation History**: Implement trend analysis for URL health over time.
5. **Performance Optimization**: Implement caching for frequently validated URLs.

## Usage Guide

### Running a Validation

1. Navigate to the Media Administration page
2. Click "Run Validation" to start a validation task
3. Wait for the validation to complete
4. View results in the "Validation Results" tab

### Fixing Invalid URLs

1. Navigate to the Media Administration page
2. View validation results
3. Click "Fix All Issues" to replace invalid URLs with placeholders
4. Confirm the operation

### Viewing Validation History

1. Navigate to the Media Administration page
2. Select the "History" tab
3. View past validation runs and their results
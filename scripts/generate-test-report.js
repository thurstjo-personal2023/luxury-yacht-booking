/**
 * Generate Test Report
 * 
 * This script combines Jest and Cypress test results into a comprehensive report.
 * It reads JUnit XML files and generates a combined HTML/JSON report.
 */

import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';

const TEST_REPORTS_DIR = './test-reports';
const JEST_REPORT_FILE = path.join(TEST_REPORTS_DIR, 'junit/jest-junit.xml');
const CYPRESS_REPORT_DIR = path.join(TEST_REPORTS_DIR, 'cypress');
const OUTPUT_DIR = path.join(TEST_REPORTS_DIR, 'combined');
const TIMESTAMP = new Date().toISOString().replace(/:/g, '-');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse an XML file and return the JS object
 */
async function parseXmlFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return null;
  }
  
  const xml = fs.readFileSync(filePath, 'utf-8');
  const parser = new xml2js.Parser({ explicitArray: false });
  
  try {
    return await parser.parseStringPromise(xml);
  } catch (error) {
    console.error(`Error parsing XML file ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract test results from Jest XML report
 */
async function extractJestResults() {
  const data = await parseXmlFile(JEST_REPORT_FILE);
  if (!data) return null;
  
  const testsuites = data.testsuites;
  const results = {
    name: 'Jest Unit Tests',
    totalTests: parseInt(testsuites.$.tests, 10) || 0,
    failures: parseInt(testsuites.$.failures, 10) || 0,
    errors: parseInt(testsuites.$.errors, 10) || 0,
    skipped: parseInt(testsuites.$.skipped, 10) || 0,
    time: parseFloat(testsuites.$.time) || 0,
    timestamp: testsuites.$.timestamp,
    suites: []
  };
  
  // Process each test suite
  const suites = Array.isArray(testsuites.testsuite) ? testsuites.testsuite : [testsuites.testsuite];
  
  suites.forEach(suite => {
    if (!suite) return;
    
    const suiteData = {
      name: suite.$.name,
      tests: parseInt(suite.$.tests, 10) || 0,
      failures: parseInt(suite.$.failures, 10) || 0,
      errors: parseInt(suite.$.errors, 10) || 0,
      skipped: parseInt(suite.$.skipped, 10) || 0,
      time: parseFloat(suite.$.time) || 0,
      cases: []
    };
    
    // Process each test case
    const testcases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
    
    testcases.forEach(testcase => {
      if (!testcase) return;
      
      const caseData = {
        name: testcase.$.name,
        className: testcase.$.classname,
        time: parseFloat(testcase.$.time) || 0,
        status: 'passed'
      };
      
      if (testcase.failure) {
        caseData.status = 'failed';
        caseData.failure = {
          message: typeof testcase.failure === 'string' ? testcase.failure : testcase.failure._ || testcase.failure.$.message,
          type: typeof testcase.failure === 'object' ? testcase.failure.$.type : 'AssertionError'
        };
      } else if (testcase.skipped) {
        caseData.status = 'skipped';
      }
      
      suiteData.cases.push(caseData);
    });
    
    results.suites.push(suiteData);
  });
  
  return results;
}

/**
 * Extract test results from Cypress XML reports
 */
async function extractCypressResults() {
  if (!fs.existsSync(CYPRESS_REPORT_DIR)) {
    console.warn(`Cypress reports directory not found: ${CYPRESS_REPORT_DIR}`);
    return null;
  }
  
  const files = fs.readdirSync(CYPRESS_REPORT_DIR)
    .filter(file => file.endsWith('.xml'))
    .map(file => path.join(CYPRESS_REPORT_DIR, file));
  
  if (files.length === 0) {
    console.warn('No Cypress XML reports found');
    return null;
  }
  
  const results = {
    name: 'Cypress E2E Tests',
    totalTests: 0,
    failures: 0,
    errors: 0,
    skipped: 0,
    time: 0,
    timestamp: new Date().toISOString(),
    suites: []
  };
  
  // Process each Cypress report file
  for (const file of files) {
    const data = await parseXmlFile(file);
    if (!data || !data.testsuites) continue;
    
    const testsuites = data.testsuites;
    
    results.totalTests += parseInt(testsuites.$.tests, 10) || 0;
    results.failures += parseInt(testsuites.$.failures, 10) || 0;
    results.errors += parseInt(testsuites.$.errors, 10) || 0;
    results.skipped += parseInt(testsuites.$.skipped, 10) || 0;
    results.time += parseFloat(testsuites.$.time) || 0;
    
    // Process each test suite
    const suites = Array.isArray(testsuites.testsuite) ? testsuites.testsuite : [testsuites.testsuite];
    
    suites.forEach(suite => {
      if (!suite) return;
      
      const suiteData = {
        name: suite.$.name,
        tests: parseInt(suite.$.tests, 10) || 0,
        failures: parseInt(suite.$.failures, 10) || 0,
        errors: parseInt(suite.$.errors, 10) || 0,
        skipped: parseInt(suite.$.skipped, 10) || 0,
        time: parseFloat(suite.$.time) || 0,
        cases: []
      };
      
      // Process each test case
      const testcases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
      
      testcases.forEach(testcase => {
        if (!testcase) return;
        
        const caseData = {
          name: testcase.$.name,
          className: testcase.$.classname,
          time: parseFloat(testcase.$.time) || 0,
          status: 'passed'
        };
        
        if (testcase.failure) {
          caseData.status = 'failed';
          caseData.failure = {
            message: typeof testcase.failure === 'string' ? testcase.failure : testcase.failure._ || testcase.failure.$.message,
            type: typeof testcase.failure === 'object' ? testcase.failure.$.type : 'AssertionError'
          };
        } else if (testcase.skipped) {
          caseData.status = 'skipped';
        }
        
        suiteData.cases.push(caseData);
      });
      
      results.suites.push(suiteData);
    });
  }
  
  return results;
}

/**
 * Generate combined test report
 */
async function generateCombinedReport() {
  console.log('Generating combined test report...');
  
  // Extract test results
  const jestResults = await extractJestResults();
  const cypressResults = await extractCypressResults();
  
  // Create combined report
  const combinedReport = {
    timestamp: TIMESTAMP,
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      totalTime: 0
    },
    suites: []
  };
  
  // Add Jest results
  if (jestResults) {
    combinedReport.summary.totalTests += jestResults.totalTests;
    combinedReport.summary.failed += jestResults.failures;
    combinedReport.summary.skipped += jestResults.skipped;
    combinedReport.summary.totalTime += jestResults.time;
    combinedReport.summary.passed += jestResults.totalTests - jestResults.failures - jestResults.skipped;
    combinedReport.suites.push({ type: 'unit', results: jestResults });
  }
  
  // Add Cypress results
  if (cypressResults) {
    combinedReport.summary.totalTests += cypressResults.totalTests;
    combinedReport.summary.failed += cypressResults.failures;
    combinedReport.summary.skipped += cypressResults.skipped;
    combinedReport.summary.totalTime += cypressResults.time;
    combinedReport.summary.passed += cypressResults.totalTests - cypressResults.failures - cypressResults.skipped;
    combinedReport.suites.push({ type: 'e2e', results: cypressResults });
  }
  
  // Save JSON report
  const jsonReportPath = path.join(OUTPUT_DIR, `test-report-${TIMESTAMP}.json`);
  fs.writeFileSync(jsonReportPath, JSON.stringify(combinedReport, null, 2));
  console.log(`JSON report saved to: ${jsonReportPath}`);
  
  // Save HTML report
  const htmlReportPath = path.join(OUTPUT_DIR, `test-report-${TIMESTAMP}.html`);
  const html = generateHtmlReport(combinedReport);
  fs.writeFileSync(htmlReportPath, html);
  console.log(`HTML report saved to: ${htmlReportPath}`);
  
  return {
    json: jsonReportPath,
    html: htmlReportPath,
    summary: combinedReport.summary
  };
}

/**
 * Generate HTML report from test results
 */
function generateHtmlReport(report) {
  const passRate = report.summary.totalTests > 0 
    ? Math.round((report.summary.passed / report.summary.totalTests) * 100) 
    : 0;
  
  // CSS classes for styling
  const styles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #2c3e50; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-box { padding: 15px; border-radius: 5px; flex: 1; }
    .total { background-color: #f0f0f0; }
    .passed { background-color: #d5f5e3; }
    .failed { background-color: #fadbd8; }
    .skipped { background-color: #f8f9fa; }
    .time { background-color: #eaf2f8; }
    .suite { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
    .suite-header { padding: 10px 15px; background-color: #f5f5f5; border-bottom: 1px solid #ddd; }
    .suite-body { padding: 0 15px; }
    .test-case { padding: 8px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
    .test-case:last-child { border-bottom: none; }
    .test-name { flex: 1; }
    .test-status { padding: 2px 8px; border-radius: 3px; font-size: 0.8em; }
    .status-passed { background-color: #d5f5e3; }
    .status-failed { background-color: #fadbd8; }
    .status-skipped { background-color: #f8f9fa; }
    .failure-details { background-color: #fff3f3; padding: 10px; margin-top: 5px; border-left: 3px solid #e74c3c; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
    .progress-bar { height: 20px; background-color: #e0e0e0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background-color: #2ecc71; width: ${passRate}%; transition: width 0.5s; }
  `;
  
  // Summary section
  const summary = `
    <h1>Etoile Yachts Test Report</h1>
    <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    
    <div class="summary">
      <div class="summary-box total">
        <h3>Total Tests</h3>
        <p>${report.summary.totalTests}</p>
      </div>
      <div class="summary-box passed">
        <h3>Passed</h3>
        <p>${report.summary.passed} (${passRate}%)</p>
      </div>
      <div class="summary-box failed">
        <h3>Failed</h3>
        <p>${report.summary.failed}</p>
      </div>
      <div class="summary-box skipped">
        <h3>Skipped</h3>
        <p>${report.summary.skipped}</p>
      </div>
      <div class="summary-box time">
        <h3>Total Time</h3>
        <p>${report.summary.totalTime.toFixed(2)}s</p>
      </div>
    </div>
  `;
  
  // Generate test suites sections
  let suitesHtml = '';
  
  report.suites.forEach(suiteGroup => {
    const groupName = suiteGroup.type === 'unit' ? 'Unit Tests' : 'E2E Tests';
    
    suitesHtml += `
      <h2>${groupName}</h2>
    `;
    
    suiteGroup.results.suites.forEach(suite => {
      const passedTests = suite.cases.filter(c => c.status === 'passed').length;
      const failedTests = suite.cases.filter(c => c.status === 'failed').length;
      const skippedTests = suite.cases.filter(c => c.status === 'skipped').length;
      
      suitesHtml += `
        <div class="suite">
          <div class="suite-header">
            <h3>${suite.name}</h3>
            <p>
              ${suite.tests} tests | 
              ${passedTests} passed | 
              ${failedTests} failed | 
              ${skippedTests} skipped | 
              ${suite.time.toFixed(2)}s
            </p>
          </div>
          <div class="suite-body">
      `;
      
      // Add test cases
      suite.cases.forEach(testCase => {
        const statusClass = `status-${testCase.status}`;
        
        suitesHtml += `
          <div class="test-case">
            <div class="test-name">${testCase.name}</div>
            <div class="test-status ${statusClass}">${testCase.status}</div>
          </div>
        `;
        
        // Add failure details if test failed
        if (testCase.status === 'failed' && testCase.failure) {
          suitesHtml += `
            <div class="failure-details">
              ${testCase.failure.message || 'Test failed'}
            </div>
          `;
        }
      });
      
      suitesHtml += `
          </div>
        </div>
      `;
    });
  });
  
  // Combine all sections into full HTML document
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Etoile Yachts Test Report</title>
      <style>${styles}</style>
    </head>
    <body>
      ${summary}
      ${suitesHtml}
    </body>
    </html>
  `;
}

// Run the script
generateCombinedReport()
  .then(result => {
    console.log('Report generation completed successfully!');
    console.log('Summary:', result.summary);
  })
  .catch(error => {
    console.error('Error generating report:', error);
    process.exit(1);
  });
/**
 * Standalone test script to verify Gemini API integration.
 * Usage: node src/test-gemini.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { analyzeAndRepairCode } from './services/gemini.service.js';

const sampleCodeWithBug = `
def calculate_average(numbers):
    total = 0
    for i in range(len(numbers)):
        total += numbers[i]
    return total / len(numbers)

# Test with empty list (Runtime Error: ZeroDivisionError)
result = calculate_average([])
print("Average:", result)
`;

async function runTest() {
  console.log('--- Testing CodeFix AI Gemini Service ---');
  console.log('Sample Python Code:');
  console.log(sampleCodeWithBug);

  try {
    const result = await analyzeAndRepairCode(
      sampleCodeWithBug, 
      'Calculate average of a list of numbers, handling empty lists safely.'
    );

    console.log('\n--- Analysis Result ---');
    console.log('Has Bugs:', result.hasBugs);
    console.log('Summary:', result.summary);
    console.log('\nBugs Detected:');
    result.bugs.forEach(bug => {
      console.log(`- [${bug.category.toUpperCase()}] ${bug.title} (Lines: ${bug.lineNumbers.join(', ')}): ${bug.explanation}`);
    });
    console.log('\nCorrected Code:');
    console.log(result.correctedCode);
    console.log('\nSuggested Test Cases:');
    result.suggestedCases.forEach(tc => {
      console.log(`- [${tc.testType}] ${tc.description} -> Expected Output: ${tc.expectedOutput}`);
    });
    console.log('\nTest Completed Successfully!');
  } catch (err) {
    console.error('\nTest Failed:');
    console.error('Error Code:', err.code);
    console.error('Message:', err.message);
  }
}

runTest();

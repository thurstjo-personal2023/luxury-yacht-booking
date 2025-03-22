/**
 * Simple Test
 * 
 * Basic test that doesn't rely on any external services
 */

describe('Basic Tests', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(1 + 2).toBe(3);
  });

  test('string concatenation works', () => {
    expect('Hello' + ' ' + 'World').toBe('Hello World');
  });
});
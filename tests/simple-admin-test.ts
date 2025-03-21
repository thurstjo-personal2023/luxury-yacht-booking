/**
 * Simple Test File
 * 
 * This file contains basic tests to verify that the testing environment
 * is correctly set up before running more complex tests.
 */

describe('Basic Test Environment', () => {
  it('should run a simple test', () => {
    // A basic test that should always pass
    expect(1 + 1).toBe(2);
  });

  it('should handle async tests', async () => {
    // A basic async test
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should handle mocks', () => {
    // A basic mock test
    const mockFn = jest.fn().mockReturnValue('mocked');
    const result = mockFn();
    
    expect(mockFn).toHaveBeenCalled();
    expect(result).toBe('mocked');
  });
});
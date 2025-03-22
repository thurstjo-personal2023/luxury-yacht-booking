/**
 * Base Mock Repository
 * 
 * This abstract class provides common functionality for all mock repositories
 * used in testing. It includes method call tracking and behavior customization.
 */

export interface MockBehavior<T> {
  returnValue?: T;
  error?: Error;
  delay?: number;
}

export interface MethodCall {
  method: string;
  args: any[];
  timestamp: Date;
}

export abstract class BaseMockRepository {
  private methodCalls: MethodCall[] = [];
  private mockBehaviors: Map<string, MockBehavior<any>> = new Map();

  /**
   * Record a method call for tracking
   * @param method Method name
   * @param args Arguments passed to the method
   */
  protected recordMethodCall(method: string, args: any[]): void {
    this.methodCalls.push({
      method,
      args,
      timestamp: new Date()
    });
  }

  /**
   * Set custom behavior for a method
   * @param method Method name
   * @param behavior Behavior configuration
   */
  public setMethodBehavior<T>(method: string, behavior: MockBehavior<T>): void {
    this.mockBehaviors.set(method, behavior);
  }

  /**
   * Reset all method behaviors to default
   */
  public resetBehaviors(): void {
    this.mockBehaviors.clear();
  }

  /**
   * Clear the method call history
   */
  public clearMethodCalls(): void {
    this.methodCalls = [];
  }

  /**
   * Get all recorded method calls
   */
  public getMethodCalls(): MethodCall[] {
    return [...this.methodCalls];
  }

  /**
   * Get calls for a specific method
   * @param method Method name
   */
  public getCallsForMethod(method: string): MethodCall[] {
    return this.methodCalls.filter(call => call.method === method);
  }

  /**
   * Check if a method was called
   * @param method Method name
   */
  public wasMethodCalled(method: string): boolean {
    return this.methodCalls.some(call => call.method === method);
  }

  /**
   * Get the behavior for a method
   * @param method Method name
   */
  protected getMethodBehavior<T>(method: string): MockBehavior<T> | undefined {
    return this.mockBehaviors.get(method);
  }

  /**
   * Execute method with configured behavior
   * @param method Method name
   * @param args Arguments passed to the method
   * @param defaultFn Default function to execute if no behavior is configured
   */
  protected async executeMethod<T>(
    method: string, 
    args: any[], 
    defaultFn: () => T
  ): Promise<T> {
    this.recordMethodCall(method, args);
    
    const behavior = this.getMethodBehavior<T>(method);
    
    if (!behavior) {
      return defaultFn();
    }
    
    if (behavior.delay) {
      await new Promise(resolve => setTimeout(resolve, behavior.delay));
    }
    
    if (behavior.error) {
      throw behavior.error;
    }
    
    return behavior.returnValue !== undefined ? behavior.returnValue : defaultFn();
  }
}
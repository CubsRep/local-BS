import { adminConsolePlugin } from './plugin';

describe('admin-console', () => {
  it('should export plugin', () => {
    expect(adminConsolePlugin).toBeDefined();
  });
});

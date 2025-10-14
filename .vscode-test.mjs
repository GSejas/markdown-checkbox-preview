import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	mocha: {
		timeout: 10000, // 10 second timeout for slow VS Code test environment
		slow: 5000,     // Mark tests as slow after 5 seconds
	},
});


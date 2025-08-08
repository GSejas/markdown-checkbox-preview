const { renderMarkdown } = require('./out/renderer.js');

const markdown = `# Header

Some text

- [ ] Task 1
- [x] Task 2

More text

## Another header

- [ ] Task 3`;

console.log('Input markdown:');
console.log(markdown);
console.log('\n===================\n');

const html = renderMarkdown(markdown);

console.log('Output HTML:');
console.log(html);
console.log('\n===================\n');

console.log('Test results:');
console.log('Contains <h1>:', html.includes('<h1>'));
console.log('Contains <h2>:', html.includes('<h2>'));
console.log('Contains <h1 with attributes:', html.includes('<h1 '));
console.log('Contains <h2 with attributes:', html.includes('<h2 '));

// Show the first occurrence of each
const h1Index = html.indexOf('<h1');
const h2Index = html.indexOf('<h2');
console.log('h1 first occurrence:', h1Index >= 0 ? html.slice(h1Index, h1Index + 30) : 'not found');
console.log('h2 first occurrence:', h2Index >= 0 ? html.slice(h2Index, h2Index + 30) : 'not found');

const args = process.argv.slice(2);
console.log('Hello from example-hello!');
if (args.length > 0) {
  console.log('args:', args.join(' '));
}

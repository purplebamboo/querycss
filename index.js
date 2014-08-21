var css = require('css');
var fs = require('fs');

var cssString = fs.readFileSync('./test.css').toString();

console.log(cssString);

var ast = css.parse(cssString);

console.log(require('util').inspect(ast, { depth: null }));

//var css = css.stringify(ast);

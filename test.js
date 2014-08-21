

var AST = {
  type: 'root',
  children: []
};
var css = '';

// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g


/**
 * Error `msg`.
 */

function error(msg) {
  console.log(msg);
}


/**
 * Match `re` and return captures.
 */

function match(re) {
  var m = re.exec(css);
  if (!m) return;
  var str = m[0];
  css = css.slice(str.length);
  return m;
}

function whitespace(){
  match(/^\s*/);
}
/**
 * Parse selector.
 */

function selector() {
  var m = match(/^([^{]+)/);
  if (!m) return;
  /* @fix Remove all comments from selectors
   * http://ostermiller.org/findcomment.html */
  return trim(m[0])
    .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')
    .replace(/(?:"[^"]*"|'[^']*')/g, function(m) {
      return m.replace(/,/g, '\u200C');
    })
    .split(/\s*(?![^(]*\)),\s*/)
    .map(function(s) {
      return s.replace(/\u200C/g, ',');
    });
}



function matchRule() {
  var sel = selector();

  if (!sel) return;
  if (!match(/^{\s*/)) return;
  return {
    type: 'rule',
    selectors: sel,
    children: matchNodes()
  };
}
function matchDeclaration(){
  // prop
  var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
  if (!prop) return;
  prop = trim(prop[0]);
  // :
  if (!match(/^:\s*/)) return error("property missing ':'");

  // val
  var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

  var ret = {
    type: 'declaration',
    property: prop.replace(commentre, ''),
    value: val ? trim(val[0]).replace(commentre, '') : ''
  };

  // ;
  match(/^[;\s]*/);

  return ret;
}

function matchComment(){
  if ('/' != css.charAt(0) || '*' != css.charAt(1)) return;

  var i = 2;
  while ("" != css.charAt(i) && ('*' != css.charAt(i) || '/' != css.charAt(i + 1)))++i;
  i += 2;

  if ("" === css.charAt(i - 1)) {
    return error('End of comment missing');
  }

  var str = css.slice(2, i - 2);
  
  css = css.slice(i);

  return {
    type: 'comment',
    comment: str
  };
}


function identifyParse() {
  //只做 rule跟declaration,comment
  var indexRuleOpen = css.indexOf('{');
  var indexRuleClose = css.indexOf('}');
  var indexDeclaration = css.indexOf(':');
  whitespace();
  if (match(/^}/)) return false;

  
  if ('/' == css.charAt(0) && '*' == css.charAt(1)) {
    return matchComment();
  }

  var s = css.match(/^([^{]+)/);
  if (s !== null && s[0].indexOf(';') == -1) {
    return matchRule();
  }

  if (indexDeclaration > 0 && (indexRuleOpen == -1 || indexRuleOpen > indexDeclaration)) {
    return matchDeclaration();
  }
}


function matchNodes() {
  var nodes = [];
  var node = null;
  while (node = identifyParse()) {
    nodes.push(node);
  }
  return nodes;
}



/**
 * Trim `str`.
 */

function trim(str) {
  return str ? str.replace(/^\s+|\s+$/g, '') : '';
}



exports.parse = function(cssstr) {
  css = cssstr;
  AST['children'] = matchNodes();
  console.log(require('util').inspect(AST, { depth: null }));
};

exports.stringify = function(ast) {


};;
var cssString = require('fs').readFileSync('./test.css').toString();
exports.parse(cssString)
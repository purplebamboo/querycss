var AST = {
  type: 'root',
  children: []
};
var css = '';

/**
 * Positional.
 */

var lineno = 1;
var column = 1;

var indexRule = Number.MAX_VALUE;
var indexDeclaration = Number.MAX_VALUE;
var indexAt = Number.MAX_VALUE;



function updateIndex() {
  var indexRule = css.indexOf('{');
  var indexDeclaration = css.indexOf(':');
  //var indexAt = css.indexOf('@');
}
/**
 * Update lineno and column based on `str`.
 */

function updatePosition(str) {
  var lines = str.match(/\n/g);
  if (lines) lineno += lines.length;
  var i = str.lastIndexOf('\n');
  column = ~i ? str.length - i : column + str.length;
}

/**
 * Mark position and patch `node.position`.
 */

function position() {
  var start = {
    line: lineno,
    column: column
  };
  return function(node) {
    node.position = new Position(start);
    whitespace();
    return node;
  };
}

/**
 * Store position information for a node
 */

function Position(start) {
  this.start = start;
  this.end = {
    line: lineno,
    column: column
  };
  this.source = options.source;
}


function matchRules() {
  var rule;
  var nodes = [];
  whitespace();
  matchComments(nodes);
  while (css.length && css.charAt(0) != '}' && (rule = generateRule())) {
    if (rule !== false) {
      nodes.push(rule);
      matchComments(nodes);
    }
  }
  typeIdentify();
  return nodes;
}

function matchDeclarations() {
  var decls = [];

  if (!open()) return error("missing '{'");
  comments(decls);

  // declarations
  var decl;
  while (decl = generateDeclaration()) {
    if (decl !== false) {
      decls.push(decl);
      comments(decls);
    }
  }

  if (!close()) return error("missing '}'");
  return decls;
}


function matchComments(nodes) {
  var c;
  nodes = nodes || [];
  while (c = comment()) {
    if (c !== false) {
      nodes.push(c);
    }
  }
  return nodes;

}
/**
 * Parse rule.
 */

function generateRule() {
  var pos = position();
  var sel = selector();

  if (!sel) return error('selector missing');
  comments();

  return pos({
    type: 'rule',
    selectors: sel,
    childrens: matchDeclarations()
  });
}

/**
   * Parse declaration.
   */

  function generateDeclaration() {
    var pos = position();

    // prop
    var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
    if (!prop) return;
    prop = trim(prop[0]);
    // :
    if (!match(/^:\s*/)) return error("property missing ':'");

    // val
    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

    var ret = pos({
      type: 'declaration',
      property: prop.replace(commentre, ''),
      value: val ? trim(val[0]).replace(commentre, '') : ''
    });

    // ;
    match(/^[;\s]*/);

    return ret;
  }


/**
 * Parse comment.
 */

function comment() {
  var pos = position();
  if ('/' != css.charAt(0) || '*' != css.charAt(1)) return;

  var i = 2;
  while ("" != css.charAt(i) && ('*' != css.charAt(i) || '/' != css.charAt(i + 1)))++i;
  i += 2;

  if ("" === css.charAt(i - 1)) {
    return error('End of comment missing');
  }

  var str = css.slice(2, i - 2);
  column += 2;
  updatePosition(str);
  css = css.slice(i);
  column += 2;

  return pos({
    type: 'comment',
    comment: str
  });
}

function typeIdentify() {
  //只做 rule跟declaration
  updateIndex();

  if (indexRule > 0 && (indexDeclaration == -1 || indexDeclaration > indexRule)) {
    return matchRules();
  }
  if (indexDeclaration > 0 && (indexRule == -1 || indexRule > indexDeclaration)) {
    return matchDeclarations();
  }
  //match anything else, no matter what.
  //return matchAnything();

}
/**
 * Match `re` and return captures.
 */

function match(re) {
  var m = re.exec(css);
  if (!m) return;
  var str = m[0];
  updatePosition(str);
  css = css.slice(str.length);
  return m;
}

/**
 * Parse whitespace.
 */

function whitespace() {
  match(/^\s*/);
}

/**
 * Opening brace.
 */

function open() {
  return match(/^{\s*/);
}

/**
 * Closing brace.
 */

function close() {
  return match(/^}/);
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

exports.parse = function(cssstr) {
  css = cssstr;
  AST['children'] = typeIdentify();
}

exports.stringify = function(ast) {


}
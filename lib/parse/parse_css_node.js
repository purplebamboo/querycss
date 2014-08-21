
"use strict";

var AST = {
  type: 'root'
};
var css = '';
var ROOTNODE = new CssNode(AST,null);
// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027

var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;


/**
 * Error `msg`.
 */

function error(msg) {
  console.log(msg);
}

/**
 * Trim `str`.
 */

function trim(str) {
  return str ? str.replace(/^\s+|\s+$/g, '') : '';
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
    selectors: sel
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


function matchNodes(parentCssNode) {
  var nodes = [];
  var cssNodes = [];
  var curCssNode = null;
  var node = null;
  var index = 0;
  while (node = identifyParse()) {
    node['_index'] = index; 
    nodes.push(node);

    curCssNode = new CssNode(node,parentCssNode);

    //render child rule
    //console.log(node)
    if (node.type == 'rule') matchNodes(curCssNode);

    cssNodes.push(curCssNode);
    index ++;
  }
  parentCssNode.astObj['children'] = nodes;
  parentCssNode['children'] = cssNodes;

}


function CssNode(astObj,parentCssNode){
  this.astObj = astObj;
  this.parentCssNode = parentCssNode;
}

CssNode.prototype.parent =function(){

  return this.parentCssNode;

}

CssNode.prototype.children =function(){
  
  return this.children;

}

CssNode.prototype.prev =function(){
  var curIndex = this.astObj._index;
  if (curIndex === 0) return null;

  return this.parentCssNode[curIndex--]; 
}

CssNode.prototype.previousSibling =function(){
  var curIndex = this.astObj._index;
  if (curIndex === 0) return null;

  return this.parentCssNode.children.slice(0,curIndex); 
}

CssNode.prototype.next =function(){
  var curIndex = this.astObj._index;
  var length = this.parentCssNode.children.length;
  if (curIndex === length-1) return null;

  return this.parentCssNode[curIndex++]; 
  
}

CssNode.prototype.nextSibling =function(){
  var curIndex = this.astObj._index;
  var length = this.parentCssNode.children.length;
  if (curIndex === length-1) return null;

  return this.parentCssNode.children.slice(curIndex--); 
  
}


exports.parse = function(cssstr) {
  css = cssstr;
  matchNodes(ROOTNODE);
  return ROOTNODE;
}
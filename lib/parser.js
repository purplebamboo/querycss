
"use strict";


var _ = require('underscore');



// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027

var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;

var css = '';
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
    //node['_index'] = index; 
    nodes.push(node);

    curCssNode = new CssNode(node,parentCssNode);
    curCssNode['_index'] = index;

    if (node.type == 'rule') matchNodes(curCssNode);

    cssNodes.push(curCssNode);
    index ++;
  }

  parentCssNode['childrenCssNodes'] = cssNodes;

}


function CssNode(astObj,parentCssNode){

  this.astObj = astObj;
  this.parentCssNode = parentCssNode;

}

CssNode.prototype.parent =function(){

  return this.parentCssNode;

}

CssNode.prototype.children =function(){
  
  return this.childrenCssNodes;

}

CssNode.prototype.prev =function(){

  var curIndex = this._index;
  if (curIndex === 0) return null;

  return this.parentCssNode.children()[--curIndex]; 
}

CssNode.prototype.previousSibling =function(){

  var curIndex = this._index;
  if (curIndex === 0) return null;

  return this.parentCssNode.children().slice(0,curIndex); 
}

CssNode.prototype.next =function(){

  var curIndex = this._index;
  var length = this.parentCssNode.children().length;
  if (curIndex === length-1) return null;

  return this.parentCssNode.children()[++curIndex]; 
  
}

CssNode.prototype.nextSibling =function(){

  var curIndex = this._index;
  var length = this.parentCssNode.children().length;
  if (curIndex === length-1) return null;

  return this.parentCssNode.children().slice(--curIndex); 
  
}
CssNode.prototype._updateInfo =function(cssNodes){
  
  var self = this;
  _.each(cssNodes,function (v,k) {
    v._index = k;
    v.parentCssNode = self;
  })

}

//like array splice
CssNode.prototype.insert =function(){

  var self = this;

  var childrenNodes = self.children();

  Array.prototype.splice.apply(childrenNodes,_.toArray(arguments));
  self._updateInfo(childrenNodes);

}


CssNode.prototype.renderAst = function(){
  var getAst = function(cssNode){
    var curAstObj = _.clone(cssNode.astObj);
    var childrenNodes = cssNode.children();

    if(childrenNodes && childrenNodes.length > 0) curAstObj['children'] = [];
    _.each(childrenNodes,function(node,k){
      curAstObj['children'].push(getAst(node));

    })
    return curAstObj;
  }

  return getAst(this);
}

/*
CssNode.prototype.replaceWith =function(cssNodes){
  var self = this;
  var parentCssNode = self.parentCssNode;
  var curIndex = self._index;
  parentCssNode.insert([curIndex,1].concat(cssNodes));
  return cssNodes;

}

CssNode.prototype.remove =function(){
  var self = this;
  var parentCssNode = self.parentCssNode;
  var curIndex = self._index;
  parentCssNode.insert(curIndex,1);

}*/

/*CssNode.prototype.append =function(cssNodes){
  var self = this;
  var children = self.children();
  children = children.concat(cssNodes);
  self._updateIndex(children);

}

CssNode.prototype.preappend =function(cssNodes){
  var self = this;
  var children = self.children();
  children = cssNodes.concat(children);
  self._updateIndex(children);

}*/



module.exports = function(cssstr) {
  var AST = {
    type: 'root'
  };
  
  var rootNode = new CssNode(AST,null);
  css = cssstr;
  matchNodes(rootNode);
  return rootNode;
}
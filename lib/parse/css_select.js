
var fs = require('fs');
var _ = require('underscore');
var parseAst = require('./parse_css_node.js');

var CSSTRING = null;
var CSSNODE = null;


function Parser(str,options) {
  if (fs.existsSync(str)) {
    CSSTRING = fs.readFileSync(str).toString();
  }else{
    CSSTRING = str;
  }
  
  CSSNODE = parseAst(CSSTRING);

  return new CssNodeList([CSSNODE]);
}

function CssNodeList(cssNodes){
  var self = this;
  self.length = cssNodes.length;

  _.each(cssNodes,function(v,k){
    self[k] = v;
  })

}

CssNodeList.prototype.getNodes = function(){
  var self = this;
  if (self.length == 0) return [];

  var nodeArray = [];
  for (var i = self.length - 1; i >= 0; i--) {
    nodeArray.push(self[i])
  }
  return nodeArray;
}
CssNodeList.prototype.find = function(regName) {
  var self = this;
  var cssNodes = [];
  var reg = new RegExp(regName,"i");
  var _match = function(node){
    if (node.type == 'rule') {
      return reg.test(node.selectors.join(','));

    }else if(node.type == 'comment'){
      return reg.test(node.comment);

    }else if(node.type == 'declaration'){
      return reg.test([node.property,node.value].join(":"));

    }
    return false;
    
  }
  var _findNodes = function(nodes){
   
    _.each(nodes,function(node,k){
      if (_match(node)) {
        cssNodes.push(node);
      }
      if (node.children && node.children.length > 0) _findNodes(node.children);
    })
  }
  _findNodes(self.getNodes());
  
  return new CssNodeList(cssNodes);
}

CssNodeList.prototype.next = function(str) {
  
}

CssNodeList.prototype.prev = function(str) {
  
}

CssNodeList.prototype.parent = function(str) {
  
}

CssNodeList.prototype.children = function(str) {
  
}

/*使用字符串替换当前节点*/
CssNodeList.prototype.replaceWith = function(str) {
  
}

CssNodeList.prototype.insertBefore = function(str) {
  
}

CssNodeList.prototype.insertAfter = function(str) {
  
}

/*将 node 追加到 parent 子节点最后.*/
CssNodeList.prototype.append = function(str) {
  
}

/*将 node 追加到 parent 子节点最前.*/
CssNodeList.prototype.preappend = function(cssnode) {

}

/*删除节点.*/
CssNodeList.prototype.remove = function(str) {
  
}

return Parser;
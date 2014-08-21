
var Node = function(css,helper){
  this.css = css;
  this.helper = helper;
}

Node.prototype.isMatch = function() {
  //var node = false;
  if (this.css.length) {
    return true;
  }
  return false;
}

Node.prototype._walk = function() {
  return {}
}


Node.prototype.walk = function() {
  var self = this;
  var nodes = [];
  var node = false;
  self.helper.whitespace();
  while (node = self._walk()) {
      nodes.push(node);
  }
  return nodes;
}

module.exports = Node;
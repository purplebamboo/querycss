var fs = require('fs');
var _ = require('underscore');
var parseAst = require('./lib/parser.js');
var compiler = require('./lib/compiler.js')

var CSSTRING = null;
var CSSNODE = null;


function QueryCss(str, options) {
	if (fs.existsSync(str)) {
		CSSTRING = fs.readFileSync(str).toString();
	} else {
		CSSTRING = str;
	}

	CSSNODE = parseAst(CSSTRING);

	return new CssNodeList([CSSNODE]);
}

function CssNodeList(cssNodes) {
	var self = this;
	self.length = cssNodes.length;

	_.each(cssNodes, function(v, k) {
		self[k] = v;
	})

}

CssNodeList.prototype.getNodes = function() {
	var self = this;
	if (self.length == 0) return [];

	var nodeArray = [];
	for (var i = self.length - 1; i >= 0; i--) {
		nodeArray.push(self[i])
	}
	return nodeArray;
}

CssNodeList.prototype._match = function(reg, node) {
	if (node.type == 'rule') {
		return reg.test(node.selectors.join(','));

	} else if (node.type == 'comment') {
		return reg.test(node.comment);

	} else if (node.type == 'declaration') {
		return reg.test([node.property, node.value].join(":"));

	}
	return false;

}


CssNodeList.prototype.find = function(regName) {
	var self = this;
	var cssNodes = [];
	var reg = new RegExp(regName, "i");
	var _findNodes = function(nodes) {

		_.each(nodes, function(node, k) {
			debugger
			if (self._match(reg, node.astObj)) {
				cssNodes.push(node);
			}
			if (node.children() && node.children().length > 0) _findNodes(node.children());
		})
	}
	_findNodes(self.getNodes());

	return new CssNodeList(cssNodes);
}

CssNodeList.prototype._connect = function(str, type) {
	var returnNodes = [];
	var self = this;
	var nodes = this.getNodes();
	var _walk = function(node) {
		var curNode = node;
		while (curNode) {
			curNode = curNode[type]();
			if (self._match(new RegExp(str), curNode.astObj)) {
				break;
				
			}
		}
		return curNode;
	}
	var _excFn = !str ? function(cssnode) {

		returnNodes.push(cssnode[type]());

	} : function(cssnode) {

		var rNode = _walk(cssnode);

		if (!!rNode) returnNodes.push(rNode);

	}
	_.each(nodes, function(cssnode, k) {
		var result = cssnode[type]();
		if (!result) return;

		_excFn(cssnode);

	})
	return new CssNodeList(returnNodes);

}

CssNodeList.prototype.item = function(index) {

	var nodes = this.getNodes();

	if (nodes.length == 0 || index < 0 || index > nodes.length - 1) return;

	return new CssNodeList([nodes[index]]);

}

CssNodeList.prototype.next = function(str) {

	return this._connect(str, 'next');

}

CssNodeList.prototype.prev = function(str) {

	return this._connect(str, 'prev');

}
CssNodeList.prototype.parent = function(str) {

	return this._connect(str, 'parent');

}

CssNodeList.prototype.children = function(str) {
	var returnNodes = [];
	var self = this;
	var nodes = this.getNodes();

	var _excFn = !str ? function(cssnode) {

		returnNodes = returnNodes.concat(cssnode.children());

	} : function(cssnode) {

		var nodeList = [];
		var reg = new RegExp(str, "i"); 

		_.each(cssnode.children(), function(node, k) {
			if (self._match(reg, node.astObj)) {
				nodeList.push(node);
			}
		})

		if (nodeList.length > 0) returnNodes = returnNodes.concat(nodeList);

	}
	_.each(nodes, function(cssnode) {

		var result = cssnode.children();
		if (!result || result.length == 0) return;

		_excFn(cssnode);

	})

	return new CssNodeList(returnNodes);

}

/*使用字符串替换当前节点*/
CssNodeList.prototype.replaceWith = function(str) {
	var self = this;
	var nodes = this.getNodes();
	var returnNodes = [];

	var _replaceWith = function(curnode) {
		var parentCssNode = curnode.parentCssNode;
		var curIndex = curnode._index;
		var newCssnodes = parseAst(str).children();
		returnNodes = returnNodes.concat(newCssnodes);
		parentCssNode.insert.apply(parentCssNode, [curIndex, 1].concat(newCssnodes));
	}

	_.each(nodes, function(cssnode, k) {
		_replaceWith(cssnode);
	})

	return new CssNodeList(returnNodes);
}

CssNodeList.prototype.insertBefore = function(targetCssNodeList,remove) {
	var self = this;
	var nodes = this.getNodes();

	_.each(targetCssNodeList, function(targetCssNode) {
		var parent = targetCssNode.parentCssNode;
		var targetIndex = targetCssNode._index;
		var cloneNodes = _.clone(nodes);
		parent.insert.apply(parent, [targetIndex, 0].concat(cloneNodes));

	})
	remove && self.remove();

}

CssNodeList.prototype.insertAfter = function(targetCssNodeList,remove) {
	var self = this;
	var nodes = this.getNodes();

	_.each(targetCssNodeList, function(targetCssNode) {
		var parent = targetCssNode.parentCssNode;
		var targetIndex = targetCssNode._index;
		var cloneNodes = _.clone(nodes);
		parent.insert.apply(parent, [targetIndex, 0].concat(cloneNodes));

	})
	remove && self.remove();

}

CssNodeList.prototype.append = function(str) {
	var nodes = this.getNodes();

	_.each(nodes, function(cssNode, k) {
		if (!cssNode.children()) return;
		var l = cssNode.children().length;
		var newCssnodes = parseAst(str).children();
		cssNode.insert.apply(cssNode, [l, 0].concat(newCssnodes));
	})
	return new CssNodeList(nodes);

}

CssNodeList.prototype.preappend = function(str) {
	var nodes = this.getNodes();
	_.each(nodes, function(cssNode, k) {
		var newCssnodes = parseAst(str).children();
		cssNode.insert.apply(cssNode, [0, 0].concat(newCssnodes));
	})
	return new CssNodeList(nodes);

}

/*删除节点.*/
CssNodeList.prototype.remove = function() {
	var nodes = this.getNodes();
	var _remove = function(curnode) {
		var parentCssNode = curnode.parentCssNode;
		var curIndex = curnode._index;
		parentCssNode.insert.apply(parentCssNode, [curIndex, 1]);
	}
	_.each(nodes, function(cssnode, k) {
		_remove(cssnode);
	})

}

CssNodeList.prototype.stringify = function(options) {
	var cssString = '';
	var nodes = this.getNodes();
	var c = new compiler(options);
	_.each(nodes, function(node) {
		cssString += c.compile(node.renderAst());
	})
	return cssString;

}

module.exports = QueryCss;
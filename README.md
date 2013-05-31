Yggdrasil
==========

![Screenshot](https://raw.github.com/robotacon/Yggdrasil/master/logo.png)

SVG tree list graph visualization using MooTools.

How to use
----------

Use in the following manner:

	window.addEvent('domready', function() {

		var diagram = new TreeDiagram(400,400).inject($('renderer'));
		
		var root = new Component(diagram,200,50,"root caption",{x: 100, y: 100}).makeDraggable();
		
		var childA = new Component(diagram,200,50,"child A").makeDraggable().connectTo(root);
		var childB = new Component(diagram,200,50,"child B").makeDraggable().connectTo(root)
		var childC = new Component(diagram,200,50,"child C").makeDraggable().connectTo(childB);
		
	}); 

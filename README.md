Yggdrasil
<<<<<<< HEAD
==========

SVG tree list graph visualization.

How to use
----------

Use in the following manner:

	window.addEvent('domready', function() {

		var diagram = new TreeDiagram(400,400).inject($('renderer'));
		
		var root = new Component(diagram,200,50,"root caption",{x: 100, y: 100}).makeDraggable();
		
		var childA = new Component(diagram,200,50,"child A").makeDraggable();
		var childB = new Component(diagram,200,50,"child B").makeDraggable()
		root.addToList(childA).addToList(childB);
		
		var childC = new Component(diagram,200,50,"child C").makeDraggable()
		childB.addToList(childC);
		
	}); 
>>>>>>> Yggdrasil/master

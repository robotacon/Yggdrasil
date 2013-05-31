/*
---
script: Yggdrasil.js

name: Yggdrasil

description: SVG tree list graph visualization originally create to draw behavior trees.

license: MIT-style license.

authors: Tor Viktorsson

requires: core/1.2.5: '*'

provides: [ TreeDiagram, Component, ComponentText, SnapConnector, PathConnector, SvgElement, SvgDrag ]

disclaimer: >
 SvgElement implementation is a butchered version of Element 
 and SvgDrag is the corresponding cut up version of Drag. 

...
*/

Document.implement({
	newSvgElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		return document.id(this.createElementNS('http://www.w3.org/2000/svg', tag)).set(props);
	}
});

var SvgElement = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);
	if (!props) props = {};
	return document.newSvgElement(tag, props);
};

var SvgDrag = new Class({

	Implements: [Events, Options],

	options: {/*
		onBeforeStart: function(thisElement){},
		onStart: function(thisElement, event){},
		onSnap: function(thisElement){},
		onDrag: function(thisElement, event){},
		onCancel: function(thisElement){},
		onComplete: function(thisElement, event){},*/
		snap: 6,
		unit: 'px',
		grid: false,
		limit: false,
		handle: false,
		invert: false,
		preventDefault: false,
		stopPropagation: false,
		modifiers: {x: 'x', y: 'y'}
	},

	initialize: function(shape, options){
		this.shape = shape;
		this.element = document.id(shape.toElement());
		this.document = this.element.getDocument();
		this.setOptions(options || {});
		var htype = typeOf(this.options.handle);
		this.handles = ((htype == 'array' || htype == 'collection') ? $$(this.options.handle) : document.id(this.options.handle)) || this.element;
		this.mouse = {'now': {}, 'pos': {}};
		this.value = {'start': {}, 'now': {}};

		this.selection = (Browser.ie) ? 'selectstart' : 'mousedown';

		if (Browser.ie && !SvgDrag.ondragstartFixed){
			document.ondragstart = Function.from(false);
			SvgDrag.ondragstartFixed = true;
		}

		this.bound = {
			start: this.start.bind(this),
			check: this.check.bind(this),
			drag: this.drag.bind(this),
			stop: this.stop.bind(this),
			cancel: this.cancel.bind(this),
			eventStop: Function.from(false)
		};
		this.attach();
	},

	attach: function(){
		this.handles.addEvent('mousedown', this.bound.start);
		return this;
	},

	detach: function(){
		this.handles.removeEvent('mousedown', this.bound.start);
		return this;
	},

	start: function(event){
		var options = this.options;

		if (event.rightClick) return;

		if (options.preventDefault) event.preventDefault();
		if (options.stopPropagation) event.stopPropagation();
		this.mouse.start = event.page;

		this.fireEvent('beforeStart', this.element);

		var limit = options.limit;
		this.limit = {x: [], y: []};

		var z, coordinates;
		for (z in options.modifiers){
			if (!options.modifiers[z]) continue;

			this.value.now[z] = this.shape[options.modifiers[z]];

			if (options.invert) this.value.now[z] *= -1;

			this.mouse.pos[z] = event.page[z] - this.value.now[z];

			if (limit && limit[z]){
				var i = 2;
				while (i--){
					var limitZI = limit[z][i];
					if (limitZI || limitZI === 0) this.limit[z][i] = (typeof limitZI == 'function') ? limitZI() : limitZI;
				}
			}
		}

		if (typeOf(this.options.grid) == 'number') this.options.grid = {
			x: this.options.grid,
			y: this.options.grid
		};

		var events = {
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		};
		
		events[this.selection] = this.bound.eventStop;
		this.document.addEvents(events);
	},

	check: function(event){
		if (this.options.preventDefault) event.preventDefault();
		var distance = Math.round(Math.sqrt(Math.pow(event.page.x - this.mouse.start.x, 2) + Math.pow(event.page.y - this.mouse.start.y, 2)));
		if (distance > this.options.snap){
			this.cancel();
			this.document.addEvents({
				mousemove: this.bound.drag,
				mouseup: this.bound.stop
			});
			this.fireEvent('start', [this.element, event]).fireEvent('snap', this.element);
		}
	},

	drag: function(event){
		var options = this.options;

		if (options.preventDefault) event.preventDefault();
		this.mouse.now = event.page;
		
		for (z in options.modifiers){
			if (!options.modifiers[z]) continue;

			this.value.now[z] = this.mouse.now[z] - this.mouse.pos[z];

			if (options.invert) this.value.now[z] *= -1;

			if (options.limit && this.limit[z]){
				if ((this.limit[z][1] || this.limit[z][1] === 0) && (this.value.now[z] > this.limit[z][1])){
					this.value.now[z] = this.limit[z][1];
				} else if ((this.limit[z][0] || this.limit[z][0] === 0) && (this.value.now[z] < this.limit[z][0])){
					this.value.now[z] = this.limit[z][0];
				}
			}

			if (options.grid[z]) this.value.now[z] -= ((this.value.now[z] - (this.limit[z][0]||0)) % options.grid[z]);
		}
		
		this.shape.moveTo(this.value.now);

		this.fireEvent('drag', [this.element, event]);
	},

	cancel: function(event){
		this.document.removeEvents({
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		});
		if (event){
			this.document.removeEvent(this.selection, this.bound.eventStop);
			this.fireEvent('cancel', this.element);
		}
	},

	stop: function(event){
		var events = {
			mousemove: this.bound.drag,
			mouseup: this.bound.stop
		};
		events[this.selection] = this.bound.eventStop;
		this.document.removeEvents(events);
		if (event) this.fireEvent('complete', [this.element, event]);
	}

});

var TreeDiagram = new Class({
	Implements: Options,   
	options: {
		version: '1.1'
	},
	
    initialize: function(width, height, options){
        this.width = width;
        this.height = height;
		this.setOptions(options);
		if(!this.options.viewbox) {
			this.options.viewbox = '0 0 ' + this.width + ' ' + this.height;
		}
		this.element = new SvgElement("svg",Object.append({width:width,height:height},this.options));
    },
	
	inject: function(element) {
		this.element.inject(element);
		return this;
	},
	
	toElement: function(){
		return this.element;
	}
});

var Component = new Class({
	Implements: Options,    
	options: {
		fill: 'white',
		stroke: 'black',
		'stroke-width' : 2,
		rx: 5
	},
	
    initialize: function(diagram, width, height, text, options){
        this.x = 0;
        this.y = 0;
		this.stack = true;
		
		this.diagram = diagram;
        this.width = width;
        this.height = height;
		this.setOptions(options);
		
		this.parent = false;
		this.isLastChild = true;
		this.listners = [];
		this.children = [];
		
		if(options) {
			if(options.x) this.x = options.x;			
			if(options.y) this.y = options.y;			
		}
		
		this.element = new SvgElement("rect",Object.append({x:this.x,y:this.y,width:this.width,height:this.height},this.options));		
		this.element.inject(this.diagram.element);
		this.text = new ComponentText(this,text,{fill: this.options.stroke});
		
		this.updateConnections();
    },
	
	makeDraggable: function() {
		this.drag = new SvgDrag(this, {onDrag: this.updateConnections.bind(this)});
		return this;
	},
	
	addListner: function(listner) {
		this.listners.push(listner);
	},
	
	moveTo: function(position) {
		if( (this.x != position.x) || (this.y != position.y)) {
			this.x = position.x;
			this.y = position.y;
			this.update();
		}		
		return this;
	},
	
	align: function(){
		if(this.parent) {
			this.moveTo({x: this.parent.x + this.parent.width / 2, y: this.parent.y + this.parent.height * 2});
		}
		return this;
	},
	
	update: function() {
		this.element.setAttributeNS(null,'x',this.x);
		this.element.setAttributeNS(null,'y',this.y);
		this.updateConnections();
	},
	
	updateConnections: function() {
		this.entry = [];
		this.entry[0] = {x: this.centerX(), y: this.topY()};
		this.entry[1] = {x: this.rightX(), y: this.centerY()};
		this.entry[2] = !this.stack ? {x: this.centerX(), y: this.bottomY()} : false;
		this.entry[3] = {x: this.leftX(), y: this.centerY()};
				
		this.exit = [];
		this.exit[0] = !this.stack ? {x: this.centerX(), y: this.topY()} : false;
		this.exit[1] = {x: this.rightX(), y: this.centerY()};
		this.exit[2] = !this.stack || this.isLastChild ? {x: this.centerX(), y: this.bottomY()} : false;
		this.exit[3] = {x: this.leftX(), y: this.centerY()};
		
		this.updateListners();
	},
	
	updateListners: function() {
		this.text.update();
		this.listners.each(function(listner){
			listner.update();
		});
	},
	
	leftX: function(){return this.x;},
	centerX: function(){return this.x+this.width/2;},
	rightX: function(){return this.x + this.width;},

	topY: function(){return this.y;},
	centerY: function(){return this.y+this.height/2;},
	bottomY: function(){return this.y + this.height;},
	
	connect: function(child) {	
		
		child.parent = this;
		if(child.x == 0 && child.y == 0) {
			child.align();
		}
		
		var lastChild = this.children.getLast();
		if(lastChild) {
			if(this.stack) {
				new SnapConnector(lastChild,child);
			} else {
				new PathConnector(this,child);
			}
			lastChild.isLastChild = false;
			lastChild.updateConnections();
		} else {
			new PathConnector(this,child);
		}
		
		this.children.push(child);
		child.isLastChild = true;
		child.updateConnections();
		this.updateConnections();
		return this;
	},
	
	connectTo: function(parent) {	
		parent.connect(this);
		return this;
	},
	
	toElement: function(){
		return this.element;
	}
});

var ComponentText = new Class({
	Implements: Options,
	options: {
		fill: 'black',
		'text-anchor': 'middle'
	},
	
    initialize: function(parent,text, options){
		this.parent = parent;
		this.text = text;
		this.setOptions(options);
		
		this.x = this.parent.centerX();
		this.y = this.parent.centerY();
		
		this.element = new SvgElement("text",Object.append({x:this.x,y:this.y, text: text},this.options));
		this.element.inject(this.parent.diagram.element);
	},
	
	update: function() {
		this.x = this.parent.centerX();
		this.y = this.parent.centerY();
		this.element.setAttributeNS(null,'x',this.x);
		this.element.setAttributeNS(null,'y',this.y);
		// visualizing coordinates 
		// this.element.set('text',this.text + ' ' + parseInt(this.x) + ':' + parseInt(this.y));
	},
	
	toElement: function(){
		return this.element;
	}
});

var SnapConnector = new Class({
	Implements: Options,
	options: {
	},
	
    initialize: function(from,to,options){
        this.from = from;
        this.to = to;
		
		from.addListner(this);
		to.addListner(this);
		
		this.setOptions(options);
		this.update();
    },
	
	update: function() {
		this.to.moveTo({x: this.from.leftX(),y: this.from.bottomY()});
	},
	
	toElement: function(){
		return this.element;
	}
});

var PathConnector = new Class({
	Implements: Options,
	options: {
		fill: 'none',
		stroke: 'black',
		'stroke-width' : 1
	},
	
    initialize: function(from,to,options){
        this.from = from;
        this.to = to;
		
		from.addListner(this);
		to.addListner(this);
		
		this.setOptions(options);
		
		var path = this.closestPath();
		
		this.line = "M "+path.from.x+" "+path.from.y+" C "+path.fromCurve.x+" "+path.fromCurve.y + " "+path.toCurve.x+" "+path.toCurve.y + " "+path.to.x+" "+path.to.y;
		this.element = new SvgElement("path",Object.append({d:this.line},this.options));
		this.element.inject(from.diagram.element);
    },
	
	update: function() {
		var path = this.closestPath();
		this.line = "M "+path.from.x+" "+path.from.y+" C "+path.fromCurve.x+" "+path.fromCurve.y + " "+path.toCurve.x+" "+path.toCurve.y + " "+path.to.x+" "+path.to.y;
		this.element.setAttributeNS(null,'d',this.line);
	},
	
	closestPath: function() {
		var shortestPsudoLength = -1, closestFrom = -1, closestTo = -1; 
		for(var fi=0; fi<4; fi++) {
			var fromPoint = this.from.exit[fi];
			if(fromPoint) {
				for(var ti=0; ti<4; ti++) {
					var toPoint = this.to.entry[ti];
					if(toPoint) {
						var xVector = Math.abs(fromPoint.x - toPoint.x);
						var yVector = Math.abs(fromPoint.y - toPoint.y);
						var psudoLength = xVector * xVector + yVector * yVector;
						if((fi == 0 && ti == 2) || (fi == 2 && ti == 0) || (fi == 1 && ti == 3) || (fi == 3 && ti == 1)) {
							psudoLength *= 1.5;
						}
						if((shortestPsudoLength == -1) || (psudoLength<shortestPsudoLength)) {
							closestFrom = fi;
							closestTo = ti;
							shortestPsudoLength = psudoLength;
						}
					}
				}
			}
		}
		
		var fromPoint = this.from.exit[closestFrom];
		var toPoint = this.to.entry[closestTo];
		
		var deltaX = Math.max(Math.abs(fromPoint.x - toPoint.x) / 2, 20);
		var deltaY = Math.max(Math.abs(fromPoint.y - toPoint.y) / 2, 20);
		
		var fromCurve = {x: fromPoint.x, y: fromPoint.y};
		var toCurve = {x: toPoint.x, y: toPoint.y};
		switch(closestFrom) {
			case 0: fromCurve.y -= deltaY; break;
			case 1: fromCurve.x += deltaX; break;
			case 2: fromCurve.y += deltaY; break;
			case 3: fromCurve.x -= deltaX; break;
		}
		switch(closestTo) {
			case 0: toCurve.y -= deltaY; break;
			case 1: toCurve.x += deltaX; break;
			case 2: toCurve.y += deltaY; break;
			case 3: toCurve.x -= deltaX; break;
		}
		
		return {from: fromPoint, fromCurve: fromCurve, toCurve: toCurve, to: toPoint};
	},
	
	toElement: function(){
		return this.element;
	}
});
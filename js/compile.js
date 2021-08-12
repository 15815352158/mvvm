function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el); // document.querySelector: 类似jquery访问

    if (this.$el) {		
		
        this.$fragment = this.node2Fragment(this.$el); //创建碎片,目的是少更新UI
        this.init();			
        this.$el.appendChild(this.$fragment);   //修改完一次更新UI		
    }
}

Compile.prototype = {
    constructor: Compile,
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment();
        var   child;

        // 将原生节点从e1中移走在添加到碎片fragment中
        while (child = el.firstChild) {			
            fragment.appendChild(child);				
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        var childNodes = el.childNodes; //获取el的子节点集合
        var    me = this;
		// [].slice.call(childNodes) 这里是将childNodes伪数组转换为数组
		
        [].slice.call(childNodes).forEach(function(node) { //遍历每一个子节点
            var text = node.textContent; 
            var reg = /\{\{(.*)\}\}/;

			console.log("text----:",text);

            if (me.isElementNode(node)) { //是否为元素节点
                me.compile(node);

            } else if (me.isTextNode(node) && reg.test(text)) { //是否为文本节点,并且是{{var}}内容
            	//console.log("text--:["+text+"]");
				//console.log("text==:["+RegExp.$1.trim()+"]");
				// RegExp.$1 : 上一个正则表达式匹配的内容,也就是 reg.test(text)匹配后{{var}} 中的var
				me.compileText(node, RegExp.$1.trim());
            }

            if (node.childNodes && node.childNodes.length) { //子节点
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes;//获取node节点的属性结合
        var me = this;
		//[].slice.call(nodeAttrs) 这里是将nodeAttrs伪数组转换为数组
        [].slice.call(nodeAttrs).forEach(function(attr) { 
            var attrName = attr.name; //属性名称
			
            if (me.isDirective(attrName)) { //这里是查找v-开头的属性
                var exp = attr.value; //属性的值, eg: <div v-on:click='hh' /> , 那么v-on:click为其中的一个属性名称,对应的属性值为'hh'
                var dir = attrName.substring(2);//dir=on:click 或者 model
                // 事件指令
                if (me.isEventDirective(dir)) { //匹配的是事件, dir=v-on:click 等
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    
                } else {
                	 // 普通指令
                	 //compileUtil:是一个json对象, compileUtil[dir]:表示compileUtil的一个节点名称等于dir变量值的节点
					 //比如 v-model="someStr" 
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

				console.log("removeAttribute:",node," attrName:",attrName);

                node.removeAttribute(attrName); //删除v-开头的属性
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text'); //v-text
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');//v-html
    },

    model: function(node, vm, exp) {
    	console.log("vm-->",vm);
		console.log("exp-->",exp);
        this.bind(node, vm, exp, 'model');//v-model

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) { //这里添加
			console.log("---------input--event------e:",e);
            var newValue = e.target.value; //触发事件的目标值,修改后的新值
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue); //通过UI里面元素的值发生变化之后反过来修改数据的值
            val = newValue;
        });
    },

    class: function(node, vm, exp) {    		
        this.bind(node, vm, exp, 'class');
    },

    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];

        updaterFn && updaterFn(node, this._getVMVal(vm, exp)); //这里是一开始给UI节点赋值

		console.log("exp????:",exp);

        new Watcher(vm, exp, function(value, oldValue) {  //创建一个观察者,观察者发现者有变化就会调用此回调函数更新UI
            updaterFn && updaterFn(node, value, oldValue);
        });

    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1];  //eventType=click等
			//这里注意,javascript中 逻辑与的结果不一定是逻辑值,逻辑与(&&)的返回值: 如果左边表到时非0,非null,非undefined,非空字符串时候,返回值为右边表达式, 否则为左边的表达式
			// 逻辑或(||) 左边表到时非0,非null,非undefined,非空字符串时候, 返回左边表达式,否则返回右边表达式
        var  fn = vm.$options.methods && vm.$options.methods[exp];  //这里fn=vm.$options.methods[exp], 是一个函数,并非true或flase

        if (eventType && fn) { //表明为v-xx:这种形式
        	//这里给对应的节点添加事件监听函数, 下面函数第三个参数,默认为false: 表明是冒泡响应,true:捕获响应
            node.addEventListener(eventType, fn.bind(vm), false); 
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.'); 

		console.log("--vm:",vm);
		console.log("--exp:",exp);
        exp.forEach(function(k) {
            val = val[k];//这里用得相当经典  , 例如; exp=child.someStr ,执行下面forEach之后,val=vm[child][someStr]
            console.log("val:",val);
			if(!val)
			{
				return val;
			}
        });
		
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};


var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater: function(node, value, oldValue) {      	
        node.className =  typeof value == 'undefined' ? '' : value;		
    },

    modelUpdater: function(node, value, oldValue) {
    	//这里将data里面的数据赋值给ui中节点的value
        node.value = typeof value == 'undefined' ? '' : value;
		console.log("把data里面的数据赋值给ui中v-mode对应的value");
		console.log("node:",node);
		console.log("value:",value);
		console.log("oldValue:",oldValue);
    }
};
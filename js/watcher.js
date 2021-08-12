function Watcher(vm, expOrFn, cb) {
    this.cb = cb;
    this.vm = vm;
    this.expOrFn = expOrFn;
    this.depIds = {};

	console.log("expOrFn:",expOrFn," watcher type:",typeof expOrFn );
    if (typeof expOrFn === 'function') {
		console.log("------>>>function:",expOrFn);
        this.getter = expOrFn;
    } else {
        this.getter = this.parseGetter(expOrFn.trim());
    }

	console.log("=======!!!1====Dep.target=====",Dep.target);
    this.value = this.get(); //调用一次get函数,get函数中会调用上面的 this.getter函数
    console.log("=======!!!2====Dep.target=====",Dep.target);
}

Watcher.prototype = {
    constructor: Watcher,
    update: function() {
    	console.log("-----update----");
        this.run();
    },
    run: function() {
        var value = this.get();
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);  // call是预定义函数, 这个是修改this.cb函数体类的this指针变为this.vm
            //这个函数会更新UI中对应元素的值
        }
    },
    addDep: function(dep) {
    	
        // 1. 每次调用run()的时候会触发相应属性的getter
        // getter里面会触发dep.depend()，继而触发这里的addDep
        // 2. 假如相应属性的dep.id已经在当前watcher的depIds里，说明不是一个新的属性，仅仅是改变了其值而已
        // 则不需要将当前watcher添加到该属性的dep里
        // 3. 假如相应属性是新的属性，则将当前watcher添加到新属性的dep里
        // 如通过 vm.child = {name: 'a'} 改变了 child.name 的值，child.name 就是个新属性
        // 则需要将当前watcher(child.name)加入到新的 child.name 的dep里
        // 因为此时 child.name 是个新值，之前的 setter、dep 都已经失效，如果不把 watcher 加入到新的 child.name 的dep中
        // 通过 child.name = xxx 赋值的时候，对应的 watcher 就收不到通知，等于失效了
        // 4. 每个子属性的watcher在添加到子属性的dep的同时，也会添加到父属性的dep
        // 监听子属性的同时监听父属性的变更，这样，父属性改变时，子属性的watcher也能收到通知进行update
        // 这一步是在 this.get() --> this.getVMVal() 里面完成，forEach时会从父级开始取值，间接调用了它的getter
        // 触发了addDep(), 在整个forEach过程，当前wacher都会加入到每个父级过程属性的dep
        // 例如：当前watcher的是'child.child.name', 那么child, child.child, child.child.name这三个属性的dep都会加入当前watcher
        if (!this.depIds.hasOwnProperty(dep.id)) {

			console.log("addDep:",dep);
            dep.addSub(this);//添加本观察者为订阅者
            this.depIds[dep.id] = dep;
        }
    },
    get: function() {
    
        Dep.target = this;   //这里赋值之后,才会添加订阅者, 暂时把观察者存起来.在订阅者对象中才可以访问
        var value = this.getter.call(this.vm, this.vm);
        Dep.target = null;  //添加完成之后,重新赋值null,保证只添加一次订阅者,避免对data中的某个属性重复添加相同的订阅者;
		
        return value;
    },

    parseGetter: function(exp) {
        if (/[^\w.$]/.test(exp)) return; 

        var exps = exp.split('.');

		console.log("-----------parseGetter-------------");

        return function(obj) {  //这里返回一个函数
        	console.log("666 exps:",exps," obj:",obj);
            for (var i = 0, len = exps.length; i < len; i++) {
                if (!obj) return;
                obj = obj[exps[i]]; //这里其实会触发MVVM中对应代理data中的属性的get函数,get函数有添加订阅者
            }
            return obj;
        }
    }
};
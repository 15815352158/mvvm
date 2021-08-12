function Observer(data) {

	console.log("data:",data);
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    constructor: Observer,
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) { //这里遍历data的每一个key
        	console.log("key:",key," data[key]:",data[key]);
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },

    defineReactive: function(data, key, val) {
        var dep = new Dep(); // 创建一个订阅者对象

		console.log("val---:",val);
        var childObj = observe(val); //递归遍历子节点,直到遍历完每一个枝叶节点

        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) {					
                    dep.depend();  //添加订阅者				
                }

				console.log("????????????Dep.target:"+Dep.target+" key:"+key+" val:"+val);
                return val;
            },
            set: function(newVal) {
                if (newVal === val) {
                    return;
                }

				console.log("set:","newVal=",newVal," OldVal:",val);
				
                val = newVal;
				
                // 新的值是object的话，进行监听
                childObj = observe(newVal); // 如果修改一个对象的值时候,要遍历一下这个对象下面的所有节点
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {

	console.log("****1value:",value," typeof:",typeof value);
    if (!value || typeof value !== 'object') {
        return;
    }
	console.log("****2value:",value);
    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);//这里的sub其实是观察者,观察者作为订阅对象
    },

    depend: function() {
        Dep.target.addDep(this); //这里调用观察者的addDep函数将本订阅者作为参数传递到观察者
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null; //给类定义静态变量,这个用于暂存观察者
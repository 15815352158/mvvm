function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理
    // 实现 this.xxx -> this._data.xxx ,这个也是比较经典, 把data节点中的数据直接映射为this的属性,这里实行方式是代理
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    this._initComputed(); //将computed中的方法通过this代理访问

	console.log("???data:",data);
    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this) //重新解释执行v-的标签属性,或者文本{{var}}
}

MVVM.prototype = {
    constructor: MVVM,
/*
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },
*/

    _proxyData: function(key, setter, getter) { //实现代理的方法
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {   //定义属性,给me这个对象定义key属性,key属性的描述为后面的json
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};
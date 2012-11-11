MathBox.Director = function (stage, script) {
  this._stage = stage;
  this.script = script;
  this.rollback = {};

  this.step = 0;
  this.lastCommand = 0;
};

MathBox.Director.prototype = {

  invert: function (op) {
    var stage = this._stage;

    var inverse = [];

    var verb = op[0],
        selector = op[1],
        options = op[2],
        animate = op[3],
        primitive;

    switch (verb) {
      case 'add':
        inverse.push([
          'remove',
          options.sequence || (MathBox.Primitive.sequence + 1),
        ]);
        break;

      case 'remove':
        targets = stage.select(selector);
        _.each(targets, function (primitive) {
          inverse.push([
            'add',
            primitive.type(),
            stage.get(primitive),
          ]);
        })
        break;

      case 'animate':
      case 'set':
        targets = stage.select(selector);
        _.each(targets, function (primitive) {
          var duration = animate && Math.min(300, animate.duration) || 300;
          inverse.push([
            verb,
            primitive.singleton || primitive.get('sequence'),
            stage.get(primitive),
            { duration: duration },
          ]);
        });
        break;
    }

    return inverse;
  },

  apply: function (step, rollback, instant) {
    var stage = this._stage;

    _.each(step, function (op) {
      var verb = op[0] || '',
          selector = op[1] || '',
          options = op[2] || {},
          animate = op[3] || {};

      if (rollback) {
        var inverse = this.invert(op);
        var args = [0, 0].concat(inverse);
        Array.prototype.splice.apply(rollback, args);
      }

      if (instant) {
        if (animate) {
          animate = _.extend({}, animate);
          animate.delay = 0;
          animate.duration = Math.min(300, animate.duration);
        }
        if (options) {
          options = _.extend({}, options);
          options.delay = 0;
          options.duration = Math.min(300, options.duration);
        }
      }

      switch (verb) {
        case 'add':
          var primitive = stage.spawn(selector, options, animate);
          break;

        case 'remove':
          _.each(stage.select(selector), function (primitive) {
            stage.remove(primitive, options);
          });
          break;

        case 'set':
          var targets = stage.select(selector);
          var array = options.constructor == Array;
          _.each(targets, function (target, i) {
            target.set(array ? options[i] : options);
          });
          break;

        case 'animate':
          var targets = stage.select(selector);
          var array = options.constructor == Array;
          _.each(targets, function (target, i) {
            var opts = array ? options[i] : options;
            stage.animate(target, opts, animate);
          });
          break;
      }
    }.bind(this));

    return this;
  },

  insert: function (script) {
    // Allow array of ops and single op
    if (script[0].constructor != Array) {
      script = [script];
    }

    // Insert step into the script and execute immediately.
    this.script.splice(this.step, 0, script);

    this.forward();

    return this;
  },

  go: function (step, instant) {
    if (!this.script.length) return;

    while (step < 0) step += this.script.length + 1;
    while (step >= this.script.length + 1) step -= this.script.length + 1;

    while (step > this.step) { this.forward(instant); }
    while (step < this.step) { this.back(instant); }
  },

  skipping: function () {
    var t = +new Date(), skip = false;
    if (t - this.lastCommand < 500) {
      skip = true;
    }
    this.stage().hurry('*');
    this.lastCommand = t;
    return skip;
  },

  forward: function (instant) {
    if (this.step >= this.script.length) return;

    var step = this.script[this.step];
    var rollback = this.rollback[this.step] = [];

    /*
    console.trace();
    console.profile('Director ' + this.step);
    //*/

    this.apply(step, rollback, instant || this.skipping());
    this.step++;

    /*
    setTimeout(function () {
      console.profileEnd();
    }, 500)
    //*/


    this.emit('go', this.step, 1);

    return this;
  },

  back: function (instant) {
    if (this.step <= 0) return;

    this.step--;
    this.apply(this.rollback[this.step], null, instant || this.skipping());
    delete this.rollback[this.step];

    this.emit('go', this.step, -1);

    return this;
  },

  stage: function () {
    return this._stage;
  },

};

// Proxy methods to stage, retain own chainability.
_.each(MathBox.Stage.prototype, function (f, key) {
  if (!MathBox.Director.prototype[key]) {
    MathBox.Director.prototype[key] = function () {
      var ret = this.stage[f].apply(this.stage, arguments);
      if (ret === this.stage) return this;
      return ret;
    };
  }
});

MicroEvent.mixin(MathBox.Director);


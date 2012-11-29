/**
 * MathBox Overlay
 *
 * Positions 2D labels on top of the scene and takes care of overlap.
 */
MathBox.Overlay = function () {
  var element = this.domElement = document.createElement('div');

  element.className = 'mathbox-overlay';

  this.sprites = [];
  this.v = new THREE.Vector3();
  this.q = new THREE.Vector3();
}

MathBox.Overlay.prototype = {

  size: function (width, height) {
    this.width = width;
    this.height = height;

    this.domElement.style.width = width +'px';
    this.domElement.style.height = height +'px';
  },

  add: function (object) {
    if (this.sprites.indexOf(object) != -1) return;
    this.sprites.push(object);

    if (!object.element.parentNode) {
      this.domElement.appendChild(object.element);
    }

    _.each(object.children, function (child) {
      this.add(child);
    }.bind(this))
  },

  remove: function (object) {
    var index;
    if ((index = this.sprites.indexOf(object)) == -1) return;
    this.sprites.splice(index, 1);

    if (object.element.parentNode) {
      object.element.parentNode.removeChild(object.element);
    }

    _.each(object.children, function (child) {
      this.remove(child);
    }.bind(this))
  },

  update: function (camera) {
		this.fov = 0.5 / Math.tan( camera.fov * Math.PI / 360 ) * this.height;

    // Iterate over individual objects for update
    _.each(this.sprites, function (sprite) {
      this._update(sprite, camera);
    }.bind(this));

    // Iterate over individual objects for measurement
    _.each(this.sprites, function (sprite) {
      this._measure(sprite, camera);
    }.bind(this));

    // Iterate over individual objects for measurement
    _.each(this.sprites, function (sprite) {
      this._vis(sprite, camera);
    }.bind(this));
  },

  _measure: function (object, camera) {
    // Measure sprites
    var element = object.element;
    object.width = element.offsetWidth;
    object.height = element.offsetHeight;
  },

  _vis: function (object, camera) {
    // If already hidden, ignore
    if (!object.visible) return;
    if (!object.width && !object.height) return;

    // Check visibility for each sprite relative to other visibles
    var ox1 = object.left,
        oy1 = object.top,
        ox2 = object.width + ox1,
        oy2 = object.height + oy1;

    // Iterate only sprites after this one
    found = false;
    _.each(this.sprites, function (sprite) {
      if (sprite === object) {
        found = true;
        return;
      }
      if (!found) return;
      if (!sprite.visible) return;

      var sx1 = sprite.left,
          sy1 = sprite.top,
          sx2 = sprite.width + sx1,
          sy2 = sprite.height + sy1;

      // Check for overlap in X or Y
      if (ox2 < sx1 || ox1 > sx2) return;
      if (oy2 < sy1 || oy1 > sy2) return;

      // Hide
      if (sprite.visible) {
        sprite.element.style.display = 'none';
        sprite.visible = false;
      }
    });
  },

  _update: function (object, camera) {
    var v = this.v,
        q = this.q,
        epsilon = 0.01;

    // Transform into camera space
    v.copy(object.position);
    camera.matrixWorldInverse.multiplyVector3(v);

    // Project to 2D and convert to pixels
    var x = -(v.x / v.z) * this.fov + this.width  * .5;
    var y =  (v.y / v.z) * this.fov + this.height * .5;

    // Add spacer
    if (object.distance) {
      // Add tangent and project again
      q.copy(object.tangent).multiplyScalar(epsilon);
      q.addSelf(object.position);
      camera.matrixWorldInverse.multiplyVector3(q);

      // Find difference and scale it
      q.subSelf(v);
      q.z = 0;
      q.normalize().multiplyScalar(object.distance);
      x += (q.y);
      y += (q.x);
    }

    // Round to avoid pixel fuzzyness
    x = Math.round(x);
    y = Math.round(y);

    // Set position and reset visibility
    object.left = x;
    object.top = y;
    object.element.style.left = x + 'px';
    object.element.style.top  = y + 'px';
    object.element.style.display = 'block';
    object.visible = true;

  },

};

MathBox.Sprite = function (element, tangent, distance) {
  this.element = element;
  this.tangent = tangent || new THREE.Vector3(1, 0, 0);
  this.distance = distance || 0;
  this.width = 0;
  this.height = 0;
  this.visible = true;

  element.style.position = 'absolute';
  element.style.left = 0;
  element.style.top = 0;

  THREE.Object3D.call(this);
}

MathBox.Sprite.prototype = _.extend(new THREE.Object3D(), {
  
});
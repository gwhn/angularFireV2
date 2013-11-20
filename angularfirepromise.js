(function (angular) {
  'use strict';

  function construct($q, $parse, $timeout, ref) {

    var that,
      bound,
      index = [],
      addedEvent = 'added',
      onAdded = [],
      movedEvent = 'moved',
      onMoved = [],
      changedEvent = 'changed',
      onChanged = [],
      removedEvent = 'removed',
      onRemoved = [],
      loadedEvent = 'loaded',
      onLoaded = [];

    if (!(ref instanceof window.Firebase)) {
      throw new Error('Provide a Firebase reference');
    }

    function AngularFire() {
      if (!(this instanceof AngularFire)) {
        return new AngularFire();
      }
      that = this;
    }

    function update() {
      if (!angular.equals(that, $parse(bound.name)(bound.scope))) {
        $parse(bound.name).assign(bound.scope, that);
      }
    }

    function broadcast(type, value) {
      var cbs,
        n,
        i,
        cb;
      switch (type) {
      case addedEvent:
        cbs = onAdded;
        break;
      case movedEvent:
        cbs = onMoved;
        break;
      case removedEvent:
        cbs = onRemoved;
        break;
      case changedEvent:
        cbs = onChanged;
        break;
      case loadedEvent:
        cbs = onLoaded;
        break;
      default:
        cbs = [];
        break;
      }
      n = cbs.length;
      for (i = 0; i < n; i += 1) {
        cb = cbs[i];
        if (typeof cb === 'function') {
          cb(value);
        }
      }
    }

    function attach() {
      ref.on('child_added', function (s) {
        var k = s.name(),
          v = s.val();
        $timeout(function () {
          that[k] = v;
          broadcast(addedEvent, that);
          if (bound) {
            update();
          }
        });
      });
      ref.on('child_moved', function (s) {
        var k = s.name(),
          v = s.val();
        $timeout(function () {
          that[k] = v;
          broadcast(movedEvent, that);
          if (bound) {
            update();
          }
        });
      });
      ref.on('child_changed', function (s) {
        var k = s.name(),
          v = s.val();
        $timeout(function () {
          that[k] = v;
          broadcast(changedEvent, that);
          if (bound) {
            update();
          }
        });
      });
      ref.on('child_removed', function (s) {
        var k = s.name();
        $timeout(function () {
          delete that[k];
          broadcast(removedEvent, that);
          if (bound) {
            update();
          }
        });
      });
    }

    function parse(object) {
      return angular.fromJson(angular.toJson(object));
    }

    AngularFire.prototype = {
      $key: ref.name(),

      $index: index,

      $bind: function (scope, name) {
        var d = $q.defer(),
          n = $parse(name),
          l = n(scope),
          u = scope.$watch(name, function () {
            l = n(scope);
            if (angular.equals(l, that)) {
              return;
            }
            ref.set(l);
          }, true);
        if (l) {
          ref.update(parse(l));
        } else {
          n.assign(scope, {});
        }
        scope.$on('$destroy', function () {
          u();
        });
        that.$value().then(function () {
          d.resolve(u);
        });
        bound = {
          scope: scope,
          name: name
        };
        return d.promise;
      },

      $value: function () {
        var d = $q.defer();
        ref.on('value', function (s) {
          var v = s.val();
          $timeout(function () {
            angular.extend(that, v);
            d.resolve(that);
            broadcast(loadedEvent, that);
            if (bound) {
              update();
            }
          });
          switch (typeof v) {
          case 'string':
          case 'number':
          case 'boolean':
            break;
          case 'object':
            attach();
            ref.off('value');
            break;
          default:
            throw new Error('Unexpected type from remote data ' + typeof v);
          }
        });
        return d.promise;
      },

      $add: function (value) {
        var d = $q.defer(),
          r,
          cb = function (err) {
            if (err) {
              d.reject(err);
            } else {
              d.resolve(construct($q, $parse, $timeout, r).$value());
            }
          };
        r = ref.push(parse(value), cb);
        return d.promise;
      },

      $save: function (key) {
        var d = $q.defer(),
          cb = function (err) {
            if (err) {
              d.reject(err);
            } else {
              d.resolve(that);
            }
          };
        if (key) {
          ref.child(key).set(parse(that[key]), cb);
        } else {
          ref.set(parse(that), cb);
        }
        return d.promise;
      },

      $set: function (value) {
        var d = $q.defer(),
          cb = function (err) {
            if (err) {
              d.reject(err);
            } else {
              d.resolve(that);
            }
          };
        ref.set(parse(value), cb);
        return d.promise;
      },

      $remove: function (key) {
        var d = $q.defer(),
          cb = function (err) {
            if (err) {
              d.reject(err);
            } else {
              d.resolve(that);
            }
          };
        if (key) {
          ref.child(key).remove(cb);
        } else {
          ref.remove(cb);
        }
        return d.promise;
      },

      $child: function (path) {
        return construct($q, $parse, $timeout, ref.child(path)).$value();
      },

      $on: function (type, callback) {
        switch (type) {
        case addedEvent:
          onAdded.push(callback);
          break;
        case movedEvent:
          onMoved.push(callback);
          break;
        case changedEvent:
          onChanged.push(callback);
          break;
        case removedEvent:
          onRemoved.push(callback);
          break;
        case loadedEvent:
          onLoaded.push(callback);
          break;
        default:
          throw new Error('Invalid event type ' + type + ' specified');
        }
        return this;
      }
    };

    return new AngularFire($q, $parse, $timeout, ref);
  }

  angular.module('firebase', [])

    .factory('Firebase', [
      '$window',
      function ($window) {
        return $window.Firebase;
      }
    ])

    .factory('$firebase', [
      '$q',
      '$parse',
      '$timeout',
      function ($q, $parse, $timeout) {
        return function (ref) {
          return construct($q, $parse, $timeout, ref);
        };
      }
    ])

    .filter('orderByPriority', function () {

    });
}(window.angular));
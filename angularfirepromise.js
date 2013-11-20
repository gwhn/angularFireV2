(function (angular) {
  'use strict';

  function construct($q, $parse, $timeout, ref) {

    var that, bound, index = [],
      addedEvent = 'added', onAdded = [],
      movedEvent = 'moved', onMoved = [],
      changedEvent = 'changed', onChanged = [],
      removedEvent = 'removed', onRemoved = [],
      loadedEvent = 'loaded', onLoaded = [];

    if (!(ref instanceof window.Firebase)) {
      throw 'Provide a Firebase reference';
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

    function emit(type, value) {
      var cbs = [];
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
      }
      angular.forEach(cbs, function (cb) {
        if (typeof cb === 'function') {
          cb(value);
        }
      });
    }

    function attach() {
      function add(snapshot, previousChild, event) {
        var k = snapshot.name(),
          v = snapshot.val(),
          p = snapshot.getPriority(),
          i = index.indexOf(k);
        if (i !== -1) {
          index.splice(i, 1);
        }
        if (previousChild) {
          index.splice(index.indexOf(previousChild) + 1, 0, k);
        } else {
          index.unshift(k);
        }
        $timeout(function () {
          v.$priority = p;
          that[k] = v;
          if (bound) {
            update();
          }
          emit(event, that);
        });
      }
      function remove(snapshot, event) {
        var k = snapshot.name();
        index.splice(index.indexOf(k), 1);
        $timeout(function () {
          delete that[k];
          if (bound) {
            update();
          }
          emit(event, that);
        });
      }
      ref.on('child_added', function (s, pc) {
        add(s, pc, addedEvent);
      });
      ref.on('child_moved', function (s, pc) {
        add(s, pc, movedEvent);
      });
      ref.on('child_changed', function (s, pc) {
        add(s, pc, changedEvent);
      });
      ref.on('child_removed', function (s) {
        remove(s, removedEvent);
      });
    }

    function parse(object) {
      return angular.fromJson(angular.toJson(object));
    }

    AngularFire.prototype = {
      $key: ref.name(),

      $index: function () {
        return angular.copy(index);
      },

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
          var v = s.val(),
            p = s.getPriority();
          $timeout(function () {
            v.$priority = p;
            angular.extend(that, v);
            if (bound) {
              update();
            }
            return loadedEvent;
          })
            .then(function (event) {
              d.resolve(that);
              emit(event, that);
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
            throw 'Unexpected type from remote data ' + typeof v;
          }
        });
        return d.promise;
      },

      $add: function (value) {
        var d = $q.defer(), r,
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
          throw 'Invalid event type ' + type + ' specified';
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
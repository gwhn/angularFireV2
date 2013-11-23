(function (global, angular) {
  'use strict';

  angular.module('firebase', []);

  angular.module('firebase').factory('Firebase', [
    '$window',
    function ($window) {
      return $window.Firebase;
    }
  ]);

  angular.module('firebase').factory('$firebase', [
    '$q',
    '$parse',
    '$timeout',
    function ($q, $parse, $timeout) {

      function construct(ref) {

        var that, bound, index = [],
          changedEvent = 'changed', onChanged = [],
          loadedEvent = 'loaded', onLoaded = [];

        if (!(ref instanceof global.Firebase)) {
          throw 'Provide a Firebase reference';
        }

        function AngularFire() {
          if (!(this instanceof AngularFire)) {
            return new AngularFire();
          }
          that = this;
        }

        function update() {
          if (bound && !angular.equals(that, $parse(bound.name)(bound.scope))) {
            $parse(bound.name).assign(bound.scope, that);
          }
        }

        function emit(type) {
          var cbs = [];
          switch (type) {
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
              cb(that);
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
              update();
              emit(event);
            });
          }

          function remove(snapshot, event) {
            var k = snapshot.name();
            index.splice(index.indexOf(k), 1);
            $timeout(function () {
              delete that[k];
              update();
              emit(event);
            });
          }

          ref.on('child_added', function (s, pc) {
            add(s, pc, changedEvent);
          });
          ref.on('child_moved', function (s, pc) {
            add(s, pc, changedEvent);
          });
          ref.on('child_changed', function (s, pc) {
            add(s, pc, changedEvent);
          });
          ref.on('child_removed', function (s) {
            remove(s, changedEvent);
          });
        }

        function copy(object) {
          return angular.fromJson(angular.toJson(object));
        }

        AngularFire.prototype = {
          $key: function () {
            return ref.name();
          },

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
              ref.update(copy(l));
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
                update();
                return loadedEvent;
              })
                .then(function (event) {
                  d.resolve(that);
                  emit(event);
                });
              if (typeof v === 'object') {
                ref.off('value');
                attach();
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
                  d.resolve(construct(r).$value());
                }
              };
            r = ref.push(copy(value), cb);
            if (value.$priority) {
              r.setPriority(value.$priority);
            }
            return d.promise;
          },

          $save: function (key) {
            var d = $q.defer(),
              r = key ? ref.child(key) : ref,
              o = key ? that[key] : that,
              cb = function (err) {
                if (err) {
                  d.reject(err);
                } else {
                  d.resolve(that);
                }
              };
            if (o.$priority) {
              r.setWithPriority(copy(o), o.$priority, cb);
            } else {
              r.set(copy(o), cb);
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
            if (value.$priority) {
              ref.setWithPriority(copy(value), value.$priority, cb);
            } else {
              ref.set(copy(value), cb);
            }
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
            return construct(ref.child(path)).$value();
          },

          $on: function (type, callback) {
            switch (type) {
            case changedEvent:
              onChanged.push(callback);
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

      return function (ref) {
        return construct(ref);
      };
    }
  ]);

  angular.module('firebase').filter('orderByPriority', function () {
    return function (input) {
      var a = [], i, j, n, k, v;
      if (!(input && input.$index && typeof input.$index === 'function')) {
        return input;
      }
      i = input.$index();
      n = i.length;
      if (n === 0) {
        return input;
      }
      for (j = 0; j < n; j += 1) {
        k = i[j];
        v = input[k];
        v.$id = k;
        a.push(v);
      }
      return a;
    };
  });
}(window, window.angular));
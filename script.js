(function (angular) {
  'use strict';

  angular.module('angularFireV2', ['ngRoute', 'firebase'])

    .constant('fbUrl', 'https://afv2p.firebaseio.com/')

    .factory('items', function ($firebase, fbUrl, Firebase) {
      return $firebase(new Firebase(fbUrl + 'items'));
    })

    .factory('things', function () {
      return [
        {select: 1, label: 'thingy 1'},
        {select: 2, label: 'thingy 2'},
        {select: 3, label: 'thingy 3'}
      ];
    })

    /*
     .factory('auth', function ($log, $firebaseAuth, fbUrl, Firebase) {
     return $firebaseAuth(new Firebase(fbUrl), {
     simple: true,
     callback: function () {
     $log.log('$firebaseAuth:init', arguments);
     }
     });
     })
     */

    .config(function ($routeProvider) {
      $routeProvider
        .when('/list', {
          templateUrl: 'list.tpl.html',
          controller: 'listCtrl'
        })
        .when('/item/:id', {
          templateUrl: 'item.tpl.html',
          controller: 'itemCtrl'
        })
        .when('/new', {
          templateUrl: 'edit.tpl.html',
          controller: 'newCtrl'
        })
        .when('/edit/:id', {
          templateUrl: 'edit.tpl.html',
          controller: 'editCtrl'
        })
        .when('/delete/:id', {
          templateUrl: 'delete.tpl.html',
          controller: 'deleteCtrl'
        })
        .otherwise({
          redirectTo: '/list'
        });
    })

    .controller('appCtrl', function ($scope, $log, items) {
      items.$on('added', function (data) {
        $log.log('added', data);
      });
      items.$on('moved', function (data) {
        $log.log('moved', data);
      });
      items.$on('changed', function (data) {
        $log.log('changed', data);
      });
      items.$on('removed', function (data) {
        $log.log('removed', data);
      });
      items.$on('loaded', function (data) {
        $log.log('loaded', data);
      });
      var unbind;
      items.$bind($scope, 'data').then(function (fn) {
        $log.log('$bind $scope.data resolved');
        unbind = fn;
      }, function (err) {
        $log.log('$bind $scope.data rejected ' + err);
      });
      $scope.$watchCollection(items.$index, function (index) {
        $scope.index = index;
      });
    })
    /*
     .controller('appCtrl', function ($scope, $log, items, auth) {
     items.$on('change', function (data) {
     $log.log('change', data); // data is always undefined!
     });
     items.$on('loaded', function (data) {
     $log.log('loaded', data);
     });
     var unbind;
     items.$bind($scope, 'data').then(function (fn) {
     $log.log('$bind $scope.data resolved');
     unbind = fn;
     }, function (err) {
     $log.log('$bind $scope.data rejected');
     });
     $scope.$watchCollection(items.$getIndex, function (index) {
     $scope.index = index;
     });
     $scope.$on('$firebaseAuth:login', function (event, user) {
     $log.log('$firebaseAuth:login', arguments);
     $scope.user = user;
     });
     $scope.$on('$firebaseAuth:logout', function (event) {
     $log.log('$firebaseAuth:logout', arguments);
     $scope.user = null;
     });
     $scope.$on('$firebaseAuth:error', function (event, err) {
     $log.log('$firebaseAuth:error', arguments);
     $scope.user = null;
     });
     $scope.login = function () {
     auth.$login('persona');
     };
     $scope.logout = function () {
     auth.$logout();
     };
     })
     */

    .controller('listCtrl', function ($scope, items) {
      items.$value().then(function (items) {
        $scope.items = items;
      });
    })

    .controller('itemCtrl', function ($scope, $routeParams, items) {
      $scope.id = $routeParams.id;
      items.$child($routeParams.id).then(function (item) {
        $scope.item = item;
      });
    })

    .controller('newCtrl', function ($scope, $location, items, things) {
      $scope.isNew = true;
      $scope.things = things;
      $scope.save = function () {
//        $scope.item.uid = $scope.user.id;
        $scope.item.$priority = $scope.item.string;
        items.$add($scope.item).then(function (value) {
          $location.path('/item/' + value.$key);
        });
      };
    })

    .controller('editCtrl', function ($scope, $location, $routeParams, items, things) {
      $scope.things = things;
      items.$child($routeParams.id).then(function (item) {
        $scope.item = item;
      });
      $scope.save = function (key) {
        $scope.item.$save(key);
      };
      $scope.remove = function (key) {
        $scope.item.$remove(key);
      };
      $scope.update = function () {
        $scope.item.$priority = $scope.item.string;
        $scope.item.$save().then(function () {
          $location.path('/item/' + $routeParams.id);
        });
      };
    })

    .controller('deleteCtrl', function ($scope, $location, $routeParams, items) {
      items.$child($routeParams.id).then(function (item) {
        $scope.item = item;
      });
      $scope.remove = function () {
        $scope.item.$remove().then(function (value) {
          $location.path('/list');
        });
      };
    });

}(window.angular));
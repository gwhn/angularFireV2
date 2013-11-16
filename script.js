(function (angular) {
  'use strict';

  angular.module('angularFireV2', ['ngRoute', 'firebase'])

    .constant('fbUrl', 'https://afv2.firebaseio.com/')

    .factory('Firebase', function ($window) {
      return $window.Firebase;
    })

    .factory('itemSvc', function ($firebase, fbUrl, Firebase) {
      return $firebase(new Firebase(fbUrl + 'items'));
    })

    .factory('authSvc', function ($log, $firebaseAuth, fbUrl, Firebase) {
      return $firebaseAuth(new Firebase(fbUrl), {
        simple: true,
        callback: function () {
          $log.log('$firebaseAuth:init', arguments);
        }
      });
    })

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

    .controller('appCtrl', function ($scope, $log, itemSvc, authSvc) {
      itemSvc.$on('change', function (data) {
        $log.log('change', data); // data is always undefined!
      });
      itemSvc.$on('loaded', function (data) {
        $log.log('loaded', data);
      });
      var unbind;
      itemSvc.$bind($scope, 'data').then(function (fn) {
        $log.log('$bind $scope.data resolved');
        unbind = fn;
      }, function (err) {
        $log.log('$bind $scope.data rejected');
      });
      $scope.$watchCollection(itemSvc.$getIndex, function (index) {
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
        authSvc.$login('facebook');
      };
      $scope.logout = function () {
        authSvc.$logout();
      };
    })

    .controller('listCtrl', function ($scope, itemSvc) {
      $scope.items = itemSvc;
/*
      itemSvc.$value().then(function (value) {
        $scope.items = value;
      }, function (err) {
        console.log(err.msg);
      });
*/
    })

    .controller('itemCtrl', function ($scope, $routeParams, itemSvc) {
      $scope.item = itemSvc.$child($routeParams.id);
/*
      itemSvc.$child($routeParams.id).then(function (value) {
        $scope.item = value;
      }, function (err) {
        console.log(err.msg);
      });
*/
    })

    .controller('newCtrl', function ($scope, $location, itemSvc) {
      $scope.isNew = true;
      $scope.save = function () {
        $scope.item.uid = $scope.user.id;
        itemSvc.$add($scope.item);
        $location.path('/list');
      };
/*
      $scope.save = function () {
        itemSvc.$add($scope.item).then(function (value) {
          $location.path('/item/' + value.$id);
        }, function (err) {
          console.log(err.msg);
        });
      };
*/
    })

    .controller('editCtrl', function ($scope, $location, $routeParams, itemSvc) {
      $scope.item = itemSvc.$child($routeParams.id);
      $scope.update = function () {
        $scope.item.$save();
        $location.path('/list');
      };
/*
      $scope.update = function () {
        itemSvc.$save($scope.item).then(function (value) {
          $location.path('/item/' + value.$id);
        }, function (err) {
          console.log(err.msg);
        });
      };
*/
    })

    .controller('deleteCtrl', function ($scope, $location, $routeParams, itemSvc) {
      $scope.item = itemSvc.$child($routeParams.id);
      $scope.remove = function () {
        $scope.item.$remove();
        $location.path('/list');
      };
/*
      $scope.remove = function () {
        itemSvc.$remove($scope.item).then(function () {
          $location.path('/list');
        }, function (err) {
          console.log(err);
        });
      };
*/
    });

}(window.angular));
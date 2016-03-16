'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Service = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = function (options) {
  options = Object.assign({}, defaults, options);

  if (!options.provider) {
    throw new Error('You need to pass a `provider` for your authentication provider');
  }

  if (!options.endPoint) {
    throw new Error('You need to provide an \'endPoint\' for your ' + options.provider + ' provider');
  }

  if (!options.strategy) {
    throw new Error('You need to provide a Passport \'strategy\' for your ' + options.provider + ' provider');
  }

  options.callbackURL = options.callbackURL || options.endPoint + '/' + options.callbackSuffix;

  debug('configuring ' + options.provider + ' OAuth2 service with options', options);

  return function () {
    var app = this;
    var Strategy = options.strategy;
    var TokenStrategy = options.tokenStrategy;

    // Initialize our service with any options it requires
    app.use(options.endPoint, _middleware.exposeConnectMiddleware, new Service(options), (0, _middleware.successfulLogin)(options));

    // Get our initialized service
    var service = app.service(options.endPoint);

    // Register our Passport auth strategy and get it to use our passport callback function
    debug('registering passport-' + options.provider + ' OAuth2 strategy', options);
    _passport2.default.use(new Strategy(options, service.oauthCallback.bind(service)));

    if (TokenStrategy) {
      debug('registering passport-' + options.provider + '-token OAuth2 strategy', options);
      _passport2.default.use(new TokenStrategy(options, service.oauthCallback.bind(service)));
    }
  };
};

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _middleware = require('../../middleware');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug2.default)('feathers-authentication:oauth2');

// Provider specific config
var defaults = {
  passReqToCallback: true,
  callbackSuffix: 'callback',
  permissions: {}
};

var Service = exports.Service = function () {
  function Service() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Service);

    this.options = options;
  }

  _createClass(Service, [{
    key: 'oauthCallback',
    value: function oauthCallback(req, accessToken, refreshToken, profile, done) {
      var app = this.app;
      var options = this.options;
      var params = {
        internal: true,
        query: _defineProperty({}, options.provider + 'Id', profile.id)
      };

      // Find or create the user since they could have signed up via facebook.
      app.service(options.userEndpoint).find(params).then(function (users) {
        var _Object$assign;

        // Paginated services return the array of results in the data attribute.
        var user = users[0] || users.data && users.data[0];

        // If user found return them
        if (user) {
          return done(null, user);
        }

        // No user found so we need to create one.
        //
        // TODO (EK): This is where we should look at req.user and see if we
        // can consolidate profiles. We might want to give the developer a hook
        // so that they can control the consolidation strategy.
        profile._json.accessToken = accessToken;

        var data = Object.assign((_Object$assign = {}, _defineProperty(_Object$assign, options.provider + 'Id', profile.id), _defineProperty(_Object$assign, '' + options.provider, profile._json), _Object$assign));

        return app.service(options.userEndpoint).create(data, { internal: true }).then(function (user) {
          return done(null, user);
        }).catch(done);
      }).catch(done);
    }

    // GET /auth/facebook

  }, {
    key: 'find',
    value: function find(params) {
      // Authenticate via your provider. This will redirect you to authorize the application.
      var authOptions = Object.assign({ session: false, state: true }, this.options.permissions);
      return _passport2.default.authenticate(this.options.provider, authOptions)(params.req, params.res);
    }

    // For GET /auth/facebook/callback

  }, {
    key: 'get',
    value: function get(id, params) {
      var options = this.options;
      var authOptions = Object.assign({ session: false, state: true }, options.permissions);
      var app = this.app;

      // TODO (EK): Make this configurable
      if (id !== 'callback') {
        return Promise.reject(new _feathersErrors2.default.NotFound());
      }

      return new Promise(function (resolve, reject) {

        var middleware = _passport2.default.authenticate(options.provider, authOptions, function (error, user) {
          if (error) {
            return reject(error);
          }

          // Login failed.
          if (!user) {
            return reject(new _feathersErrors2.default.NotAuthenticated('An error occurred logging in with ' + options.provider));
          }

          // Get a new JWT and the associated user from the Auth token service and send it back to the client.
          return app.service(options.tokenEndpoint).create(user, { internal: true }).then(resolve).catch(reject);
        });

        middleware(params.req, params.res);
      });
    }

    // POST /auth/facebook /auth/facebook::create
    // This is for mobile token based authentication

  }, {
    key: 'create',
    value: function create(data, params) {
      var options = this.options;
      var authOptions = Object.assign({ session: false, state: true }, options.permissions);
      var app = this.app;

      if (!options.tokenStrategy) {
        return Promise.reject(new _feathersErrors2.default.MethodNotAllowed());
      }

      // Authenticate via facebook, then generate a JWT and return it
      return new Promise(function (resolve, reject) {
        var middleware = _passport2.default.authenticate(options.provider + '-token', authOptions, function (error, user) {
          if (error) {
            return reject(error);
          }

          // Login failed.
          if (!user) {
            return reject(new _feathersErrors2.default.NotAuthenticated('An error occurred logging in with ' + options.provider));
          }

          // Login was successful. Clean up the user object for the response.
          // TODO (EK): Maybe the id field should be configurable
          var payload = {
            id: user.id !== undefined ? user.id : user._id
          };

          // Get a new JWT and the associated user from the Auth token service and send it back to the client.
          return app.service(options.tokenEndpoint).create(payload, { internal: true }).then(resolve).catch(reject);
        });

        middleware(params.req, params.res);
      });
    }
  }, {
    key: 'setup',
    value: function setup(app) {
      // attach the app object to the service context
      // so that we can call other services
      this.app = app;
    }
  }]);

  return Service;
}();
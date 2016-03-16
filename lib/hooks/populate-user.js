'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return function (hook) {
    // Try to get auth options from the app config
    var authOptions = hook.app.get('auth');

    options = Object.assign({}, defaults, authOptions, options);

    // If we already have a current user just pass through
    if (hook.params.user) {
      return Promise.resolve(hook);
    }

    var id = void 0;

    // If it's an after hook grab the id from the result
    if (hook.type === 'after') {
      id = hook.result[options.idField] || hook.result.id;
    }
    // Check to see if we have an id from a decoded JWT
    else if (hook.params.payload) {
        id = hook.params.payload[options.idField];
      }

    // If we didn't find an id then just pass through
    if (id === undefined) {
      return Promise.resolve(hook);
    }

    return new Promise(function (resolve, reject) {
      hook.app.service(options.userEndpoint).get(id, {}).then(function (user) {
        // attach the user to the hook for use in other hooks or services
        hook.params.user = user;

        // If it's an after hook attach the user to the response
        if (hook.result) {
          hook.result.data = Object.assign({}, user = !user.toJSON ? user : user.toJSON());

          // format response
          delete hook.result[options.idField];
          delete hook.result.data[options.passwordField];
        }

        return resolve(hook);
      }).catch(reject);
    });
  };
};

/**
 * Populate the current user associated with the JWT
 */
var defaults = {
  userEndpoint: '/users',
  passwordField: 'password',
  idField: '_id'
};

module.exports = exports['default'];
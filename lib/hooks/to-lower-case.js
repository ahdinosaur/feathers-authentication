'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = toLowerCase;

/**
 * toLowerCase runs toLowerCase on the provided field, if it has a toLowerCase function. It
 * looks for the key on the data object for before hooks and the result object for
 * the after hooks.
 */
function toLowerCase() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var fieldName = options.fieldName;

  if (!fieldName) {
    throw new Error('You must provide the name of the field to use in the toLowerCase hook.');
  }

  function convert(obj) {
    if (obj[fieldName] && obj[fieldName].toLowerCase) {
      obj[fieldName] = obj[fieldName].toLowerCase();
    }
  }

  return function (hook) {
    var location = hook.type === 'before' ? 'data' : 'result';

    // Handle arrays.
    if (Array.isArray(hook[location])) {
      hook[location].forEach(function (item) {
        convert(item);
      });

      // Handle Single Objects.
    } else {
        convert(hook[location]);
      }
  };
}
module.exports = exports['default'];
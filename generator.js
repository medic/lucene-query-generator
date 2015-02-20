(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.luceneQueryGenerator = factory();
  }
})(this, function() {

  'use strict';

  var types = {
    string: {
      suffix: '',
      format: function(str) {
        return '"' + esc(str) + '"';
      }
    },
    int: {
      suffix: '<int>'
    },
    long: {
      suffix: '<long>'
    },
    float: {
      suffix: '<float>'
    },
    double: {
      suffix: '<double>'
    },
    boolean: {
      suffix: ''
    },
    date: {
      suffix: '<date>',
      format: function(date) {
        return '"' + date.toISOString() + '"';
      }
    }
  };

  var esc = function(str) {
    var i = str.length;
    var result = [];
    while (i--) {
      var c = str[i];
      if (c == '\\' || c == '+' || c == '-' || c == '!' || c == '(' || c == ')' || c == ':' || c == '^' || c == '[' || c == ']' || c == '\"' || c == '{' || c == '}' || c == '~' || c == '*' || c == '?' || c == '|' || c == '&') {
        result[i] = '\\' + c;
      } else {
        result[i] = c;
      }
    }
    return result.join('');
  };

  var isString = function(obj) {
    return typeof obj == 'string' || obj instanceof String;
  };

  var isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  var isDefined = function(obj) {
    return obj !== null && obj !== undefined;
  };

  var createDisjunction = function(array) {
    if (array.length === 0) {
      return null;
    }
    if (array.length === 1) {
      return array[0];
    }
    return '(' + array.join(' OR ') + ')';
  };

  var getType = function(field, schema) {
    return types[schema[field] || 'string'];
  };

  /**
   * Returns the formatted value or null
   */
  var formatValue = function(type, value) {
    if (isArray(value)) {
      var values = [];
      value.forEach(function(item) {
        var value = formatValue(type, item);
        if (isDefined(value)) {
          values.push(value);
        }
      })
      return createDisjunction(values);
    }
    if (isDefined(value.$from) && isDefined(value.$to)) {
      var from = formatValue(type, value.$from);
      var to = formatValue(type, value.$to);
      if (!isDefined(from) || !isDefined(to)) {
        return null;
      }
      return '[' + formatValue(type, value.$from) +
          ' TO ' + formatValue(type, value.$to) + ']';
    }
    if (type.format) {
      return type.format(value);
    }
    return value;
  };

  var extractTerms = function(obj, schema) {
    if (isString(obj)) {
      return [ obj ];
    }
    var result = [];
    Object.keys(obj).forEach(function(field) {
      if (isDefined(obj[field])) {
        var type = getType(field, schema);
        var value = formatValue(type, obj[field]);
        if (value) {
          result.push(esc(field) + type.suffix + ':' + value);
        }
      }
    });
    return result;
  };

  var extractOperands = function(operands, schema) {
    var results = [];
    if (isArray(operands)) {
      operands.forEach(function(operand) {
        if (operand.$operands) {
          results.push('(' + convert(operand) + ')');
        } else {
          results.push.apply(results, extractTerms(operand, schema));
        }
      });
    } else {
      results.push.apply(results, extractTerms(operands, schema));
    }
    return results;
  };

  var convert = function(terms, options) {
    terms.$operator = terms.$operator || 'AND';
    terms.$operands = terms.$operands || [];
    var schema = (options && options.schema) || {};
    var operands = extractOperands(terms.$operands, schema);
    var operator = terms.$operator.toUpperCase();
    return operands.join(' ' + operator + ' ');
  };

  return {
    convert: convert
  };

});

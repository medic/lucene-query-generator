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
        str = str.replace(/"/g, '\\"');
        if (str.match(/([\+\-&\|\!\(\)\{\}\[\]\^"~\*?:\\])/g)) {
          return '"' + str + '"';
        }
        return str;
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
        if (Object.prototype.toString.call(date) === '[object Date]') {
          date = date.toJSON();
        }
        return '"' + date + '"';
      }
    }
  };

  var operators = {
    and: {
      symbol: 'AND'
    },
    or: {
      symbol: 'OR'
    },
    not: {
      symbol: 'NOT',
      unary: true
    }
  };

  var getType = function(field, schema) {
    if (schema[field]) {
      if (schema[field].type) {
        return types[schema[field].type];
      }
      return types[schema[field]];
    }
    return types.string;
  };

  var getOperator = function(code) {
    var normalised = code && code.toLowerCase();
    return (normalised && operators[normalised]) || operators.and;
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

  var escapeKey = function(str) {
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

  var createDisjunction = function(array) {
    if (array.length === 0) {
      return null;
    }
    if (array.length === 1) {
      return array[0];
    }
    return '(' + array.join(' OR ') + ')';
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
    return type.format ? type.format(value) : value;
  };

  var extractTerms = function(obj, schema) {
    if (isString(obj)) {
      return [ obj ];
    }
    var result = [];
    Object.keys(obj).forEach(function(field) {
      if (isDefined(obj[field])) {
        var type = getType(field, schema);
        // Dont format if allowSpecialCharacters is true
        if (schema[field] && schema[field].allowSpecialCharacters) {
          type.format = false;
        }
        var value = formatValue(type, obj[field]);
        if (isDefined(value)) {
          result.push(escapeKey(field) + type.suffix + ':' + value);
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
          var unary = getOperator(operand.$operator).unary;
          var term = convert(operand, { schema: schema });
          results.push(unary ? term : '(' + term + ')');
        } else {
          results.push.apply(results, extractTerms(operand, schema));
        }
      });
    } else {
      results.push.apply(results, extractTerms(operands, schema));
    }
    return results;
  };

  var joinOperands = function(operands, code) {
    var operator = getOperator(code);
    var prefix = operator.unary ? operator.symbol + ' ' : '';
    return prefix + operands.join(' ' + operator.symbol + ' ');
  };

  var convert = function(terms, options) {
    var schema = (options && options.schema) || {};
    var operands = extractOperands(terms.$operands || [], schema);
    return joinOperands(operands, terms.$operator);
  };

  return {
    convert: convert
  };

});
var generator = require('../generator');

exports['accepts single operand'] = function(test) {
  var actual = generator.convert({
    $operator: 'and',
    $operands: { name: 'gareth' }
  });
  test.equals('name:"gareth"', actual);
  test.done();
};

exports['accepts multiple operands in array'] = function(test) {
  var actual = generator.convert({
    $operator: 'or',
    $operands: [{ name: 'gareth' }, { name: 'milan' }]
  });
  test.equals('name:"gareth" OR name:"milan"', actual);
  test.done();
};

exports['accepts multiple operands in object'] = function(test) {
  var actual = generator.convert({
    $operator: 'and',
    $operands: [{ name: 'gareth', job: 'geek' }]
  });
  test.equals('name:"gareth" AND job:"geek"', actual);
  test.done();
};

exports['defaults to conjunction'] = function(test) {
  var actual = generator.convert({
    $operands: [{ name: 'gareth' }, { job: 'geek' }]
  });
  test.equals('name:"gareth" AND job:"geek"', actual);
  test.done();
};

exports['evaluates nested query: x AND (y OR z)'] = function(test) {
  var actual = generator.convert({
    $operator: 'and',
    $operands: [
      { name: 'gareth' },
      {
        $operator: 'or',
        $operands: [
          { job: 'geek' },
          { job: 'musician' }
        ]
      }
    ]
  });
  test.equals('name:"gareth" AND (job:"geek" OR job:"musician")', actual);
  test.done();
};

exports['evaluates nested query: x OR (y AND z)'] = function(test) {
  var actual = generator.convert({
    $operator: 'or',
    $operands: [
      { job: 'geek' },
      {
        $operator: 'and',
        $operands: [
          { job: 'musician' },
          { name: 'gareth' }
        ]
      }
    ]
  });
  test.equals('job:"geek" OR (job:"musician" AND name:"gareth")', actual);
  test.done();
};

exports['evaluates multiple nested query: w OR (x AND (y OR z))'] = function(test) {
  var actual = generator.convert({
    $operator: 'or',
    $operands: [
      { name: 'gareth' },
      {
        $operator: 'and',
        $operands: [
          { language: 'javascript' },
          {
            $operator: 'or',
            $operands: [
              { job: 'geek' },
              { job: 'musician' }
            ]
          }
        ]
      }
    ]
  });
  test.equals('name:"gareth" OR (language:"javascript" AND (job:"geek" OR job:"musician"))', actual);
  test.done();
};

exports['search all fields'] = function(test) {
  var actual = generator.convert({
    $operands: [ 'new' ]
  });
  test.equals('new', actual);
  test.done();
};

exports['search all fields with query'] = function(test) {
  var actual = generator.convert({
    $operands: [
      { name: 'gareth' },
      'new'
    ]
  });
  test.equals('name:"gareth" AND new', actual);
  test.done();
};

exports['or shorthand'] = function(test) {
  var actual = generator.convert({
    $operands: [
      { name: ['gareth','milan'] }
    ]
  });
  test.equals('name:("gareth" OR "milan")', actual);
  test.done();
};

exports['or shorthand with one value'] = function(test) {
  var actual = generator.convert({
    $operands: [
      { name: ['gareth'] }
    ]
  });
  test.equals('name:"gareth"', actual);
  test.done();
};

exports['or shorthand with no values'] = function(test) {
  var actual = generator.convert({
    $operands: [
      { name: [] },
      { job: 'geek' }
    ]
  });
  test.equals('job:"geek"', actual);
  test.done();
};

exports['includes field types'] = function(test) {
  var actual = generator.convert(
    {
      $operands: [{
        name: 'gareth',
        job: 'geek',
        age: 55,
        seconds: 123456789,
        height: 5.5,
        position: -5.123456789,
        male: true,
        dob: new Date(123456789)
      }]
    }, { schema: {
      name: 'string',
      age: 'int',
      seconds: 'long',
      height: 'float',
      position: 'double',
      male: 'boolean',
      dob: 'date'
    }}
  );

  var expected = 'name:"gareth" AND job:"geek" AND age<int>:55 AND ' +
                 'seconds<long>:123456789 AND height<float>:5.5 AND ' +
                 'position<double>:-5.123456789 AND male:true AND ' +
                 'dob<date>:"1970-01-02T10:17:36.789Z"';
  test.equals(expected, actual);
  test.done();
};

exports['handles falsy values'] = function(test) {
  var actual = generator.convert(
    {
      $operands: [{
        name: 'jenny',
        age: 0,
        male: false
      }]
    }, { schema: {
      age: 'int',
      male: 'boolean'
    }}
  );

  var expected = 'name:"jenny" AND age<int>:0 AND male:false';
  test.equals(expected, actual);
  test.done();
};

exports['handles date formats'] = function(test) {
  var actual = generator.convert(
    {
      $operands: [{
        dob: new Date(123456789),
        dod: '2014-05-31T11:00:00.000Z'
      }]
    }, { schema: {
      dod: 'date',
      dob: 'date'
    }}
  );

  var expected = 'dob<date>:"1970-01-02T10:17:36.789Z" AND ' +
                 'dod<date>:"2014-05-31T11:00:00.000Z"';
  test.equals(expected, actual);
  test.done();
};

exports['value ranges'] = function(test) {
  var actual = generator.convert(
    {
      $operands: [{
        name: { $from: 'gareth', $to: 'milan' },
        age: { $from: 55, $to: 63 },
        seconds: { $from: 0, $to: 123456789 },
        height: { $from: -3.5, $to: 5.5 },
        position: { $from: -10.123555555, $to: -5.123456789 },
        dob: { $from: new Date(123450000), $to: new Date(123456789) }
      }]
    }, { schema: {
      name: 'string',
      age: 'int',
      seconds: 'long',
      height: 'float',
      position: 'double',
      dob: 'date'
    }}
  );

  var expected = 'name:["gareth" TO "milan"] AND age<int>:[55 TO 63] AND ' +
                 'seconds<long>:[0 TO 123456789] AND height<float>:[-3.5 TO 5.5] AND ' +
                 'position<double>:[-10.123555555 TO -5.123456789] AND ' +
                 'dob<date>:["1970-01-02T10:17:30.000Z" TO "1970-01-02T10:17:36.789Z"]';
  test.equals(expected, actual);
  test.done();
};

exports['escapes key'] = function(test) {
  var actual = generator.convert({
    $operator: 'and',
    $operands: operands = {
      'KEY: + - && || ! ( ) { } [ ] ^ " ~ * ? : \\': 'VALUE'
    }
  });
  var expected = 'KEY\\: \\+ \\- \\&\\& \\|\\| \\! \\( \\) \\{ \\} \\[ \\] \\^ \\" \\~ \\* \\? \\: \\\\:"VALUE"';
  test.equals(expected, actual);
  test.done();
};

exports['handle null values'] = function(test) {
  var actual = generator.convert({
    $operator: 'and',
    $operands: [
      { name: 'gareth' },
      { job: null },
      { shoesize: undefined }
    ]
  });
  test.equals('name:"gareth"', actual);
  test.done();
};

exports['not operator'] = function(test) {
  var actual = generator.convert({
    $operator: 'not',
    $operands: 'gareth'
  });
  test.equals('NOT gareth', actual);
  test.done();
};

exports['not operator with field'] = function(test) {
  var actual = generator.convert({
    $operator: 'not',
    $operands: { name: 'gareth' }
  });
  test.equals('NOT name:"gareth"', actual);
  test.done();
};

exports['not operator with and query'] = function(test) {
  var actual = generator.convert({
    $operands: [
      { name: 'gareth' },
      {
        $operator: 'not',
        $operands: [
          { job: 'geek' }
        ]
      }
    ]
  });
  test.equals('name:"gareth" AND NOT job:"geek"', actual);
  test.done();
};

exports['not operator with or query'] = function(test) {
  var actual = generator.convert({
    $operator: 'or',
    $operands: [
      { name: 'gareth' },
      {
        $operator: 'not',
        $operands: [
          { job: 'geek' }
        ]
      }
    ]
  });
  test.equals('name:"gareth" OR NOT job:"geek"', actual);
  test.done();
};

exports['search all fields with wildcards'] = function(test) {
  var actual = generator.convert({
    $operands: [ 'som?thing * else' ]
  });
  test.equals('som?thing * else', actual);
  test.done();
};

exports['using not operator with typed field'] = function(test) {
  var actual = generator.convert(
  {
    $operator: 'not',
    $operands: { age: 0 }
  }, {
    schema: { age: 'int' }
  });
  test.equals('NOT age<int>:0', actual);
  test.done();
};

exports['wraps named fields'] = function(test) {
  var actual = generator.convert({
    $operands: { id: 'abc-123+xyz' }
  });
  test.equals('id:"abc-123+xyz"', actual);
  test.done();
};

exports['escapes quotes in named fields'] = function(test) {
  var actual = generator.convert({
    $operands: { id: 'abc-123+"xyz"' }
  });
  test.equals('id:"abc-123+\\"xyz\\""', actual);
  test.done();
};
# lucene-query-generator

Builds a lucene query string from an object. Escapes the field names and values to prevent errors on user input. Can be used in the browser or node, however to avoid injection must be run server side.

## Installation

```
npm install lucene-query-generator
```

## API

### convert

Convert an object into a string query.

#### Arguments

* `terms`: Object representing the query
* `options` (optional): Object with the following
** `schema` (optional): The field type mapping

## Examples

### Querying all fields

The simplest form of query

```
generator.convert({ $operands: [ 'hello world!' ] }
// 'hello world\!'
```
Returns
```
'hello world\!'
```

### Querying fielded data

Query specific fields using key value pairs to represent the field name and desired value respectively. 

Defaults to the `AND` operator.
```
generator.convert({
  $operands: [{ name: 'gareth' }, { job: 'geek' }]
});
// 'name:"gareth" AND job:"geek"'
```

Specify the `OR` operator.
```
generator.convert({
  $operator: 'OR',
  $operands: [{ name: 'gareth' }, { job: 'geek' }]
});
// 'name:"gareth" OR job:"geek"'
```

Create a disjunction on one field.
```
generator.convert({
  $operands: [{ name: ['gareth', 'milan'] }]
});
// 'name:("gareth" OR "milan")'
```

`null` values will be ignored.
```
generator.convert({
  $operands: [{ name: 'gareth' }, { job: null }]
});
// 'name:("gareth")'
```


### Nested queries

```
generator.convert({
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
// name:"gareth" AND (job:"geek" OR job:"musician")
```

### Field types

All field terms default to type `string`, which can be overridden by providing a schema. Available types are: `string`, `int`, `long`, `float`, `double`, `boolean`, `date`.

```
generator.convert(
  {
    $operands: [{
      name: 'gareth',
      seconds: 123456789,
      dob: new Date(123456789)
    }]
  }, {
    schema: {
      seconds: 'long',
      dob: 'date'
    }
  }
);
// name:"gareth" AND seconds<long>:123456789 AND dob<date>:"1970-01-02T10:17:36.789Z"
```

### Range queries

Query for values matching a range with the `$from` and `$to` keys.

```
generator.convert(
  {
    $operands: [{
      name: { $from: 'gareth', $to: 'milan' },
      age: { $from: 55, $to: 63 }
    }]
  }, {
    schema: {
      age: 'int'
    }
  }
);
// name:["gareth" TO "milan"] AND age<int>:[55 TO 63]
```

## Development

```
npm install
npm test
```

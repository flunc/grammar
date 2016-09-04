const
  { adapt, alpha, bind, eof, integral, many, parse, print, replicate, seqL } = require('.'),
  { charListToStr } = require('./isos');

// A Grammar that matches the repeating pattern of an integer `n` followed by `n` characters
const nChars = seqL(many(bind(
  integral,
  n => adapt(charListToStr, replicate(n, alpha)),
  s => s.length
)), eof);

const parser  = parse(nChars);
const printer = print(nChars);

console.log('VALID PARSE', parser('1a2bc3def'));
console.log('INVALID PARSE', parser('abcdef'));
console.log('PRINT', printer(['bob', 'jane', 'nancy', 'martha']));

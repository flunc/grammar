const
  { Either, Maybe, Tuple} = require('ramda-fantasy'),
  { Iso, Prism } = require('flunc-optics'),

  { Unit } = require('./util'),

  { fst, snd } = Tuple,
  { either, Left, Right } = Either,
  { Just, Nothing } = Maybe,

  { iso } = Iso,
  { prism_ } = Prism;

const swap = t => Tuple(snd(t), fst(t));

// An iso for swapping Tuple elements
const swapped = iso(swap, swap);

// An Iso from `Either (a, [a]) Unit` to `[a]`
const isoList = iso(
  either(t => [fst(t), ...snd(t)], _ => []),
  xs => xs.length > 0 ? Left(Tuple(xs[0], xs.slice(1))) : Right(Unit)
);

// An Iso from `(a, [a])` to `[a]`
const isoTupleNEL = iso(
  t => [fst(t), ...snd(t)],
  ([x, ...xs]) => Tuple(x, xs)
);

// A prism from `Int` to `String`
const intToString = prism_(n => n.toString(10), s => {
  const n = parseInt(s, 10);
  return isNaN(n) ? Nothing() : Just(n);
});

// An Iso from `[Char]` to `String`
const charListToStr = iso(
  cs => cs.join(''),
  s => s.split('')
);

module.exports = {
  swapped,
  isoList,
  isoTupleNEL,
  intToString,
  charListToStr
};

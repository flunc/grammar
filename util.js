const
  { Tuple } = require('ramda-fantasy'),
  { fst, snd } = Tuple;

const Unit = new (class Unit {});

const compose = (...fns) => fns.reduceRight((g, f) => a => f(g(a)), x => x);

const first = f => t => Tuple(f(fst(t)), snd(t));

module.exports = {
  Unit,
  compose,
  first
};

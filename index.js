const
  { Either, Maybe, Tuple} = require('ramda-fantasy'),
  { Cons, Fold, Iso, Prism} = require('flunc-optics'),

  { charListToStr, intToString, isoList, isoTupleNEL, swapped } = require('./isos'),

  { Unit, compose, first } = require('./util'),

  { _Cons, uncons } = Cons,
  { preview } = Fold,
  { iso } = Iso,
  { aside, prism_, review } = Prism,

  { fst, snd } = Tuple,
  { either, Left, Right } = Either,
  { maybe, Just, Nothing } = Maybe;

//@type Grammar s a = Prism' s (a, s)

//:: Cons s s a a => Grammar s a
const element = _Cons;

// Modify the Grammar via an Iso or Prism - a.k.a <<$>>
//:: Prism' a b -> Grammar s a -> Grammar s b
const adapt = (p, g) => compose(g, swapped, aside(p), swapped);

// Sequence two Grammars - a.k.a <<*>>
//:: Grammar s a -> Grammar s b -> Grammar s (a, b)
const both = (p1, p2) => compose(p1, a => aside(p2)(a), iso(
  aBS => Tuple(Tuple(fst(aBS), fst(snd(aBS))), snd(snd(aBS))),
  abS => Tuple(fst(fst(abS)), Tuple(snd(fst(abS)), snd(abS)))
));

// Choice between two Grammars - a.k.a <<+>>
//:: Grammar s a -> Grammar s b -> Grammar s (Either a b)
const choose = (p1, p2) => prism_(
  t => {
    const f = x => Tuple(x, snd(t));
    return either(a => review(p1, f(a)), b => review(p2, f(b)), fst(t));
  },
  x => {
    const p1Maybe = preview(p1, x).map(first(Left));
    const p1Success = maybe(false, _ => true, p1Maybe);
    return p1Success ? p1Maybe : preview(p2, x).map(first(Right));
  }
);

// A Grammar that consumes an element that satisfies the given predicate
//:: Cons s s a a => (a -> Bool) -> Grammar s a
const satisfy = f => adapt(
  prism_(x => x, a => f(a) ? Just(a) : Nothing()),
  element
);

// A Grammar that consumes an element that is equal to the given value
//:: (Cons s s a a, Eq a) => a -> Grammar s a
const symbol = a => satisfy(b => a === b);

// A Grammar that always fails
//:: Grammar s ()
const failure = prism_(snd, _ => Nothing());

// A Grammar that succeeds without consuming an element, producing the given value
//:: a -> Grammar s a
const success = a => prism_(snd, s => Just(Tuple(a, s)));

// A Grammar that matches the given Grammar zero or more times
//:: Grammar s a -> Grammar s [a]
const many = g => adapt(isoList, choose(both(g, a => many(g)(a)), success(Unit)));

// A Grammar that matches the given Grammar at least once
//:: Grammar s a -> Grammar s (NonEmpty a)
const many1 = g => adapt(isoTupleNEL, both(g, many(g)));

// A Grammar that matches both given Grammars, ignoring the result of the second
//:: Grammar s a -> Grammar s () -> Grammar s a
const seqL = (g1, g2) => adapt(iso(fst, a => Tuple(a, Unit)), both(g1, g2));

// A Grammar that matches both given Grammars, ignoring the result of the first
//:: Grammar s () -> Grammar s a -> Grammar s a
const seqR = (g1, g2) => adapt(iso(snd, a => Tuple(Unit, a)), both(g1, g2));

// A Grammar that repeats the given Grammar `n` times
//:: Natural -> Grammar s a -> Grammar s [a]
const replicate = (n, g) => n > 0
  ? adapt(isoList, choose(both(g, p => replicate(n - 1, g)(p)), failure))
  : success([]);

// A Grammar that decides which Grammar to use after receiving the result of the given Grammar
//:: Grammar s a -> (a -> Grammar s b) -> (b -> a) -> Grammar s b
const bind = (g, a2gsb, b2a) => prism_(
  t => {
    const b = fst(t);
    const s = snd(t);
    return review(g, Tuple(b2a(b), review(a2gsb(b2a(b)), Tuple(b, s))))
  },
  s => preview(g, s).chain(t => preview(a2gsb(fst(t)), snd(t)))
);

// A Grammar that matches the third given Grammar between the first and second given Grammars
//:: Grammar s () -> Grammar s () -> Grammar s a -> Grammar s a
const between = (lG, rG, mG) => seqR(lG, seqL(mG, rG));

// A Grammar that matches the given Grammar and discards the result
//:: Grammar s a -> a -> Grammar s ()
const match = (g, a) => adapt(iso(_ => (Unit), _ => a), g);

// A Grammar that consumes the given element, producing a Unit result
//:: (Cons s s a a, Eq a) => a -> Grammar s ()
const literal = a => match(symbol(a), a);

// A Grammar that defaults to the given value if the given Grammar fails to parse. The value
// will not be printed if the value to print equals the given default value.
//:: Eq a => a -> Grammar s a -> Grammar s a
const def = (a, g) => adapt(
  iso(either(a => a, b => b), b => b === a ? Right(b) : Left(b)),
  choose(g, success(a))
);

// A Grammar that will optionally match the given Grammar
//:: Grammar s a -> Grammar s (Maybe a)
const opt = g => adapt(
  iso(
    either(Just, Nothing),
    maybe(Right(Unit), Left)
  ),
  choose(g, success(Unit))
);

// A Grammar that matches an empty string
//:: Cons s s a a => Grammar s ()
const eof = prism_(
  snd,
  s => maybe(Just(Tuple(Unit, s)), _ => Nothing(), uncons(s))
);

// A Grammar that matches a single digit
const digit = satisfy(c => /[0-9]/.test(c));

// A Grammar that matches a single character of the alphabet
const alpha = satisfy(c => /[a-zA-Z]/.test(c));

// A Grammar that matches an positive or negative integer value
const integer = adapt(
  compose(iso(
    t => {
      const c = fst(t);
      const s = snd(t);
      return maybe(s, a => [a, ...s], c)
    },
    a => Tuple(Nothing(), a)
  ), charListToStr, intToString),
  both(opt(symbol('-')), many(digit))
);

//:: Grammar s b -> s -> Maybe b
const parse = g => s => preview(g, s).map(fst);

//:: Grammar s b -> b -> s
const print = g => b => review(g, Tuple(b, ''));

module.exports = {
  adapt,
  alpha,
  aside,
  between,
  bind,
  both,
  choose,
  def,
  digit,
  element,
  eof,
  failure,
  integer,
  literal,
  many,
  many1,
  match,
  opt,
  parse,
  print,
  replicate,
  satisfy,
  seqL,
  seqR,
  success,
  symbol
};

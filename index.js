const fetch = require('node-fetch');
const Task = require('data.task');
const R = require('ramda');

// Names to include/exclude with the result.
const INCLUDE = [];
const EXCLUDE = ['Jim F.'];

// Get RSVPs for this talk and return a Task.
//
// For more on Task, see:
//     https://github.com/jimf/fp-cheetsheet/blob/master/promises-as-futures.md
//
// :: -> Task
const getRsvps = () => {
    return new Task((reject, resolve) => {
        fetch('http://api.meetup.com/Bucks-Co-Js/events/230520592/rsvps')
            .then(res => res.json())
            .then(resolve)
            .catch(reject);
    });
};

// Test whether RSVP entry responded with a "yes".
// :: RSVP -> Boolean
const rsvpedYes = R.propSatisfies(R.equals('yes'), 'response');

// Test whether RSVP entry member name is in the exclusion list.
// :: RSVP -> Boolean
const nameExcluded = R.pathSatisfies(
    R.contains(R.__, EXCLUDE), ['member', 'name']);

// Complement of nameExcluded for filter/reject ease.
const nameNotExcluded = R.complement(nameExcluded);

// Extract name from RSVP.
// :: RSVP -> String
const getName = R.path(['member', 'name']);

// Transform result into the names of members who RSVPed "yes".
// :: {RSVPs} -> [String]
const rsvpedYesNames = R.compose(R.map(getName),
                                 R.filter(R.both(rsvpedYes, nameNotExcluded)),
                                 R.values);

// Compose list of names for consideration in the giveaway.
// :: -> Task
const getNamesForGiveaway = R.compose(
    R.map(R.compose(R.concat(INCLUDE), rsvpedYesNames)),
    getRsvps
);

// Super-simplistic deterministic pseudo-random number generator for demo
// purposes. Returns a number between 1 and 100 (inclusive) based on the
// given input.
//
// See: https://cdsmith.wordpress.com/2011/10/10/build-your-own-simple-random-numbers/
//
// :: Number -> Number
const random = i => 7 * i % 101;

// Create an rng based on a given initial seed value. Calling the resulting
// rng function returns values between 0 (inclusive) and 1 (exclusive).
// :: Number -> void -> Number
const makeRng = seed => {
    var state = seed;
    return () => {
        state = random(state);
        return (state - 1) / 100;
    };
};

// Scale a [0, 1] range decimal to a [min, max] int range. Max is exclusive.
// :: Integer -> Integer -> Decimal -> Integer
const scaleToRange = R.curry((min, max, decimal) =>
    Math.floor(decimal * (max - min) + min));

// Given a [0, 1] range and an array of values, scale range to an index in the
// value array and return the value at that index.
// :: Decimal -> [a] -> a
const lottery = (dec, values) =>
    R.nth(scaleToRange(0, values.length, dec), values);


const program = rand => R.lift(lottery)(Task.of(rand), getNamesForGiveaway());

// console.log(R.times(R.compose(scaleToRange(0, 17), rng), 100));

const rng = makeRng(Date.now());
program(rng()).fork(console.warn, console.log);

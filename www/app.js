(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var buildComment = function buildComment(settings, grammar) {
  var gameEvent = settings.gameEvent;
  var mlustard = settings.mlustard; // check for game status

  switch (mlustard.gameStatus) {
    case 'beforeFirstPitch':
      return grammar.flatten('#gameStart#');
      break;

    case 'firstHalfInningStart':
      if (gameEvent.inning === 0) {
        return grammar.flatten('#inningOneStart#');
      } else {
        return grammar.flatten('#inningStart#');
      }

      break;

    case 'secondHalfInningStart':
      return grammar.flatten('#inningStart#');
      break;

    default:
      break;
  }

  var comment = ''; // check for outs

  if (mlustard.out) {
    if (mlustard.gameStatus === 'halfInningEnd') {
      comment += grammar.flatten('#lastOutOfInning#');
    } else {
      comment += grammar.flatten('#out#');
    }
  } // check for score


  if (mlustard.runsScored !== 0 || mlustard.unrunsScored !== 0 || // score change due to salmon stealing runs
  mlustard.special && mlustard.specialMeta.kind === 'salmon' && mlustard.specialMeta.details && mlustard.specialMeta.details.runsStolen.length || // score change from sun 2 smiling
  mlustard.special && mlustard.specialMeta.kind === 'sun2' || // score change from black hole swallowing
  mlustard.special && mlustard.specialMeta.kind === 'blackHole') {
    if (comment) {
      comment += grammar.flatten('#scoreAddon#');
    } else {
      comment += grammar.flatten('#score#');
    }
  } // check if a batter just showed up at the plate


  if (mlustard.batterUp && gameEvent.baserunnerCount) {
    comment += grammar.flatten('#batterUpRunners#');
  } // return the comment if it was created, otherwise the original update if it
  // exists, otherwise an empty string


  return comment || gameEvent.lastUpdate || '';
};

module.exports = {
  buildComment: buildComment
};
},{}],2:[function(require,module,exports){
"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var tracery = require('tracery-grammar');

var mods = require('./tracery-mods');

var quips = require('./quips.json');

var init = function init(settings) {
  var seed = settings.seed;
  var gameEvent = settings.gameEvent;
  var mlustard = settings.mlustard;
  var overrides = settings.overrides;
  var level = settings.level;

  if (seed !== undefined) {
    tracery.setRandom(function () {
      return seed;
    });
  }

  var grammar = tracery.createGrammar({}); // populate data from gameEvent

  var _iterator = _createForOfIteratorHelper(quips.data),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _field3 = _step.value;
      var data = gameEvent[_field3];

      if (data !== undefined) {
        // some data needs massaging
        switch (_field3) {
          case 'inning':
            data = (data + 1).toString();
            break;

          case 'topOfInning':
            data = data ? 'top' : 'bottom';
            break;

          case 'halfInningOuts':
          case 'homeScore':
          case 'awayScore':
            data = data.toString();
            break;

          default:
            break;
        }

        grammar.pushRules(_field3, data);
      } else {
        grammar.pushRules(_field3, '');
      }
    } // current pitcher

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var cPitcher = gameEvent.topOfInning ? gameEvent.homePitcherName : gameEvent.awayPitcherName;
  grammar.pushRules('cPitcher', cPitcher); // current batter (can be an empty string if nobody batting)

  var cBatter = gameEvent.homeBatterName || gameEvent.awayBatterName;
  grammar.pushRules('cBatter', cBatter); // pitching team nickname

  var pNick = gameEvent.topOfInning ? '#hNick#' : '#aNick#';
  grammar.pushRules('pNick', pNick); // batting team nickname

  var bNick = gameEvent.topOfInning ? '#aNick#' : '#hNick#';
  grammar.pushRules('bNick', bNick); // leading & trailing team nicknames and scores

  var lTeam;
  var tTeam;
  var lScore;
  var tScore;

  if (gameEvent.awayScore > gameEvent.homeScore) {
    lTeam = '#aNick#';
    tTeam = '#hNick#';
    lScore = '#aScore#';
    tScore = '#hScore#';
  } else {
    lTeam = '#hNick#';
    tTeam = '#aNick#';
    lScore = '#hScore#';
    tScore = '#aScore#';
  }

  grammar.pushRules('lTeam', lTeam);
  grammar.pushRules('tTeam', tTeam);
  grammar.pushRules('lScore', lScore);
  grammar.pushRules('tScore', tScore); // set base runners

  if (gameEvent.baserunnerCount >= 3) {
    grammar.pushRules('runners', '#basesLoaded#');
  } else if (gameEvent.baserunnerCount > 0) {
    grammar.pushRules('runners', '#runnersOnBase#');
  }

  var bases = '';

  for (var _i = 0, _Object$keys = Object.keys(mlustard.baseRunners); _i < _Object$keys.length; _i++) {
    var base = _Object$keys[_i];

    if (mlustard.baseRunners[base].playerId) {
      bases += "".concat(base, " ");
    }
  }

  grammar.pushRules('basesOcc', bases.trim()); // build quips shortcuts

  for (var field in quips.shortcuts) {
    grammar.pushRules(field, quips.shortcuts[field]);
  } // build quips grammar


  for (var _field in quips[level]) {
    grammar.pushRules(_field, quips[level][_field]);
  } // do quip overrides


  for (var _field2 in overrides) {
    grammar.pushRules(_field2, overrides[_field2]);
  } // add mods


  grammar.addModifiers(tracery.baseEngModifiers);
  grammar.addModifiers(mods);
  return grammar;
};

module.exports = {
  init: init
};
},{"./quips.json":4,"./tracery-mods":5,"tracery-grammar":16}],3:[function(require,module,exports){
"use strict";

var mlustard = require('mlustard');

var grammar = require('./grammar');

var commentary = require('./commentary');
/*
 * @settings is an object with the following props:
 *   - gameEvent: the game event object (from the stream or chronicler)
 *   - mlustard (optional): mlustard data for the gameEvent
 *   - seed (optional): a seed, for deterministic comment generation
 *   - level (optional, defaults to 'minimal'): the commentary level, one of
 *     - minimal: adds a few comments to update on game status at key comments
 *   - overrides (optional): object with quip overrides
 */


var getComment = function getComment(settings) {
  if (!settings.gameEvent) {
    return '';
  }

  settings.mlustard = settings.mlustard || mlustard.analyzeGameEvent(settings.gameEvent);
  settings.level = settings.level || 'minimal';
  settings.overrides = settings.overrides || {};
  var gr = grammar.init(settings);

  if (!gr) {
    return '';
  }

  return commentary.buildComment(settings, gr);
};

module.exports = {
  getComment: getComment
};
},{"./commentary":1,"./grammar":2,"mlustard":10}],4:[function(require,module,exports){
module.exports={"data":["inning","topOfInning","halfInningOuts","homeTeamName","awayTeamName","homeTeamNickname","awayTeamNickname","homeScore","awayScore","homeOdds","awayOdds","homePitcherName","awayPitcherName","lastUpdate","scoreUpdate"],"minimal":{"matchup":["#hNick# vs #aNick#","#aNick# at #hNick#"],"topOrBot":"#topOfInning#","inningFull":"#topOrBot# of #inning#","gameStart":"#matchup#. #pitchers#. #original#","score":"#original# It's #lTeam.the# #lScore# and #tTeam.the# #tScore#.","scoreAddon":" It's #lTeam.the# #lScore# and #tTeam.the# #tScore#.","inningStart":"#original# #cPitcher# pitching for #pNick.the#.","inningOneStart":"#original#","pitchers":["#hPitcher# pitching for #hNick.the#, #aPitcher# for #aNick.the#","Our pitchers are #hPitcher# for #hNick.the#, and #aPitcher# for #aNick.the#"],"out":"#original# #inningFull.capitalize#, #outs#.","outs":"#halfInningOuts.outs#","lastOutOfInning":"#original#","batterUpRunners":"#original# #runners.runnerPluralize#","runnersOnBase":"Runner on #basesOcc.and#.","basesLoaded":"Bases are loaded!"},"shortcuts":{"hPitcher":"#homePitcherName#","aPitcher":"#awayPitcherName#","hNick":"#homeTeamNickname#","aNick":"#awayTeamNickname#","hScore":"#homeScore#","aScore":"#awayScore#","original":"#lastUpdate##scoreUpdate.spaced#"}}
},{}],5:[function(require,module,exports){
"use strict";

module.exports = {
  the: function the(s) {
    return "the ".concat(s);
  },
  // counts the # of outs and pluralizes accordingly
  outs: function outs(s) {
    if (s === '1') {
      return "".concat(s, " out");
    } else {
      return "".concat(s, " outs");
    }
  },
  // oxford commas
  and: function and(s) {
    return s.split(' ').join(', ').replace(/, ([^,]*)$/, ' and $1');
  },
  // for pluralizing runner(s) on first[, second and third]
  runnerPluralize: function runnerPluralize(s) {
    if (s.indexOf(',') >= 0 || s.indexOf('and') >= 0) {
      return s.replace('Runner', 'Runners');
    } else {
      return s;
    }
  },
  // adds a space before the word
  spaced: function spaced(s) {
    if (s) {
      return " ".concat(s);
    } else {
      return '';
    }
  }
};
},{}],6:[function(require,module,exports){
"use strict";

//const util = require('./util');
var BASES = ['first', 'second', 'third', 'fourth'];

var check = function check(analysis, eventData) {
  //const update = util.getUpdateText(eventData);
  if (eventData.baserunnerCount) {
    // i represents the order of baserunners
    // basesOccupied[i] is the base they are on, 0-indexed
    for (var i = 0; i < eventData.basesOccupied.length; i++) {
      var _eventData$baseRunner;

      var base = eventData.basesOccupied[i];
      analysis.baseRunners[BASES[base]] = {
        playerName: ((_eventData$baseRunner = eventData.baseRunnerNames) === null || _eventData$baseRunner === void 0 ? void 0 : _eventData$baseRunner[i]) || '',
        playerId: eventData.baseRunners[i]
      };
    }

    return true;
  }

  return false;
};

module.exports = {
  check: check
};
},{}],7:[function(require,module,exports){
"use strict";

var util = require('./util');

var check = function check(analysis, eventData) {
  var _eventData$homeTeamNi, _eventData$awayTeamNi;

  var update = util.getUpdateText(eventData);
  var home = (eventData === null || eventData === void 0 ? void 0 : (_eventData$homeTeamNi = eventData.homeTeamNickname) === null || _eventData$homeTeamNi === void 0 ? void 0 : _eventData$homeTeamNi.toLowerCase()) || '';
  var homeScore = (eventData === null || eventData === void 0 ? void 0 : eventData.homeScore) || 0;
  var away = (eventData === null || eventData === void 0 ? void 0 : (_eventData$awayTeamNi = eventData.awayTeamNickname) === null || _eventData$awayTeamNi === void 0 ? void 0 : _eventData$awayTeamNi.toLowerCase()) || '';
  var awayScore = (eventData === null || eventData === void 0 ? void 0 : eventData.awayScore) || 0;

  if (update.indexOf('play ball') >= 0) {
    analysis.gameStatus = 'beforeFirstPitch';
  } else if (update.indexOf('top of') >= 0) {
    analysis.gameStatus = 'firstHalfInningStart';
  } else if (update.indexOf('bottom of') >= 0) {
    analysis.gameStatus = 'secondHalfInningStart';
  } else if (update.indexOf('game over') >= 0 || update.indexOf("".concat(home, " ").concat(homeScore, ", ").concat(away, " ").concat(awayScore)) >= 0 || update.indexOf("".concat(away, " ").concat(awayScore, ", ").concat(home, " ").concat(homeScore)) >= 0) {
    analysis.gameStatus = 'gameEnd';
  }

  if (analysis.gameStatus) {
    return analysis;
  }

  return false;
};

module.exports = {
  check: check
};
},{"./util":14}],8:[function(require,module,exports){
"use strict";

var util = require('./util');

var checkHitRbiPreS12 = function checkHitRbiPreS12(analysis, update) {
  // from some non-exhaustive research, i think there weren't any grand slams
  // pre-s12 that were not 4 runs
  if (analysis.hitMeta.kind === 'grandSlam') {
    analysis.runsScored = 4;
    return;
  } // if a single/double/triple was hit & x runs were scored, it shows up
  // at the end of the update as "...! x scores"


  var runs = util.getNumber(update, /! /, / scores/) || 0;

  if (runs) {
    analysis.runsScored = runs;
    return;
  } // if a solo home run was hit, update contains the text "solo home run"


  if (update.indexOf('solo home run') >= 0) {
    analysis.runsScored = 1;
    return;
  } // if a multi-run home run was hit, update contains the text "x-run home
  // run"


  runs = util.getNumber(update, null, /-run home run/) || 0;

  if (runs) {
    analysis.runsScored = runs;
    return;
  }
};

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);

  if (update.indexOf('hits a single') >= 0) {
    analysis.hitMeta.kind = 'single';
  } else if (update.indexOf('hits a double') >= 0) {
    analysis.hitMeta.kind = 'double';
  } else if (update.indexOf('hits a triple') >= 0) {
    analysis.hitMeta.kind = 'triple';
  } else if (update.indexOf('home run') >= 0) {
    analysis.hitMeta.kind = 'homeRun';
  } else if (update.indexOf('grand slam') >= 0) {
    analysis.hitMeta.kind = 'grandSlam';
  }

  if (analysis.hitMeta.kind) {
    analysis.hit = true; // check if home run / grand slam landed in big bucket

    if (update.indexOf('ball lands in a big bucket') >= 0) {
      analysis.hitMeta.bigBucket = true;
    } //from s12 onward, scores on the play are in the scoreUpdate field
    //const scoreUpdate = eventData?.scoreUpdate || '';
    //if (scoreUpdate) {
    //analysis.runsScored = util.getNumber(scoreUpdate, null, null) || 0;
    // if there's no scoreUpdate, deduce the score from the update
    // this is the case for games between s2 & s11


    if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate)) {
      checkHitRbiPreS12(analysis, update);
    } // score updates from s12 onward registered in src/misc.js


    return true;
  }

  return false;
};

module.exports = {
  check: check
};
},{"./util":14}],9:[function(require,module,exports){
"use strict";

var util = require('./util');

var checkMaximumBlaseball = function checkMaximumBlaseball(analysis, eventData) {
  var balls, bases, outs, strikes;

  if (eventData.topOfInning) {
    // away is batting
    balls = eventData.awayBalls;
    bases = eventData.awayBases;
    outs = eventData.awayOuts;
    strikes = eventData.awayStrikes;
  } else {
    // home is batting
    balls = eventData.homeBalls;
    bases = eventData.homeBases;
    outs = eventData.homeOuts;
    strikes = eventData.homeStrikes;
  }

  if (eventData.halfInningOuts === outs - 1 && eventData.atBatBalls === balls - 1 && eventData.atBatStrikes === strikes - 1 && eventData.baserunnerCount === bases - 1) {
    analysis.maximumBlaseball = true;
  }
};

var checkScoreUpdate = function checkScoreUpdate(analysis, eventData) {
  var _eventData$scoreUpdat;

  var scoreUpdate = eventData === null || eventData === void 0 ? void 0 : (_eventData$scoreUpdat = eventData.scoreUpdate) === null || _eventData$scoreUpdat === void 0 ? void 0 : _eventData$scoreUpdat.toLowerCase();

  if (scoreUpdate) {
    analysis.runsScored = util.getNumber(scoreUpdate, null, / runs? score/);
    analysis.unrunsScored = util.getNumber(scoreUpdate, null, / unruns? score/);
  }
};

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);
  checkScoreUpdate(analysis, eventData);
  checkMaximumBlaseball(analysis, eventData); // check for whether a batter just showed up to bat

  if (update.indexOf('batting for') >= 0) {
    analysis.batterUp = true;
  }
};

module.exports = {
  check: check
};
},{"./util":14}],10:[function(require,module,exports){
"use strict";

var gameStatus = require('./game-status');

var outs = require('./outs');

var hits = require('./hits');

var steals = require('./steals');

var walks = require('./walks');

var special = require('./special');

var misc = require('./misc');

var baseRunners = require('./base-runners');
/*
 * sets all known (aka implemented) analysis results to their defauls
 * return an object with the props:
 *
 * id: string || undefined
 *   - the game event ID
 *
 * runsScored: number
 *   - how many runs were scored on the play
 *
 * unrunsScored: number
 *   - how many unruns were scored on the play
 *
 * batterUp: boolean
 *   - whether a batter just showed up to bat
 *
 * gameStatus: null || string
 *   - will be null or one of:
 *   - beforeFirstPitch, when the first pitch hasn't been thrown yet
 *   - firstHalfInningStart, when the first half of an inning is starting
 *   - secondHalfInningStart, when the second half of an inning is starting
 *   - halfInningEnd, when any half of an inning is ending on the play
 *   - gameEnd, when the game has ended
 *   - inningRewind, when the salmon swim upstream
 *
 * out: boolean
 *   - true when there is an out on the play
 * outMeta: object, with the props:
 *   - kind: null || string
 *     - will be one of:
 *     - fly
 *     - ground
 *     - strike
 *     - caughtStealing
 *     - unspecified (as you sometimes see with sacrifice outs)
 *   - sacrifice: boolean
 *     - true when the out was a sacrifice
 *   - sacrificeMeta: object, with the following props:
 *     - kind: string || null
 *       - will be one of:
 *       - advance
 *       - score
 *   - freeRefill: boolean
 *     - true when batter used their free refill on the play
 *
 * hit: boolean
 *   - true when there is a hit on the play
 * hitMeta: object, with the props:
 *   - kind: null || string
 *     - will be one of:
 *     - single
 *     - double
 *     - triple
 *     - homeRun
 *     - grandSlam
 *   - bigBucket: boolean
 *     - whether a Big Bucket was activated on the play
 *
 * steal: boolean
 *   - true when there is an attempted steal on the play
 * stealMeta: object, with the props:
 *   - success: boolean
 *     - true when thief not caught, false otherwise
 *   - baseStolen: null || number
 *     - the base which was stolen (0-indexed)
 *
 * walk: boolean
 *   - true when there is a walk on the play
 * walkMeta: object, with the props:
 *   - mindTrick: boolean
 *     - true when the pitches used a mind trick to turn the walk into a
 *       strikeout
 *
 * special: boolean
 *   - true when there was a special event on the play
 * specialMeta: object, with the props:
 *   - kind: null || string
 *     - will be one of:
 *     - bloodrain
 *     - isPartying
 *     - reverb
 *     - birdsCircle
 *     - birdsPecked
 *     - justBirds
 *     - allergicReaction
 *     - incinerated
 *     - becameMagmatic
 *     - feedback
 *     - electricity
 *     - unstable
 *     - flickering
 *     - consumersAttack
 *     - salmon
 *   - details: object, with props depending on the type of event
 *
 * baseRunners: object with the following props, representing bases
 *   - first
 *   - second
 *   - third
 *   - fourth
 *   - if there is a baserunner on the given base, the value for that base
 *     will be an object with the following props:
 *     - playerName
 *     - playerId
 *
 * maximumBlaseball: boolean
 *   - true when we're at MAXIMUM BLASEBALL
 */


var initAnalysis = function initAnalysis(eventData) {
  return {
    id: eventData.id || eventData._id,
    gameStatus: null,
    runsScored: 0,
    unrunsScored: 0,
    batterUp: false,
    out: false,
    outMeta: {
      kind: null,
      sacrifice: false,
      sacrificeMeta: {
        kind: null
      },
      freeRefill: false
    },
    hit: false,
    hitMeta: {
      kind: null,
      bigBucket: false
    },
    steal: false,
    stealMeta: {
      success: null,
      baseStolen: null
    },
    walk: false,
    walkMeta: {
      mindTrick: false
    },
    special: false,
    specialMeta: {
      kind: null
    },
    baseRunners: {
      first: {},
      second: {},
      third: {},
      fourth: {}
    },
    maximumBlaseball: false
  };
};

var analyzeGameEvent = function analyzeGameEvent(eventData) {
  if (!eventData) {
    return null;
  }

  var analysis = initAnalysis(eventData);
  var checkers = [gameStatus, outs, hits, walks, steals, special, misc, baseRunners];

  for (var _i = 0, _checkers = checkers; _i < _checkers.length; _i++) {
    var checker = _checkers[_i];
    checker.check(analysis, eventData);
  }

  return analysis;
};

module.exports = {
  analyzeGameEvent: analyzeGameEvent
};
},{"./base-runners":6,"./game-status":7,"./hits":8,"./misc":9,"./outs":11,"./special":12,"./steals":13,"./walks":15}],11:[function(require,module,exports){
"use strict";

var util = require('./util');

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);

  if (update.indexOf('flyout') >= 0) {
    analysis.outMeta.kind = 'fly';
  } else if (update.indexOf('ground out') >= 0) {
    analysis.outMeta.kind = 'ground';
  } else if (update.indexOf('strikes out') >= 0) {
    analysis.outMeta.kind = 'strike';
  } else if (update.indexOf('fielder\'s choice') >= 0) {
    analysis.outMeta.kind = 'fieldersChoice';
  } else if (update.indexOf('a double play') >= 0) {
    analysis.outMeta.kind = 'doublePlay';
  }

  if (update.indexOf('sacrifice') >= 0) {
    // this may already be a ground/flyout, or its unspecified
    analysis.outMeta.kind = analysis.outMeta.kind || 'unspecified';
    analysis.outMeta.sacrifice = true; // check if someone scored or advanced on the sacrifice

    if (update.indexOf('scores') >= 0) {
      analysis.outMeta.sacrificeMeta.kind = 'score';

      if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate)) {
        analysis.runsScored = 1;
      } // otherwise scores are captured in src/misc.js

    } else if (update.indexOf('advance') >= 0) {
      analysis.outMeta.sacrificeMeta.kind = 'advance';
    }
  }

  if (analysis.outMeta.kind) {
    analysis.out = true;

    if ((eventData === null || eventData === void 0 ? void 0 : eventData.halfInningOuts) === 0) {
      analysis.gameStatus = 'halfInningEnd';
    }

    if (update.indexOf('free refill') >= 0) {
      analysis.outMeta.freeRefill = true;
    }

    if (update.indexOf('uses a mind trick') >= 0) {
      analysis.outMeta.mindTrick = true;
    }

    return true;
  }

  return false;
};

module.exports = {
  check: check
};
},{"./util":14}],12:[function(require,module,exports){
"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var util = require('./util');

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);

  if (update.indexOf('blooddrain') >= 0) {
    analysis.specialMeta.kind = 'blooddrain';
  } else if (update.indexOf('is partying') >= 0) {
    analysis.specialMeta.kind = 'isPartying';
  } else if (update.indexOf('reverb') >= 0) {
    analysis.specialMeta.kind = 'reverb';
  } else if ( // this check has to come before birds circle, because the text
  // 'the birds circle' is present in both cases
  update.indexOf('the birds pecked') >= 0) {
    analysis.specialMeta.kind = 'birdsPecked';
  } else if (update.indexOf('the birds circle') >= 0) {
    analysis.specialMeta.kind = 'birdsCircle';
  } else if ( // this is to capture any other non-pecking & non-circling birdiness
  update.indexOf('birds') >= 0) {
    analysis.specialMeta.kind = 'justBirds';
  } else if (update.indexOf('had an allergic reaction') >= 0) {
    analysis.specialMeta.kind = 'allergicReaction';
  } else if (update.indexOf('rogue umpire incinerated') >= 0) {
    analysis.specialMeta.kind = 'incinerated';
  } else if (update.indexOf('became magmatic') >= 0) {
    analysis.specialMeta.kind = 'becameMagmatic';
  } else if (update.indexOf('feedback') >= 0 && (update.indexOf('reality flickers') >= 0 || update.indexOf('switched teams') >= 0)) {
    analysis.specialMeta.kind = 'feedback';
  } else if (update.indexOf('the electricity zaps') >= 0) {
    analysis.specialMeta.kind = 'electricity';
  } else if (update.indexOf('is now unstable') >= 0) {
    analysis.specialMeta.kind = 'unstable';
  } else if (update.indexOf('is now flickering') >= 0) {
    analysis.specialMeta.kind = 'flickering';
  } else if (update.indexOf('consumers attack') >= 0) {
    if (update.indexOf('defends') >= 0) {
      analysis.specialMeta.kind = 'consumersAttackDefended';
    } else {
      analysis.specialMeta.kind = 'consumersAttack';
    }
  } else if (update.indexOf('salmon swim upstream') >= 0) {
    analysis.specialMeta.kind = 'salmon';
    analysis.gameStatus = 'inningRewind'; // first, grab all the sentences with which team lost how many runs

    var teams = update.match(/(\d+(\.\d+)?) of the .*'s runs are lost/g);

    if (teams) {
      var runsStolen = teams.map(function (team) {
        return util.getNumber(team, null, null) || 0;
      });
      var runsStolenFrom = teams.map(function (team) {
        return util.getTeam(eventData, team, /of the /, /'s runs/);
      });
      analysis.specialMeta.details = {
        runsStolen: runsStolen,
        runsStolenFrom: runsStolenFrom
      };
    }
  } else if (update.indexOf('runs are overflowing') >= 0) {
    analysis.specialMeta.kind = 'runsOverflowing';
    analysis.specialMeta.details = {
      runsGained: util.getNumber(update, null, / unruns/),
      runsOverflowingFor: util.getTeam(eventData, update, /\n/, / gain/)
    };
  } else if (update.indexOf('solar panels absorb') >= 0) {
    analysis.specialMeta.kind = 'runsCollected';
    analysis.specialMeta.details = {
      runsCollected: util.getNumber(update, null, / runs are collected/),
      runsCollectedFrom: util.getTeam(eventData, update, /saved for the /, /'s next game/)
    };
  } else if (update.indexOf('sun 2 smiles') >= 0) {
    analysis.specialMeta.kind = 'sun2';
    analysis.specialMeta.details = {
      runsCollected: util.getNumber(update, null, /! sun 2 smiles/),
      winSetUpon: util.getTeam(eventData, update, /set a win upon the /, /\./)
    };
  } else if (update.indexOf('black hole swallows') >= 0) {
    analysis.specialMeta.kind = 'blackHole';
    analysis.specialMeta.details = {
      runsCollected: util.getNumber(update, /collect /, /!/),
      winSwallowedFrom: util.getTeam(eventData, update, /swallows the runs and a /, / win./)
    }; // see if carcinization triggered by the black hole

    if (update.indexOf('the baltimore crabs steal') >= 0) {
      analysis.specialMeta.details.playerStolen = util.getPlayer(update, /crabs steal /, / for the remainder/);
    }
  } else if (update.indexOf('grind rail') >= 0) {
    analysis.specialMeta.kind = 'grindRail';
    var tricks = util.getSkateTricks(update);
    analysis.specialMeta.details = _objectSpread({
      player: util.getPlayer(update, /^/, / hops on/)
    }, tricks);

    if (update.indexOf('safe!') >= 0) {
      analysis.specialMeta.details = _objectSpread(_objectSpread({}, analysis.specialMeta.details), {}, {
        grindSuccess: true
      });
    } else {
      // out!
      analysis.specialMeta.details = _objectSpread(_objectSpread({}, analysis.specialMeta.details), {}, {
        grindSuccess: false
      });
      analysis.out = true;
      analysis.outMeta.kind = 'railBail';
    }
  } // if we found something, then:


  if (analysis.specialMeta.kind) {
    analysis.special = true;
    return true;
  }

  return false;
};

module.exports = {
  check: check
};
},{"./util":14}],13:[function(require,module,exports){
"use strict";

var util = require('./util');

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);

  if (update.indexOf('steal') >= 0) {
    analysis.steal = true;

    if (update.indexOf('caught') >= 0) {
      analysis.stealMeta.success = false;
      analysis.out = true;
      analysis.outMeta.kind = 'caughtStealing';
    } else {
      analysis.stealMeta.success = true;
    } // baseStolen is 0-indexed


    if (update.search(/steal.*first/) !== -1) {
      analysis.stealMeta.baseStolen = 0;
    } else if (update.search(/steal.*second/) !== -1) {
      analysis.stealMeta.baseStolen = 1;
    } else if (update.search(/steal.*third/) !== -1) {
      analysis.stealMeta.baseStolen = 2;
    } else if (update.search(/steal.*fourth/) !== -1) {
      analysis.stealMeta.baseStolen = 3; // this may have been a run if there are 4 bases in play

      if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate) && analysis.stealMeta.success && (eventData === null || eventData === void 0 ? void 0 : eventData.homeBatter) !== null && (eventData === null || eventData === void 0 ? void 0 : eventData.awayBases) === 4) {
        analysis.runsScored = 1;
      } else if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate) && analysis.stealMeta.success && (eventData === null || eventData === void 0 ? void 0 : eventData.awayBatter) !== null && (eventData === null || eventData === void 0 ? void 0 : eventData.homeBases) === 4) {
        analysis.runsScored = 1;
      } // otherwise scores are captured in src/misc.js

    } else if (update.search(/steal.*home/) !== -1) {
      // see if home or away stole the base
      if ((eventData === null || eventData === void 0 ? void 0 : eventData.homeBatter) !== null) {
        analysis.stealMeta.baseStolen = (eventData === null || eventData === void 0 ? void 0 : eventData.awayBases) - 1 || 3;
      } else if ((eventData === null || eventData === void 0 ? void 0 : eventData.awaBatter) !== null) {
        analysis.stealMeta.baseStolen = (eventData === null || eventData === void 0 ? void 0 : eventData.homeBases) - 1 || 3;
      } else {
        // older games don't have these fields, or may have both
        // home and away batters filled in; just assumed home base
        // is base #3 in those cases, i guess
        analysis.stealMeta.baseStolen = 3;
      }

      if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate)) {
        analysis.runsScored = 1;
      } // otherwise scores are captured in src/misc.js

    } // check for blaserunning scores pre s-12 (otherwise captured in
    // src/misc.js)


    if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate) && update.indexOf('blaserunning') >= 0) {
      analysis.runsScored = util.getNumber(update, /scores /, / with blaserunning/);
    }
  }
};

module.exports = {
  check: check
};
},{"./util":14}],14:[function(require,module,exports){
"use strict";

var getUpdateText = function getUpdateText(eventData) {
  var _eventData$lastUpdate;

  return (eventData === null || eventData === void 0 ? void 0 : (_eventData$lastUpdate = eventData.lastUpdate) === null || _eventData$lastUpdate === void 0 ? void 0 : _eventData$lastUpdate.toLowerCase()) || '';
};
/*
 * will look through s for a number (supports positive integers & floats),
 * pre is regex to prepend to the regex for numbers
 * post is regex to append to the regex for numbers
 * will return a number or null
 */


var getNumber = function getNumber(s, pre, post) {
  var num = null;
  var numRegex = /((\d+)?(\.\d+)?)/;

  if (!pre) {
    pre = new RegExp('');
  }

  if (!post) {
    post = new RegExp('');
  }

  var regex = new RegExp(pre.source + numRegex.source + post.source);
  var matches = regex[Symbol.match](s);

  if (matches && matches[1]) {
    num = Number(matches[1]) || num;
  }

  return num;
};
/*
 * will look through s for a match between pre and post
 * pre is regex to prepend to the match
 * post is regex to append to the match
 * will return the match, or an empty string
 */


var getMatch = function getMatch(s, pre, post) {
  var matchRegex = /(.*)/;

  if (!pre) {
    pre = new RegExp('');
  }

  if (!post) {
    post = new RegExp('');
  }

  var regex = new RegExp(pre.source + matchRegex.source + post.source);
  var matches = regex[Symbol.match](s);

  if (matches && matches[1]) {
    return matches[1];
  }

  return '';
};
/*
 * will look through s for a team name
 * pre is regex to prepend to the regex for the team name
 * post is regex to append to the regex the team name
 * will return 'home' 'away' or ''
 */


var getTeam = function getTeam(eventData, s, pre, post) {
  var team = getMatch(s, pre, post);

  if (team) {
    team = eventData.homeTeamNickname.toLowerCase() === team ? 'home' : 'away';
  }

  return team;
};

var titleCase = function titleCase(s) {
  if (!s) {
    return;
  }

  ;
  return s.split(' ').map(function (word) {
    if (word) {
      return "".concat(word[0].toUpperCase()).concat(word.slice(1));
    }
  }).join(' ');
};
/*
 * will look through s for a player name
 * pre is regex to prepend to the regex for the team name
 * post is regex to append to the regex the team name
 * will return the player name or ''
 */


var getPlayer = function getPlayer(s, pre, post) {
  var player = getMatch(s, pre, post);
  return titleCase(player);
};

var getSkateTricks = function getSkateTricks(update) {
  var grindTrick, grindScore, landTrick, landScore;
  var tricks = update.match(/ a (.*) \((\d+)/g); // grind trick

  if (tricks[0]) {
    grindTrick = titleCase(getMatch(tricks[0], /a /, / \(/));
    grindScore = getNumber(tricks[0], /\(/, /$/);
  } // land trick


  if (tricks[1]) {
    landTrick = titleCase(getMatch(tricks[1], /a /, / \(/));
    landScore = getNumber(tricks[1], /\(/, /$/);
  }

  return {
    grindTrick: grindTrick,
    grindScore: grindScore,
    landTrick: landTrick,
    landScore: landScore
  };
};

module.exports = {
  getUpdateText: getUpdateText,
  getNumber: getNumber,
  getTeam: getTeam,
  getPlayer: getPlayer,
  getSkateTricks: getSkateTricks
};
},{}],15:[function(require,module,exports){
"use strict";

var util = require('./util');

var check = function check(analysis, eventData) {
  var update = util.getUpdateText(eventData);

  if (update.indexOf('draws a walk') >= 0) {
    analysis.walk = true; // check if any runs were scored on the play prior to s12

    if (!(eventData !== null && eventData !== void 0 && eventData.scoreUpdate) && update.indexOf('scores') >= 0) {
      analysis.runsScored = 1;
    } // otherwise scores captured in src/misc.js
    // check for mind trick shenanigans


    if (update.indexOf('uses a mind trick')) {
      analysis.walkMeta.mindTrick = true;

      if (update.indexOf('strikes out')) {
        analysis.out = true;
        analysis.outMeta.kind = 'strike';
      }
    }

    return true;
  }

  return false;
};

module.exports = {
  check: check
};
},{"./util":14}],16:[function(require,module,exports){
/**
 * @author Kate
 */

var tracery = function() {
    var random = Math.random;

    function setRandom(newRandom) {
        random = newRandom;
    }

    var TraceryNode = function(parent, childIndex, settings) {
        this.errors = [];

        // No input? Add an error, but continue anyways
        if (settings.raw === undefined) {
            this.errors.push("Empty input for node");
            settings.raw = "";
        }

        // If the root node of an expansion, it will have the grammar passed as the 'parent'
        //  set the grammar from the 'parent', and set all other values for a root node
        if ( parent instanceof tracery.Grammar) {
            this.grammar = parent;
            this.parent = null;
            this.depth = 0;
            this.childIndex = 0;
        } else {
            this.grammar = parent.grammar;
            this.parent = parent;
            this.depth = parent.depth + 1;
            this.childIndex = childIndex;
        }

        this.raw = settings.raw;
        this.type = settings.type;
        this.isExpanded = false;

        if (!this.grammar) {
            console.warn("No grammar specified for this node", this);
        }

    };

    TraceryNode.prototype.toString = function() {
        return "Node('" + this.raw + "' " + this.type + " d:" + this.depth + ")";
    };

    // Expand the node (with the given child rule)
    //  Make children if the node has any
    TraceryNode.prototype.expandChildren = function(childRule, preventRecursion) {
        this.children = [];
        this.finishedText = "";

        // Set the rule for making children,
        // and expand it into section
        this.childRule = childRule;
        if (this.childRule !== undefined) {
            var sections = tracery.parse(childRule);

            // Add errors to this
            if (sections.errors.length > 0) {
                this.errors = this.errors.concat(sections.errors);

            }

            for (var i = 0; i < sections.length; i++) {
                this.children[i] = new TraceryNode(this, i, sections[i]);
                if (!preventRecursion)
                    this.children[i].expand(preventRecursion);

                // Add in the finished text
                this.finishedText += this.children[i].finishedText;
            }
        } else {
            // In normal operation, this shouldn't ever happen
            this.errors.push("No child rule provided, can't expand children");
            console.warn("No child rule provided, can't expand children");
        }
    };

    // Expand this rule (possibly creating children)
    TraceryNode.prototype.expand = function(preventRecursion) {

        if (!this.isExpanded) {
            this.isExpanded = true;

            this.expansionErrors = [];

            // Types of nodes
            // -1: raw, needs parsing
            //  0: Plaintext
            //  1: Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod")
            //  2: Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future)

            switch(this.type) {
            // Raw rule
            case -1:

                this.expandChildren(this.raw, preventRecursion);
                break;

            // plaintext, do nothing but copy text into finsihed text
            case 0:
                this.finishedText = this.raw;
                break;

            // Tag
            case 1:
                // Parse to find any actions, and figure out what the symbol is
                this.preactions = [];
                this.postactions = [];

                var parsed = tracery.parseTag(this.raw);

                // Break into symbol actions and modifiers
                this.symbol = parsed.symbol;
                this.modifiers = parsed.modifiers;

                // Create all the preactions from the raw syntax
                for (var i = 0; i < parsed.preactions.length; i++) {
                    this.preactions[i] = new NodeAction(this, parsed.preactions[i].raw);
                }
                for (var i = 0; i < parsed.postactions.length; i++) {
                    //   this.postactions[i] = new NodeAction(this, parsed.postactions[i].raw);
                }

                // Make undo actions for all preactions (pops for each push)
                for (var i = 0; i < this.preactions.length; i++) {
                    if (this.preactions[i].type === 0)
                        this.postactions.push(this.preactions[i].createUndo());
                }

                // Activate all the preactions
                for (var i = 0; i < this.preactions.length; i++) {
                    this.preactions[i].activate();
                }

                this.finishedText = this.raw;

                // Expand (passing the node, this allows tracking of recursion depth)

                var selectedRule = this.grammar.selectRule(this.symbol, this, this.errors);

                this.expandChildren(selectedRule, preventRecursion);

                // Apply modifiers
                // TODO: Update parse function to not trigger on hashtags within parenthesis within tags,
                //   so that modifier parameters can contain tags "#story.replace(#protagonist#, #newCharacter#)#"
                for (var i = 0; i < this.modifiers.length; i++) {
                    var modName = this.modifiers[i];
                    var modParams = [];
                    if (modName.indexOf("(") > 0) {
                        var regExp = /\(([^)]+)\)/;

                        // Todo: ignore any escaped commas.  For now, commas always split
                        var results = regExp.exec(this.modifiers[i]);
                        if (!results || results.length < 2) {
                        } else {
                            var modParams = results[1].split(",");
                            modName = this.modifiers[i].substring(0, modName.indexOf("("));
                        }

                    }

                    var mod = this.grammar.modifiers[modName];

                    // Missing modifier?
                    if (!mod) {
                        this.errors.push("Missing modifier " + modName);
                        this.finishedText += "((." + modName + "))";
                    } else {
                        this.finishedText = mod(this.finishedText, modParams);

                    }

                }

                // Perform post-actions
                for (var i = 0; i < this.postactions.length; i++) {
                    this.postactions[i].activate();
                }
                break;
            case 2:

                // Just a bare action?  Expand it!
                this.action = new NodeAction(this, this.raw);
                this.action.activate();

                // No visible text for an action
                // TODO: some visible text for if there is a failure to perform the action?
                this.finishedText = "";
                break;

            }

        } else {
            //console.warn("Already expanded " + this);
        }

    };

    TraceryNode.prototype.clearEscapeChars = function() {

        this.finishedText = this.finishedText.replace(/\\\\/g, "DOUBLEBACKSLASH").replace(/\\/g, "").replace(/DOUBLEBACKSLASH/g, "\\");
    };

    // An action that occurs when a node is expanded
    // Types of actions:
    // 0 Push: [key:rule]
    // 1 Pop: [key:POP]
    // 2 function: [functionName(param0,param1)] (TODO!)
    function NodeAction(node, raw) {
        /*
         if (!node)
         console.warn("No node for NodeAction");
         if (!raw)
         console.warn("No raw commands for NodeAction");
         */

        this.node = node;

        var sections = raw.split(":");
        this.target = sections[0];

        // No colon? A function!
        if (sections.length === 1) {
            this.type = 2;

        }

        // Colon? It's either a push or a pop
        else {
            this.rule = sections[1];
            if (this.rule === "POP") {
                this.type = 1;
            } else {
                this.type = 0;
            }
        }
    }


    NodeAction.prototype.createUndo = function() {
        if (this.type === 0) {
            return new NodeAction(this.node, this.target + ":POP");
        }
        // TODO Not sure how to make Undo actions for functions or POPs
        return null;
    };

    NodeAction.prototype.activate = function() {
        var grammar = this.node.grammar;
        switch(this.type) {
        case 0:
            // split into sections (the way to denote an array of rules)
            this.ruleSections = this.rule.split(",");
            this.finishedRules = [];
            this.ruleNodes = [];
            for (var i = 0; i < this.ruleSections.length; i++) {
                var n = new TraceryNode(grammar, 0, {
                    type : -1,
                    raw : this.ruleSections[i]
                });

                n.expand();

                this.finishedRules.push(n.finishedText);
            }

            // TODO: escape commas properly
            grammar.pushRules(this.target, this.finishedRules, this);
            break;
        case 1:
            grammar.popRules(this.target);
            break;
        case 2:
            grammar.flatten(this.target, true);
            break;
        }

    };

    NodeAction.prototype.toText = function() {
        switch(this.type) {
        case 0:
            return this.target + ":" + this.rule;
        case 1:
            return this.target + ":POP";
        case 2:
            return "((some function))";
        default:
            return "((Unknown Action))";
        }
    };

    // Sets of rules
    // Can also contain conditional or fallback sets of rulesets)
    function RuleSet(grammar, raw) {
        this.raw = raw;
        this.grammar = grammar;
        this.falloff = 1;

        if (Array.isArray(raw)) {
            this.defaultRules = raw;
        } else if ( typeof raw === 'string' || raw instanceof String) {
            this.defaultRules = [raw];
        } else if (raw === 'object') {
            // TODO: support for conditional and hierarchical rule sets
        }

    };

    RuleSet.prototype.selectRule = function(errors) {
        // console.log("Get rule", this.raw);
        // Is there a conditional?
        if (this.conditionalRule) {
            var value = this.grammar.expand(this.conditionalRule, true);
            // does this value match any of the conditionals?
            if (this.conditionalValues[value]) {
                var v = this.conditionalValues[value].selectRule(errors);
                if (v !== null && v !== undefined)
                    return v;
            }
            // No returned value?
        }

        // Is there a ranked order?
        if (this.ranking) {
            for (var i = 0; i < this.ranking.length; i++) {
                var v = this.ranking.selectRule();
                if (v !== null && v !== undefined)
                    return v;
            }

            // Still no returned value?
        }

        if (this.defaultRules !== undefined) {
            var index = 0;
            // Select from this basic array of rules

            // Get the distribution from the grammar if there is no other
            var distribution = this.distribution;
            if (!distribution)
                distribution = this.grammar.distribution;

            switch(distribution) {
            case "shuffle":

                // create a shuffle desk
                if (!this.shuffledDeck || this.shuffledDeck.length === 0) {
                    // make an array
                    this.shuffledDeck = fyshuffle(Array.apply(null, {
                        length : this.defaultRules.length
                    }).map(Number.call, Number), this.falloff);

                }

                index = this.shuffledDeck.pop();

                break;
            case "weighted":
                errors.push("Weighted distribution not yet implemented");
                break;
            case "falloff":
                errors.push("Falloff distribution not yet implemented");
                break;
            default:

                index = Math.floor(Math.pow(random(), this.falloff) * this.defaultRules.length);
                break;
            }

            if (!this.defaultUses)
                this.defaultUses = [];
            this.defaultUses[index] = ++this.defaultUses[index] || 1;
            return this.defaultRules[index];
        }

        errors.push("No default rules defined for " + this);
        return null;

    };

    RuleSet.prototype.clearState = function() {

        if (this.defaultUses) {
            this.defaultUses = [];
        }
    };

    function fyshuffle(array, falloff) {
        var currentIndex = array.length,
            temporaryValue,
            randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    var Symbol = function(grammar, key, rawRules) {
        // Symbols can be made with a single value, and array, or array of objects of (conditions/values)
        this.key = key;
        this.grammar = grammar;
        this.rawRules = rawRules;

        this.baseRules = new RuleSet(this.grammar, rawRules);
        this.clearState();

    };

    Symbol.prototype.clearState = function() {

        // Clear the stack and clear all ruleset usages
        this.stack = [this.baseRules];

        this.uses = [];
        this.baseRules.clearState();
    };

    Symbol.prototype.pushRules = function(rawRules) {
        var rules = new RuleSet(this.grammar, rawRules);
        this.stack.push(rules);
    };

    Symbol.prototype.popRules = function() {
        this.stack.pop();
    };

    Symbol.prototype.selectRule = function(node, errors) {
        this.uses.push({
            node : node
        });

        if (this.stack.length === 0) {
            errors.push("The rule stack for '" + this.key + "' is empty, too many pops?");
            return "((" + this.key + "))";
        }

        return this.stack[this.stack.length - 1].selectRule();
    };

    Symbol.prototype.getActiveRules = function() {
        if (this.stack.length === 0) {
            return null;
        }
        return this.stack[this.stack.length - 1].selectRule();
    };

    Symbol.prototype.rulesToJSON = function() {
        return JSON.stringify(this.rawRules);
    };

    var Grammar = function(raw, settings) {
        this.modifiers = {};
        this.loadFromRawObj(raw);
    };

    Grammar.prototype.clearState = function() {
        var keys = Object.keys(this.symbols);
        for (var i = 0; i < keys.length; i++) {
            this.symbols[keys[i]].clearState();
        }
    };

    Grammar.prototype.addModifiers = function(mods) {

        // copy over the base modifiers
        for (var key in mods) {
            if (mods.hasOwnProperty(key)) {
                this.modifiers[key] = mods[key];
            }
        };

    };

    Grammar.prototype.loadFromRawObj = function(raw) {

        this.raw = raw;
        this.symbols = {};
        this.subgrammars = [];

        if (this.raw) {
            // Add all rules to the grammar
            for (var key in this.raw) {
                if (this.raw.hasOwnProperty(key)) {
                    this.symbols[key] = new Symbol(this, key, this.raw[key]);
                }
            }
        }
    };

    Grammar.prototype.createRoot = function(rule) {
        // Create a node and subnodes
        var root = new TraceryNode(this, 0, {
            type : -1,
            raw : rule,
        });

        return root;
    };

    Grammar.prototype.expand = function(rule, allowEscapeChars) {
        var root = this.createRoot(rule);
        root.expand();
        if (!allowEscapeChars)
            root.clearEscapeChars();

        return root;
    };

    Grammar.prototype.flatten = function(rule, allowEscapeChars) {
        var root = this.expand(rule, allowEscapeChars);

        return root.finishedText;
    };

    Grammar.prototype.toJSON = function() {
        var keys = Object.keys(this.symbols);
        var symbolJSON = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            symbolJSON.push(' "' + key + '" : ' + this.symbols[key].rulesToJSON());
        }
        return "{\n" + symbolJSON.join(",\n") + "\n}";
    };

    // Create or push rules
    Grammar.prototype.pushRules = function(key, rawRules, sourceAction) {

        if (this.symbols[key] === undefined) {
            this.symbols[key] = new Symbol(this, key, rawRules);
            if (sourceAction)
                this.symbols[key].isDynamic = true;
        } else {
            this.symbols[key].pushRules(rawRules);
        }
    };

    Grammar.prototype.popRules = function(key) {
        if (!this.symbols[key])
            this.errors.push("Can't pop: no symbol for key " + key);
        this.symbols[key].popRules();
    };

    Grammar.prototype.selectRule = function(key, node, errors) {
        if (this.symbols[key]) {
            var rule = this.symbols[key].selectRule(node, errors);

            return rule;
        }

        // Failover to alternative subgrammars
        for (var i = 0; i < this.subgrammars.length; i++) {

            if (this.subgrammars[i].symbols[key])
                return this.subgrammars[i].symbols[key].selectRule();
        }

        // No symbol?
        errors.push("No symbol for '" + key + "'");
        return "((" + key + "))";
    };

    // Parses a plaintext rule in the tracery syntax
    tracery = {

        createGrammar : function(raw) {
            return new Grammar(raw);
        },

        setRandom: setRandom,

        // Parse the contents of a tag
        parseTag : function(tagContents) {

            var parsed = {
                symbol : undefined,
                preactions : [],
                postactions : [],
                modifiers : []
            };
            var sections = tracery.parse(tagContents);
            var symbolSection = undefined;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].type === 0) {
                    if (symbolSection === undefined) {
                        symbolSection = sections[i].raw;
                    } else {
                        throw ("multiple main sections in " + tagContents);
                    }
                } else {
                    parsed.preactions.push(sections[i]);
                }
            }

            if (symbolSection === undefined) {
                //   throw ("no main section in " + tagContents);
            } else {
                var components = symbolSection.split(".");
                parsed.symbol = components[0];
                parsed.modifiers = components.slice(1);
            }
            return parsed;
        },

        parse : function(rule) {
            var depth = 0;
            var inTag = false;
            var sections = [];
            var escaped = false;

            var errors = [];
            var start = 0;

            var escapedSubstring = "";
            var lastEscapedChar = undefined;

            if (rule === null) {
                var sections = [];
                sections.errors = errors;

                return sections;
            }

            function createSection(start, end, type) {
                if (end - start < 1) {
                    if (type === 1)
                        errors.push(start + ": empty tag");
                    if (type === 2)
                        errors.push(start + ": empty action");

                }
                var rawSubstring;
                if (lastEscapedChar !== undefined) {
                    rawSubstring = escapedSubstring + "\\" + rule.substring(lastEscapedChar + 1, end);

                } else {
                    rawSubstring = rule.substring(start, end);
                }
                sections.push({
                    type : type,
                    raw : rawSubstring
                });
                lastEscapedChar = undefined;
                escapedSubstring = "";
            };

            for (var i = 0; i < rule.length; i++) {

                if (!escaped) {
                    var c = rule.charAt(i);

                    switch(c) {

                    // Enter a deeper bracketed section
                    case '[':
                        if (depth === 0 && !inTag) {
                            if (start < i)
                                createSection(start, i, 0);
                            start = i + 1;
                        }
                        depth++;
                        break;

                    case ']':
                        depth--;

                        // End a bracketed section
                        if (depth === 0 && !inTag) {
                            createSection(start, i, 2);
                            start = i + 1;
                        }
                        break;

                    // Hashtag
                    //   ignore if not at depth 0, that means we are in a bracket
                    case '#':
                        if (depth === 0) {
                            if (inTag) {
                                createSection(start, i, 1);
                                start = i + 1;
                            } else {
                                if (start < i)
                                    createSection(start, i, 0);
                                start = i + 1;
                            }
                            inTag = !inTag;
                        }
                        break;

                    case '\\':
                        escaped = true;
                        escapedSubstring = escapedSubstring + rule.substring(start, i);
                        start = i + 1;
                        lastEscapedChar = i;
                        break;
                    }
                } else {
                    escaped = false;
                }
            }
            if (start < rule.length)
                createSection(start, rule.length, 0);

            if (inTag) {
                errors.push("Unclosed tag");
            }
            if (depth > 0) {
                errors.push("Too many [");
            }
            if (depth < 0) {
                errors.push("Too many ]");
            }

            // Strip out empty plaintext sections

            sections = sections.filter(function(section) {
                if (section.type === 0 && section.raw.length === 0)
                    return false;
                return true;
            });
            sections.errors = errors;
            return sections;
        },
    };

    function isVowel(c) {
        var c2 = c.toLowerCase();
        return (c2 === 'a') || (c2 === 'e') || (c2 === 'i') || (c2 === 'o') || (c2 === 'u');
    };

    function isAlphaNum(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
    };
    function escapeRegExp(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    var baseEngModifiers = {

        replace : function(s, params) {
            //http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
            return s.replace(new RegExp(escapeRegExp(params[0]), 'g'), params[1]);
        },

        capitalizeAll : function(s) {
            var s2 = "";
            var capNext = true;
            for (var i = 0; i < s.length; i++) {

                if (!isAlphaNum(s.charAt(i))) {
                    capNext = true;
                    s2 += s.charAt(i);
                } else {
                    if (!capNext) {
                        s2 += s.charAt(i);
                    } else {
                        s2 += s.charAt(i).toUpperCase();
                        capNext = false;
                    }

                }
            }
            return s2;
        },

        capitalize : function(s) {
            return s.charAt(0).toUpperCase() + s.substring(1);
        },

        a : function(s) {
            if (s.length > 0) {
                if (s.charAt(0).toLowerCase() === 'u') {
                    if (s.length > 2) {
                        if (s.charAt(2).toLowerCase() === 'i')
                            return "a " + s;
                    }
                }

                if (isVowel(s.charAt(0))) {
                    return "an " + s;
                }
            }

            return "a " + s;

        },

        firstS : function(s) {
            console.log(s);
            var s2 = s.split(" ");

            var finished = baseEngModifiers.s(s2[0]) + " " + s2.slice(1).join(" ");
            console.log(finished);
            return finished;
        },

        s : function(s) {
            switch (s.charAt(s.length -1)) {
            case 's':
                return s + "es";
                break;
            case 'h':
                return s + "es";
                break;
            case 'x':
                return s + "es";
                break;
            case 'y':
                if (!isVowel(s.charAt(s.length - 2)))
                    return s.substring(0, s.length - 1) + "ies";
                else
                    return s + "s";
                break;
            default:
                return s + "s";
            }
        },
        ed : function(s) {
            switch (s.charAt(s.length -1)) {
            case 's':
                return s + "ed";
                break;
            case 'e':
                return s + "d";
                break;
            case 'h':
                return s + "ed";
                break;
            case 'x':
                return s + "ed";
                break;
            case 'y':
                if (!isVowel(s.charAt(s.length - 2)))
                    return s.substring(0, s.length - 1) + "ied";
                else
                    return s + "d";
                break;
            default:
                return s + "ed";
            }
        }
    };

    tracery.baseEngModifiers = baseEngModifiers; 
    // Externalize
    tracery.TraceryNode = TraceryNode;

    tracery.Grammar = Grammar;
    tracery.Symbol = Symbol;
    tracery.RuleSet = RuleSet;
    return tracery;
}();

module.exports = tracery;

},{}],17:[function(require,module,exports){
const util = require('./util');

let ready = false;

let $dialogs;
let $lineOne;
let $lineTwo;
let $next;

let lineOneAnimating;
let lineTwoAnimating;

let cur;
let prev;
let next;


const init = () => {
  console.debug('Dialog.init()');

  $dialogs = $('#highlights-dialog__text p');
  $lineOne = $dialogs.first();
  $lineTwo = $dialogs.last();
  $next = $('#highlights-dialog__next');

  lineOneAnimating = false;
  lineTwoAnimating = false;

  $dialogs.each((_, el) => {
    util.prefixedOn($(el), 'AnimationEnd', onAnimEnd);
  });

  ready = true;
};

const startHighlight = (highlights) => {;
  cur = highlights.cur;
  prev = highlights.prev;
  next = highlights.next;

  if (!ready) init();

  // reset dialog
  //highlight.curDialogPart = 0;
  $lineOne.removeClass('animation-finished animate');
  $lineTwo.removeClass('animation-finished animate');

  cur.started = true;
  animateHighlight(cur);
};

const animateHighlight = (highlight) => {
  $lineOne.text(highlight.dialogParts[highlight.curDialogPart][0] || '');
  $lineTwo.text(highlight.dialogParts[highlight.curDialogPart][1] || '');

  hideNext();
  animate('one');
};

const animate = (line) => {
  if (line === 'one') {
    //stopAnimate('two');
    $lineOne.addClass('animate');
    lineOneAnimating = true;
  } else if (line === 'two') {
    //stopAnimate('one');
    $lineTwo.addClass('animate');
    lineTwoAnimating = true;
  }
};

const stopAnimate = (line) => {
  if (line === 'one') {
    $lineOne
      .removeClass('animate')
      .addClass('animation-finished');
    lineOneAnimating = false;
  } else if (line === 'two') {
    $lineTwo
      .removeClass('animate')
      .addClass('animation-finished');
    lineTwoAnimating = false;
  }
};

const onAnimEnd = () => {
  // check for the second animation first so the second animation
  // doesn't get triggered then immediately ended inside this func
  if (lineTwoAnimating) {
    stopAnimate('two');

    showNext();
  }

  if (lineOneAnimating) {
    stopAnimate('one');

    // if there's text in lineTwo, animate it
    if ($lineTwo.text().length) {
      animate('two');
    } else {
      showNext();
    }
  }
};

// show next arrow if:
// there are parts left to this highlight
// there are highlights left to the story
const showNext = () => {
  if (cur.hasDialogLeft() || next) {
    $next.addClass('show');
  }
};

const hideNext = () => {
  $next.removeClass('show');
};

const continueHighlight = (highlights) => {
  cur = highlights.cur;
  prev = highlights.prev;
  next = highlights.next;

  if (!cur.started) { return false; }

  cur.curDialogPart++;

  // no more text to this highlight
  if (cur.curDialogPart === cur.dialogParts.length) {
    return false;
  }

  animateHighlight(cur);
  return true;
};

module.exports = {
  startHighlight,
  continueHighlight,
};


},{"./util":21}],18:[function(require,module,exports){
const mlustard = require('mlustard');

const highlight = require('./highlight');

let gameEvents = {};
let highlights = [];

const generateHighlights = (cb) => {
  $('.game-event__container input:checked').each((_, checked) => {
    const id = $(checked).attr('id');

    const hl = highlight.makeHighlight({
      id: id,
      gameEvent: gameEvents[id].ev,
      mlustard: gameEvents[id].mlustard,
    });

    highlights.push(hl);
  });

  console.debug('generateHighlights:', highlights);
  cb(highlights);
};

const makeCountCircle = (classes) => {
  return $('<span>').addClass(classes);
};

const makeBaseDiamond = (occ) => {
  const $diamond = $('<span>').addClass('diamond');

  if (occ) {
    $diamond.addClass('filled');
  }

  return $diamond;
};

const renderGameEv = (gameEv) => {
  const data = gameEv.ev.data;

  if (!data.lastUpdate) {
    return;
  }

  const $gameEv = $('<div>');

  // form stuff
  const $chContainer = $('<div>');
  const $check = $('<input>');
  const $label = $('<label>');

  let update = `${data.lastUpdate} ${data.scoreUpdate || ''}`;

  $check
    .addClass('form-check-input')
    .attr('id', gameEv.ev.hash)
    .attr('type', 'checkbox')
    .attr('name', 'game event')
    .val('');

  $label
    .addClass('form-check-label')
    .attr('for', gameEv.ev.hash)
    .text(update);

  $chContainer
    .addClass('form-check col-7')
    .append($check)
    .append($label);

  // game event info
  const $gameEvInfo = $('<div>');
  const $score = $('<span>');
  const $bases = $('<span>');
  const $balls = $('<span>');
  const $strikes = $('<span>');
  const $outs = $('<span>');

  let homeEmoji = '';
  let awayEmoji = '';

  try {
    homeEmoji = data.homeTeamEmoji ? String.fromCodePoint(data.homeTeamEmoji) : '';
  } catch (err) {
    homeEmoji = data.homeTeamEmoji;
  }

  try {
    awayEmoji = data.awayTeamEmoji ? String.fromCodePoint(data.awayTeamEmoji) : '';
  } catch (err) {
    awayEmoji = data.awayTeamEmoji;
  }

  let score = `${homeEmoji} ${data.homeScore} : ${awayEmoji} ${data.awayScore}`;
  let bases = '';

  // fill in balls count
  for (let ball = 0; ball < data.atBatBalls; ball++) {
    $balls.append(makeCountCircle('circle full'));
  }

  for (let ball = 3; ball > data.atBatBalls; ball--) {
    $balls.append(makeCountCircle('circle empty'));
  }

  // fill in strikes count
  for (let strike = 0; strike < data.atBatStrikes; strike++) {
    $strikes.append(makeCountCircle('circle full'));
  }

  for (let strike = 2; strike > data.atBatStrikes; strike--) {
    $strikes.append(makeCountCircle('circle empty'));
  }

  // fill in outs count
  for (let out = 0; out < data.halfInningOuts; out++) {
    $outs.append(makeCountCircle('circle full'));
  }

  for (let out = 2; out > data.halfInningOuts; out--) {
    $outs.append(makeCountCircle('circle empty'));
  }

  // fill in base diamonds
  $bases.append(makeBaseDiamond(gameEv.mlustard.baseRunners.third.playerName));
  $bases.append(makeBaseDiamond(gameEv.mlustard.baseRunners.second.playerName));
  $bases.append(makeBaseDiamond(gameEv.mlustard.baseRunners.first.playerName));
  // todo: deal with 4 bases
  //$bases.append(makeBaseDiamond(gameEv.mlustard.baseRunners.first.playerName));

  $score
    .text(score);
  $balls
    .attr('title', 'Balls')
    .addClass('balls-count');
  $strikes
    .attr('title', 'Strikes')
    .addClass('strikes-count');
  $outs
    .attr('title', 'Outs')
    .addClass('outs-count');
  $bases
    .attr('title', 'Bases occupied')
    .addClass('bases-occupied');

  $gameEvInfo
    .addClass('col-5')
    .append($score)
    .append($bases)
    .append($balls)
    .append($strikes)
    .append($outs);

  $gameEv
    .addClass('game-event__container row border')
    .append($chContainer)
    .append($gameEvInfo);

  return $gameEv;
};

const renderGameEvs = () => {
  stopLoading();
  $('#game-events-select').removeClass('d-none');

  const $container = $('#game-events-choose__container');

  // gotta render some general stuff too (home vs away, s#d#, weather)
  // also: label for the select, and the select itself
  for (let id in gameEvents) {
    let $gameEv = renderGameEv(gameEvents[id]);

    if ($gameEv) {
      $container.append($gameEv);
    }
  }
};

const getGameEvents = async (gameId, nextPage) => {
  let gamesURL = `https://api.sibr.dev/chronicler/v1/games/updates?game=${gameId}`;

  if (nextPage) {
    gamesURL += `&page=${nextPage}`;
  }

  startLoading();

  const resp = await fetch(gamesURL);

  if (resp.ok) {
    const data = await resp.json();

    for (let gameEv of data.data) {
      gameEvents[gameEv.hash] = {
        ev: gameEv,
        mlustard: mlustard.analyzeGameEvent(gameEv.data),
      };
    }

    if (data.nextPage) {
      getGameEvents(gameId, data.nextPage);
    } else {
      // done loading all game events
      renderGameEvs();
      console.debug('getGameEvents done:', gameEvents);
    }

  }
};

const startLoading = () => {
  const $gameEvForm = $('#game-event-form');

  $gameEvForm.find('button').addClass('d-none');
  $gameEvForm.find('.spinner-border').removeClass('d-none');
};

const stopLoading = () => {
  const $gameEvForm = $('#game-event-form');

  $gameEvForm.find('button').removeClass('d-none');
  $gameEvForm.find('.spinner-border').addClass('d-none');
};

const init = (highlightsReadyCb) => {
  const $gameEvForm = $('#game-event-form');

  $gameEvForm.on('submit', (ev) => {
    ev.preventDefault();

    const gameId = $gameEvForm .find('#game-id').val() .split('/').pop();
    getGameEvents(gameId);
  });

  const $highlightsSelectForm = $('#game-events-choose__form');

  $highlightsSelectForm.on('submit', (ev) => {
    ev.preventDefault();
    generateHighlights(highlightsReadyCb);
  });

};

module.exports = {
  init,
};


},{"./highlight":19,"mlustard":10}],19:[function(require,module,exports){
const grandSlalami = require('grand-slalami');

// making a 'class' for highlights in the old-school way
// cause i don't wanna have to complicate things further with babel
const makeHighlight = (settings) => {
  settings = settings || {};

  let id;
  let gameEvent;
  let mlustard;
  let commentary;
  let maxDialogLen;
  let dialogParts;
  let curDialogPart;

  const init = () => {
    id = settings.id;
    gameEvent = settings.gameEvent;
    mlustard = settings.mlustard;
    commentary = generateCommentary();
    maxDialogLen = setMaxDialogLen();
    dialogParts = [];
    curDialogPart = 0;
    breakIntoDialogParts();

    return {
      id,
      gameEvent,
      mlustard,
      commentary,
      dialogParts,
      curDialogPart,
      hasDialogLeft,
    };
  };

  const generateCommentary = () => {
    return grandSlalami.getComment({
      gameEvent: gameEvent.data,
      mlustard: mlustard,
    });
  };

  // todo: do i wanna support mobile? then update this accordingly
  const setMaxDialogLen = () => {
    return 40;
  };

  const breakIntoDialogParts = () => {
    // split by newlines (enforced pacing)
    const pacingParts = commentary.split('\n');

    pacingParts.forEach((p) => {
      breakIntoParts(p);
    });
  };

  // split each part into its animation parts by line length
  const breakIntoParts = (text) => {
    let parts = [[], []];
    let unfilled = 0;
    let len = 0;

    text.split(' ').forEach((word) => {
      let wordLen = word.length;

      if ((len + wordLen) > maxDialogLen) {
        len = 0;

        if (unfilled === 1) {
          dialogParts.push(makeSentences(parts));
          parts = [[], []];
          unfilled = 0;
        } else {
          unfilled = 1;
        }
      }

      if ((len + wordLen) <= maxDialogLen) {
        parts[unfilled].push(word);
        len += wordLen + 1;
      }
    });

    dialogParts.push(makeSentences(parts));
  };

  const makeSentences = (parts) => {
    return parts.map((words) => {
      return words.join(' ');
    });
  };

  const hasDialogLeft = () => {
    return !((curDialogPart + 1) === dialogParts.length);
  };

  return init();
};

module.exports = {
  makeHighlight,
};


},{"grand-slalami":3}],20:[function(require,module,exports){
const gameEventSelector = require('./game-event-selector');
const dialog = require('./dialog');
const visual = require('./visual');

let highlights = [];
let curHighlight = 0;
let intro = true;

const getHighlights = () => {
  return {
    prev: highlights[curHighlight - 1],
    cur: highlights[curHighlight],
    next: highlights[curHighlight + 1],
  };
};

const nextHighlight = () => {
  visual.updateDiamond(getHighlights());
  dialog.startHighlight(getHighlights());
};

const continueHighlight = () => {
  return dialog.continueHighlight(getHighlights());
};

const handleAction = (evt) => {
  if (evt.type === 'keyup' && !(
    evt.keyCode === 32 || // space
    evt.keyCode === 39 || // arrow right
    evt.keyCode === 40    // arrow down
  )) {
    return;
  }

  // do nothing if there's no more highlights
  if (highlights.length === curHighlight) { return };

  // if we're in the intro, start at the first highlight
  if (intro) {
    intro = false;

    nextHighlight();
    return;
  }

  // try to advance the highlight, if there's more text to animate
  if (!continueHighlight()) {
    curHighlight++;

    // if there are no more highlights, move into outro
    if (highlights.length === curHighlight) {
      // todo: outro
      return;
    }

    // otherwise, show the next highlight
    nextHighlight();
  }
};

const setupIntro = () => {
  // grab game info from first highlight
  const gameEv = highlights[0].gameEvent.data;
  const $home = $('#intro .vs-logo__home');
  const $away = $('#intro .vs-logo__away');

  let hNick = gameEv.homeTeamNickname.split(' ').pop().toLowerCase();
  let aNick = gameEv.awayTeamNickname.split(' ').pop().toLowerCase();

  if (aNick === 'mechanics') {
    aNick += '-away';
  }

  $('#intro .game-name').text(`Season ${gameEv.season + 1}, Day ${gameEv.day + 1}`);
  $home.attr('src', `./images/logo-${hNick}.png`);
  $away.attr('src', `./images/logo-${aNick}.png`);

  // georgias don't have a standard size logo
  if (hNick === 'georgias') {
    $home.css('height', 'auto');
  }

  if (aNick === 'georgias') {
    $away.css('height', 'auto');
  }
};

const onHighlightsReady = (hls) => {
  highlights = hls;

  setupIntro();

  $(document).on('keyup', handleAction);
  $('#highlights-dialog__container').on('click', handleAction);
};

const initApp = () => {
  gameEventSelector.init(onHighlightsReady);

  window.startHighlight = dialog.startHighlight;

};

initApp();


},{"./dialog":17,"./game-event-selector":18,"./visual":22}],21:[function(require,module,exports){
// apated from
// https://css-tricks.com/controlling-css-animations-transitions-javascript/
const prefixes = ['webkit', 'moz', 'MS', 'o', ''];

const prefixedOn = ($el, type, cb) => {
  for (let prefix of prefixes) {
    if (!prefix) type = type.toLowerCase();
    $el.on(`${prefix}${type}`, cb);
  }
};

module.exports = {
  prefixedOn,
};


},{}],22:[function(require,module,exports){
const $diamond = $('#diamond');
const diamondLocations = {
  $mound: $diamond.find('.mound'),
  $batting: $diamond.find('.batting'),
  $first: $diamond.find('.first'),
  $second: $diamond.find('.second'),
  $third: $diamond.find('.third'),
};

const BASES = ['first', 'second', 'third']; // todo: 'fourth', 'secret'?

const drawBatter = (highlights) => {
  //const ml = highlight.mlustard;
  const cur = highlights.cur;
  const ge = cur.gameEvent.data;

  const team = ge.topOfInning ? 'away' : 'home';

  diamondLocations['$batting']
    .css('color', ge[`${team}TeamColor`])
    .text(ge[`${team}BatterName`]);
};

const drawPitcher = (highlights) => {
  //const ml = highlight.mlustard;
  const cur = highlights.cur;
  const ge = cur.gameEvent.data;

  const team = ge.topOfInning ? 'home' : 'away';

  diamondLocations['$mound']
    .css('color', ge[`${team}TeamColor`])
    .text(ge[`${team}PitcherName`]);
};

const drawBaserunners = (highlights) => {
  const cur = highlights.cur;
  const ml = cur.mlustard;
  const ge = cur.gameEvent.data;

  const team = ge.topOfInning ? 'away' : 'home';

  if (ml && ml.baseRunners) {
    for (let base of BASES) {
      if (ml.baseRunners[base].playerName) {
        diamondLocations[`$${base}`]
          .css('color', ge[`${team}TeamColor`])
          .text(ml.baseRunners[base].playerName);
      }
    }
  }
};

const updateDiamond = (highlights) => {
  drawBatter(highlights);
  drawPitcher(highlights);
  drawBaserunners(highlights);

};

module.exports = {
  updateDiamond,
};


},{}]},{},[20])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ3JhbmQtc2xhbGFtaS9idWlsZC9jb21tZW50YXJ5LmpzIiwibm9kZV9tb2R1bGVzL2dyYW5kLXNsYWxhbWkvYnVpbGQvZ3JhbW1hci5qcyIsIm5vZGVfbW9kdWxlcy9ncmFuZC1zbGFsYW1pL2J1aWxkL2dyYW5kLXNsYWxhbWkuanMiLCJub2RlX21vZHVsZXMvZ3JhbmQtc2xhbGFtaS9idWlsZC9xdWlwcy5qc29uIiwibm9kZV9tb2R1bGVzL2dyYW5kLXNsYWxhbWkvYnVpbGQvdHJhY2VyeS1tb2RzLmpzIiwibm9kZV9tb2R1bGVzL21sdXN0YXJkL2J1aWxkL2Jhc2UtcnVubmVycy5qcyIsIm5vZGVfbW9kdWxlcy9tbHVzdGFyZC9idWlsZC9nYW1lLXN0YXR1cy5qcyIsIm5vZGVfbW9kdWxlcy9tbHVzdGFyZC9idWlsZC9oaXRzLmpzIiwibm9kZV9tb2R1bGVzL21sdXN0YXJkL2J1aWxkL21pc2MuanMiLCJub2RlX21vZHVsZXMvbWx1c3RhcmQvYnVpbGQvbWx1c3RhcmQuanMiLCJub2RlX21vZHVsZXMvbWx1c3RhcmQvYnVpbGQvb3V0cy5qcyIsIm5vZGVfbW9kdWxlcy9tbHVzdGFyZC9idWlsZC9zcGVjaWFsLmpzIiwibm9kZV9tb2R1bGVzL21sdXN0YXJkL2J1aWxkL3N0ZWFscy5qcyIsIm5vZGVfbW9kdWxlcy9tbHVzdGFyZC9idWlsZC91dGlsLmpzIiwibm9kZV9tb2R1bGVzL21sdXN0YXJkL2J1aWxkL3dhbGtzLmpzIiwibm9kZV9tb2R1bGVzL3RyYWNlcnktZ3JhbW1hci90cmFjZXJ5LmpzIiwic3JjL2RpYWxvZy5qcyIsInNyYy9nYW1lLWV2ZW50LXNlbGVjdG9yLmpzIiwic3JjL2hpZ2hsaWdodC5qcyIsInNyYy9tYWluLmpzIiwic3JjL3V0aWwuanMiLCJzcmMvdmlzdWFsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3IyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBidWlsZENvbW1lbnQgPSBmdW5jdGlvbiBidWlsZENvbW1lbnQoc2V0dGluZ3MsIGdyYW1tYXIpIHtcbiAgdmFyIGdhbWVFdmVudCA9IHNldHRpbmdzLmdhbWVFdmVudDtcbiAgdmFyIG1sdXN0YXJkID0gc2V0dGluZ3MubWx1c3RhcmQ7IC8vIGNoZWNrIGZvciBnYW1lIHN0YXR1c1xuXG4gIHN3aXRjaCAobWx1c3RhcmQuZ2FtZVN0YXR1cykge1xuICAgIGNhc2UgJ2JlZm9yZUZpcnN0UGl0Y2gnOlxuICAgICAgcmV0dXJuIGdyYW1tYXIuZmxhdHRlbignI2dhbWVTdGFydCMnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnZmlyc3RIYWxmSW5uaW5nU3RhcnQnOlxuICAgICAgaWYgKGdhbWVFdmVudC5pbm5pbmcgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGdyYW1tYXIuZmxhdHRlbignI2lubmluZ09uZVN0YXJ0IycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGdyYW1tYXIuZmxhdHRlbignI2lubmluZ1N0YXJ0IycpO1xuICAgICAgfVxuXG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3NlY29uZEhhbGZJbm5pbmdTdGFydCc6XG4gICAgICByZXR1cm4gZ3JhbW1hci5mbGF0dGVuKCcjaW5uaW5nU3RhcnQjJyk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuXG4gIHZhciBjb21tZW50ID0gJyc7IC8vIGNoZWNrIGZvciBvdXRzXG5cbiAgaWYgKG1sdXN0YXJkLm91dCkge1xuICAgIGlmIChtbHVzdGFyZC5nYW1lU3RhdHVzID09PSAnaGFsZklubmluZ0VuZCcpIHtcbiAgICAgIGNvbW1lbnQgKz0gZ3JhbW1hci5mbGF0dGVuKCcjbGFzdE91dE9mSW5uaW5nIycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21tZW50ICs9IGdyYW1tYXIuZmxhdHRlbignI291dCMnKTtcbiAgICB9XG4gIH0gLy8gY2hlY2sgZm9yIHNjb3JlXG5cblxuICBpZiAobWx1c3RhcmQucnVuc1Njb3JlZCAhPT0gMCB8fCBtbHVzdGFyZC51bnJ1bnNTY29yZWQgIT09IDAgfHwgLy8gc2NvcmUgY2hhbmdlIGR1ZSB0byBzYWxtb24gc3RlYWxpbmcgcnVuc1xuICBtbHVzdGFyZC5zcGVjaWFsICYmIG1sdXN0YXJkLnNwZWNpYWxNZXRhLmtpbmQgPT09ICdzYWxtb24nICYmIG1sdXN0YXJkLnNwZWNpYWxNZXRhLmRldGFpbHMgJiYgbWx1c3RhcmQuc3BlY2lhbE1ldGEuZGV0YWlscy5ydW5zU3RvbGVuLmxlbmd0aCB8fCAvLyBzY29yZSBjaGFuZ2UgZnJvbSBzdW4gMiBzbWlsaW5nXG4gIG1sdXN0YXJkLnNwZWNpYWwgJiYgbWx1c3RhcmQuc3BlY2lhbE1ldGEua2luZCA9PT0gJ3N1bjInIHx8IC8vIHNjb3JlIGNoYW5nZSBmcm9tIGJsYWNrIGhvbGUgc3dhbGxvd2luZ1xuICBtbHVzdGFyZC5zcGVjaWFsICYmIG1sdXN0YXJkLnNwZWNpYWxNZXRhLmtpbmQgPT09ICdibGFja0hvbGUnKSB7XG4gICAgaWYgKGNvbW1lbnQpIHtcbiAgICAgIGNvbW1lbnQgKz0gZ3JhbW1hci5mbGF0dGVuKCcjc2NvcmVBZGRvbiMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tbWVudCArPSBncmFtbWFyLmZsYXR0ZW4oJyNzY29yZSMnKTtcbiAgICB9XG4gIH0gLy8gY2hlY2sgaWYgYSBiYXR0ZXIganVzdCBzaG93ZWQgdXAgYXQgdGhlIHBsYXRlXG5cblxuICBpZiAobWx1c3RhcmQuYmF0dGVyVXAgJiYgZ2FtZUV2ZW50LmJhc2VydW5uZXJDb3VudCkge1xuICAgIGNvbW1lbnQgKz0gZ3JhbW1hci5mbGF0dGVuKCcjYmF0dGVyVXBSdW5uZXJzIycpO1xuICB9IC8vIHJldHVybiB0aGUgY29tbWVudCBpZiBpdCB3YXMgY3JlYXRlZCwgb3RoZXJ3aXNlIHRoZSBvcmlnaW5hbCB1cGRhdGUgaWYgaXRcbiAgLy8gZXhpc3RzLCBvdGhlcndpc2UgYW4gZW1wdHkgc3RyaW5nXG5cblxuICByZXR1cm4gY29tbWVudCB8fCBnYW1lRXZlbnQubGFzdFVwZGF0ZSB8fCAnJztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBidWlsZENvbW1lbnQ6IGJ1aWxkQ29tbWVudFxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX2NyZWF0ZUZvck9mSXRlcmF0b3JIZWxwZXIobywgYWxsb3dBcnJheUxpa2UpIHsgdmFyIGl0OyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJ1bmRlZmluZWRcIiB8fCBvW1N5bWJvbC5pdGVyYXRvcl0gPT0gbnVsbCkgeyBpZiAoQXJyYXkuaXNBcnJheShvKSB8fCAoaXQgPSBfdW5zdXBwb3J0ZWRJdGVyYWJsZVRvQXJyYXkobykpIHx8IGFsbG93QXJyYXlMaWtlICYmIG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSB7IGlmIChpdCkgbyA9IGl0OyB2YXIgaSA9IDA7IHZhciBGID0gZnVuY3Rpb24gRigpIHt9OyByZXR1cm4geyBzOiBGLCBuOiBmdW5jdGlvbiBuKCkgeyBpZiAoaSA+PSBvLmxlbmd0aCkgcmV0dXJuIHsgZG9uZTogdHJ1ZSB9OyByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IG9baSsrXSB9OyB9LCBlOiBmdW5jdGlvbiBlKF9lKSB7IHRocm93IF9lOyB9LCBmOiBGIH07IH0gdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBpdGVyYXRlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZS5cXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuXCIpOyB9IHZhciBub3JtYWxDb21wbGV0aW9uID0gdHJ1ZSwgZGlkRXJyID0gZmFsc2UsIGVycjsgcmV0dXJuIHsgczogZnVuY3Rpb24gcygpIHsgaXQgPSBvW1N5bWJvbC5pdGVyYXRvcl0oKTsgfSwgbjogZnVuY3Rpb24gbigpIHsgdmFyIHN0ZXAgPSBpdC5uZXh0KCk7IG5vcm1hbENvbXBsZXRpb24gPSBzdGVwLmRvbmU7IHJldHVybiBzdGVwOyB9LCBlOiBmdW5jdGlvbiBlKF9lMikgeyBkaWRFcnIgPSB0cnVlOyBlcnIgPSBfZTI7IH0sIGY6IGZ1bmN0aW9uIGYoKSB7IHRyeSB7IGlmICghbm9ybWFsQ29tcGxldGlvbiAmJiBpdFtcInJldHVyblwiXSAhPSBudWxsKSBpdFtcInJldHVyblwiXSgpOyB9IGZpbmFsbHkgeyBpZiAoZGlkRXJyKSB0aHJvdyBlcnI7IH0gfSB9OyB9XG5cbmZ1bmN0aW9uIF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShvLCBtaW5MZW4pIHsgaWYgKCFvKSByZXR1cm47IGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIF9hcnJheUxpa2VUb0FycmF5KG8sIG1pbkxlbik7IHZhciBuID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKTsgaWYgKG4gPT09IFwiT2JqZWN0XCIgJiYgby5jb25zdHJ1Y3RvcikgbiA9IG8uY29uc3RydWN0b3IubmFtZTsgaWYgKG4gPT09IFwiTWFwXCIgfHwgbiA9PT0gXCJTZXRcIikgcmV0dXJuIEFycmF5LmZyb20obyk7IGlmIChuID09PSBcIkFyZ3VtZW50c1wiIHx8IC9eKD86VWl8SSludCg/Ojh8MTZ8MzIpKD86Q2xhbXBlZCk/QXJyYXkkLy50ZXN0KG4pKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTsgfVxuXG5mdW5jdGlvbiBfYXJyYXlMaWtlVG9BcnJheShhcnIsIGxlbikgeyBpZiAobGVuID09IG51bGwgfHwgbGVuID4gYXJyLmxlbmd0aCkgbGVuID0gYXJyLmxlbmd0aDsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBuZXcgQXJyYXkobGVuKTsgaSA8IGxlbjsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH1cblxudmFyIHRyYWNlcnkgPSByZXF1aXJlKCd0cmFjZXJ5LWdyYW1tYXInKTtcblxudmFyIG1vZHMgPSByZXF1aXJlKCcuL3RyYWNlcnktbW9kcycpO1xuXG52YXIgcXVpcHMgPSByZXF1aXJlKCcuL3F1aXBzLmpzb24nKTtcblxudmFyIGluaXQgPSBmdW5jdGlvbiBpbml0KHNldHRpbmdzKSB7XG4gIHZhciBzZWVkID0gc2V0dGluZ3Muc2VlZDtcbiAgdmFyIGdhbWVFdmVudCA9IHNldHRpbmdzLmdhbWVFdmVudDtcbiAgdmFyIG1sdXN0YXJkID0gc2V0dGluZ3MubWx1c3RhcmQ7XG4gIHZhciBvdmVycmlkZXMgPSBzZXR0aW5ncy5vdmVycmlkZXM7XG4gIHZhciBsZXZlbCA9IHNldHRpbmdzLmxldmVsO1xuXG4gIGlmIChzZWVkICE9PSB1bmRlZmluZWQpIHtcbiAgICB0cmFjZXJ5LnNldFJhbmRvbShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gc2VlZDtcbiAgICB9KTtcbiAgfVxuXG4gIHZhciBncmFtbWFyID0gdHJhY2VyeS5jcmVhdGVHcmFtbWFyKHt9KTsgLy8gcG9wdWxhdGUgZGF0YSBmcm9tIGdhbWVFdmVudFxuXG4gIHZhciBfaXRlcmF0b3IgPSBfY3JlYXRlRm9yT2ZJdGVyYXRvckhlbHBlcihxdWlwcy5kYXRhKSxcbiAgICAgIF9zdGVwO1xuXG4gIHRyeSB7XG4gICAgZm9yIChfaXRlcmF0b3IucygpOyAhKF9zdGVwID0gX2l0ZXJhdG9yLm4oKSkuZG9uZTspIHtcbiAgICAgIHZhciBfZmllbGQzID0gX3N0ZXAudmFsdWU7XG4gICAgICB2YXIgZGF0YSA9IGdhbWVFdmVudFtfZmllbGQzXTtcblxuICAgICAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBzb21lIGRhdGEgbmVlZHMgbWFzc2FnaW5nXG4gICAgICAgIHN3aXRjaCAoX2ZpZWxkMykge1xuICAgICAgICAgIGNhc2UgJ2lubmluZyc6XG4gICAgICAgICAgICBkYXRhID0gKGRhdGEgKyAxKS50b1N0cmluZygpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlICd0b3BPZklubmluZyc6XG4gICAgICAgICAgICBkYXRhID0gZGF0YSA/ICd0b3AnIDogJ2JvdHRvbSc7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgJ2hhbGZJbm5pbmdPdXRzJzpcbiAgICAgICAgICBjYXNlICdob21lU2NvcmUnOlxuICAgICAgICAgIGNhc2UgJ2F3YXlTY29yZSc6XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBncmFtbWFyLnB1c2hSdWxlcyhfZmllbGQzLCBkYXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGdyYW1tYXIucHVzaFJ1bGVzKF9maWVsZDMsICcnKTtcbiAgICAgIH1cbiAgICB9IC8vIGN1cnJlbnQgcGl0Y2hlclxuXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIF9pdGVyYXRvci5lKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgX2l0ZXJhdG9yLmYoKTtcbiAgfVxuXG4gIHZhciBjUGl0Y2hlciA9IGdhbWVFdmVudC50b3BPZklubmluZyA/IGdhbWVFdmVudC5ob21lUGl0Y2hlck5hbWUgOiBnYW1lRXZlbnQuYXdheVBpdGNoZXJOYW1lO1xuICBncmFtbWFyLnB1c2hSdWxlcygnY1BpdGNoZXInLCBjUGl0Y2hlcik7IC8vIGN1cnJlbnQgYmF0dGVyIChjYW4gYmUgYW4gZW1wdHkgc3RyaW5nIGlmIG5vYm9keSBiYXR0aW5nKVxuXG4gIHZhciBjQmF0dGVyID0gZ2FtZUV2ZW50LmhvbWVCYXR0ZXJOYW1lIHx8IGdhbWVFdmVudC5hd2F5QmF0dGVyTmFtZTtcbiAgZ3JhbW1hci5wdXNoUnVsZXMoJ2NCYXR0ZXInLCBjQmF0dGVyKTsgLy8gcGl0Y2hpbmcgdGVhbSBuaWNrbmFtZVxuXG4gIHZhciBwTmljayA9IGdhbWVFdmVudC50b3BPZklubmluZyA/ICcjaE5pY2sjJyA6ICcjYU5pY2sjJztcbiAgZ3JhbW1hci5wdXNoUnVsZXMoJ3BOaWNrJywgcE5pY2spOyAvLyBiYXR0aW5nIHRlYW0gbmlja25hbWVcblxuICB2YXIgYk5pY2sgPSBnYW1lRXZlbnQudG9wT2ZJbm5pbmcgPyAnI2FOaWNrIycgOiAnI2hOaWNrIyc7XG4gIGdyYW1tYXIucHVzaFJ1bGVzKCdiTmljaycsIGJOaWNrKTsgLy8gbGVhZGluZyAmIHRyYWlsaW5nIHRlYW0gbmlja25hbWVzIGFuZCBzY29yZXNcblxuICB2YXIgbFRlYW07XG4gIHZhciB0VGVhbTtcbiAgdmFyIGxTY29yZTtcbiAgdmFyIHRTY29yZTtcblxuICBpZiAoZ2FtZUV2ZW50LmF3YXlTY29yZSA+IGdhbWVFdmVudC5ob21lU2NvcmUpIHtcbiAgICBsVGVhbSA9ICcjYU5pY2sjJztcbiAgICB0VGVhbSA9ICcjaE5pY2sjJztcbiAgICBsU2NvcmUgPSAnI2FTY29yZSMnO1xuICAgIHRTY29yZSA9ICcjaFNjb3JlIyc7XG4gIH0gZWxzZSB7XG4gICAgbFRlYW0gPSAnI2hOaWNrIyc7XG4gICAgdFRlYW0gPSAnI2FOaWNrIyc7XG4gICAgbFNjb3JlID0gJyNoU2NvcmUjJztcbiAgICB0U2NvcmUgPSAnI2FTY29yZSMnO1xuICB9XG5cbiAgZ3JhbW1hci5wdXNoUnVsZXMoJ2xUZWFtJywgbFRlYW0pO1xuICBncmFtbWFyLnB1c2hSdWxlcygndFRlYW0nLCB0VGVhbSk7XG4gIGdyYW1tYXIucHVzaFJ1bGVzKCdsU2NvcmUnLCBsU2NvcmUpO1xuICBncmFtbWFyLnB1c2hSdWxlcygndFNjb3JlJywgdFNjb3JlKTsgLy8gc2V0IGJhc2UgcnVubmVyc1xuXG4gIGlmIChnYW1lRXZlbnQuYmFzZXJ1bm5lckNvdW50ID49IDMpIHtcbiAgICBncmFtbWFyLnB1c2hSdWxlcygncnVubmVycycsICcjYmFzZXNMb2FkZWQjJyk7XG4gIH0gZWxzZSBpZiAoZ2FtZUV2ZW50LmJhc2VydW5uZXJDb3VudCA+IDApIHtcbiAgICBncmFtbWFyLnB1c2hSdWxlcygncnVubmVycycsICcjcnVubmVyc09uQmFzZSMnKTtcbiAgfVxuXG4gIHZhciBiYXNlcyA9ICcnO1xuXG4gIGZvciAodmFyIF9pID0gMCwgX09iamVjdCRrZXlzID0gT2JqZWN0LmtleXMobWx1c3RhcmQuYmFzZVJ1bm5lcnMpOyBfaSA8IF9PYmplY3Qka2V5cy5sZW5ndGg7IF9pKyspIHtcbiAgICB2YXIgYmFzZSA9IF9PYmplY3Qka2V5c1tfaV07XG5cbiAgICBpZiAobWx1c3RhcmQuYmFzZVJ1bm5lcnNbYmFzZV0ucGxheWVySWQpIHtcbiAgICAgIGJhc2VzICs9IFwiXCIuY29uY2F0KGJhc2UsIFwiIFwiKTtcbiAgICB9XG4gIH1cblxuICBncmFtbWFyLnB1c2hSdWxlcygnYmFzZXNPY2MnLCBiYXNlcy50cmltKCkpOyAvLyBidWlsZCBxdWlwcyBzaG9ydGN1dHNcblxuICBmb3IgKHZhciBmaWVsZCBpbiBxdWlwcy5zaG9ydGN1dHMpIHtcbiAgICBncmFtbWFyLnB1c2hSdWxlcyhmaWVsZCwgcXVpcHMuc2hvcnRjdXRzW2ZpZWxkXSk7XG4gIH0gLy8gYnVpbGQgcXVpcHMgZ3JhbW1hclxuXG5cbiAgZm9yICh2YXIgX2ZpZWxkIGluIHF1aXBzW2xldmVsXSkge1xuICAgIGdyYW1tYXIucHVzaFJ1bGVzKF9maWVsZCwgcXVpcHNbbGV2ZWxdW19maWVsZF0pO1xuICB9IC8vIGRvIHF1aXAgb3ZlcnJpZGVzXG5cblxuICBmb3IgKHZhciBfZmllbGQyIGluIG92ZXJyaWRlcykge1xuICAgIGdyYW1tYXIucHVzaFJ1bGVzKF9maWVsZDIsIG92ZXJyaWRlc1tfZmllbGQyXSk7XG4gIH0gLy8gYWRkIG1vZHNcblxuXG4gIGdyYW1tYXIuYWRkTW9kaWZpZXJzKHRyYWNlcnkuYmFzZUVuZ01vZGlmaWVycyk7XG4gIGdyYW1tYXIuYWRkTW9kaWZpZXJzKG1vZHMpO1xuICByZXR1cm4gZ3JhbW1hcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpbml0OiBpbml0XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWx1c3RhcmQgPSByZXF1aXJlKCdtbHVzdGFyZCcpO1xuXG52YXIgZ3JhbW1hciA9IHJlcXVpcmUoJy4vZ3JhbW1hcicpO1xuXG52YXIgY29tbWVudGFyeSA9IHJlcXVpcmUoJy4vY29tbWVudGFyeScpO1xuLypcbiAqIEBzZXR0aW5ncyBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BzOlxuICogICAtIGdhbWVFdmVudDogdGhlIGdhbWUgZXZlbnQgb2JqZWN0IChmcm9tIHRoZSBzdHJlYW0gb3IgY2hyb25pY2xlcilcbiAqICAgLSBtbHVzdGFyZCAob3B0aW9uYWwpOiBtbHVzdGFyZCBkYXRhIGZvciB0aGUgZ2FtZUV2ZW50XG4gKiAgIC0gc2VlZCAob3B0aW9uYWwpOiBhIHNlZWQsIGZvciBkZXRlcm1pbmlzdGljIGNvbW1lbnQgZ2VuZXJhdGlvblxuICogICAtIGxldmVsIChvcHRpb25hbCwgZGVmYXVsdHMgdG8gJ21pbmltYWwnKTogdGhlIGNvbW1lbnRhcnkgbGV2ZWwsIG9uZSBvZlxuICogICAgIC0gbWluaW1hbDogYWRkcyBhIGZldyBjb21tZW50cyB0byB1cGRhdGUgb24gZ2FtZSBzdGF0dXMgYXQga2V5IGNvbW1lbnRzXG4gKiAgIC0gb3ZlcnJpZGVzIChvcHRpb25hbCk6IG9iamVjdCB3aXRoIHF1aXAgb3ZlcnJpZGVzXG4gKi9cblxuXG52YXIgZ2V0Q29tbWVudCA9IGZ1bmN0aW9uIGdldENvbW1lbnQoc2V0dGluZ3MpIHtcbiAgaWYgKCFzZXR0aW5ncy5nYW1lRXZlbnQpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBzZXR0aW5ncy5tbHVzdGFyZCA9IHNldHRpbmdzLm1sdXN0YXJkIHx8IG1sdXN0YXJkLmFuYWx5emVHYW1lRXZlbnQoc2V0dGluZ3MuZ2FtZUV2ZW50KTtcbiAgc2V0dGluZ3MubGV2ZWwgPSBzZXR0aW5ncy5sZXZlbCB8fCAnbWluaW1hbCc7XG4gIHNldHRpbmdzLm92ZXJyaWRlcyA9IHNldHRpbmdzLm92ZXJyaWRlcyB8fCB7fTtcbiAgdmFyIGdyID0gZ3JhbW1hci5pbml0KHNldHRpbmdzKTtcblxuICBpZiAoIWdyKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcmV0dXJuIGNvbW1lbnRhcnkuYnVpbGRDb21tZW50KHNldHRpbmdzLCBncik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0Q29tbWVudDogZ2V0Q29tbWVudFxufTsiLCJtb2R1bGUuZXhwb3J0cz17XCJkYXRhXCI6W1wiaW5uaW5nXCIsXCJ0b3BPZklubmluZ1wiLFwiaGFsZklubmluZ091dHNcIixcImhvbWVUZWFtTmFtZVwiLFwiYXdheVRlYW1OYW1lXCIsXCJob21lVGVhbU5pY2tuYW1lXCIsXCJhd2F5VGVhbU5pY2tuYW1lXCIsXCJob21lU2NvcmVcIixcImF3YXlTY29yZVwiLFwiaG9tZU9kZHNcIixcImF3YXlPZGRzXCIsXCJob21lUGl0Y2hlck5hbWVcIixcImF3YXlQaXRjaGVyTmFtZVwiLFwibGFzdFVwZGF0ZVwiLFwic2NvcmVVcGRhdGVcIl0sXCJtaW5pbWFsXCI6e1wibWF0Y2h1cFwiOltcIiNoTmljayMgdnMgI2FOaWNrI1wiLFwiI2FOaWNrIyBhdCAjaE5pY2sjXCJdLFwidG9wT3JCb3RcIjpcIiN0b3BPZklubmluZyNcIixcImlubmluZ0Z1bGxcIjpcIiN0b3BPckJvdCMgb2YgI2lubmluZyNcIixcImdhbWVTdGFydFwiOlwiI21hdGNodXAjLiAjcGl0Y2hlcnMjLiAjb3JpZ2luYWwjXCIsXCJzY29yZVwiOlwiI29yaWdpbmFsIyBJdCdzICNsVGVhbS50aGUjICNsU2NvcmUjIGFuZCAjdFRlYW0udGhlIyAjdFNjb3JlIy5cIixcInNjb3JlQWRkb25cIjpcIiBJdCdzICNsVGVhbS50aGUjICNsU2NvcmUjIGFuZCAjdFRlYW0udGhlIyAjdFNjb3JlIy5cIixcImlubmluZ1N0YXJ0XCI6XCIjb3JpZ2luYWwjICNjUGl0Y2hlciMgcGl0Y2hpbmcgZm9yICNwTmljay50aGUjLlwiLFwiaW5uaW5nT25lU3RhcnRcIjpcIiNvcmlnaW5hbCNcIixcInBpdGNoZXJzXCI6W1wiI2hQaXRjaGVyIyBwaXRjaGluZyBmb3IgI2hOaWNrLnRoZSMsICNhUGl0Y2hlciMgZm9yICNhTmljay50aGUjXCIsXCJPdXIgcGl0Y2hlcnMgYXJlICNoUGl0Y2hlciMgZm9yICNoTmljay50aGUjLCBhbmQgI2FQaXRjaGVyIyBmb3IgI2FOaWNrLnRoZSNcIl0sXCJvdXRcIjpcIiNvcmlnaW5hbCMgI2lubmluZ0Z1bGwuY2FwaXRhbGl6ZSMsICNvdXRzIy5cIixcIm91dHNcIjpcIiNoYWxmSW5uaW5nT3V0cy5vdXRzI1wiLFwibGFzdE91dE9mSW5uaW5nXCI6XCIjb3JpZ2luYWwjXCIsXCJiYXR0ZXJVcFJ1bm5lcnNcIjpcIiNvcmlnaW5hbCMgI3J1bm5lcnMucnVubmVyUGx1cmFsaXplI1wiLFwicnVubmVyc09uQmFzZVwiOlwiUnVubmVyIG9uICNiYXNlc09jYy5hbmQjLlwiLFwiYmFzZXNMb2FkZWRcIjpcIkJhc2VzIGFyZSBsb2FkZWQhXCJ9LFwic2hvcnRjdXRzXCI6e1wiaFBpdGNoZXJcIjpcIiNob21lUGl0Y2hlck5hbWUjXCIsXCJhUGl0Y2hlclwiOlwiI2F3YXlQaXRjaGVyTmFtZSNcIixcImhOaWNrXCI6XCIjaG9tZVRlYW1OaWNrbmFtZSNcIixcImFOaWNrXCI6XCIjYXdheVRlYW1OaWNrbmFtZSNcIixcImhTY29yZVwiOlwiI2hvbWVTY29yZSNcIixcImFTY29yZVwiOlwiI2F3YXlTY29yZSNcIixcIm9yaWdpbmFsXCI6XCIjbGFzdFVwZGF0ZSMjc2NvcmVVcGRhdGUuc3BhY2VkI1wifX0iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHRoZTogZnVuY3Rpb24gdGhlKHMpIHtcbiAgICByZXR1cm4gXCJ0aGUgXCIuY29uY2F0KHMpO1xuICB9LFxuICAvLyBjb3VudHMgdGhlICMgb2Ygb3V0cyBhbmQgcGx1cmFsaXplcyBhY2NvcmRpbmdseVxuICBvdXRzOiBmdW5jdGlvbiBvdXRzKHMpIHtcbiAgICBpZiAocyA9PT0gJzEnKSB7XG4gICAgICByZXR1cm4gXCJcIi5jb25jYXQocywgXCIgb3V0XCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gXCJcIi5jb25jYXQocywgXCIgb3V0c1wiKTtcbiAgICB9XG4gIH0sXG4gIC8vIG94Zm9yZCBjb21tYXNcbiAgYW5kOiBmdW5jdGlvbiBhbmQocykge1xuICAgIHJldHVybiBzLnNwbGl0KCcgJykuam9pbignLCAnKS5yZXBsYWNlKC8sIChbXixdKikkLywgJyBhbmQgJDEnKTtcbiAgfSxcbiAgLy8gZm9yIHBsdXJhbGl6aW5nIHJ1bm5lcihzKSBvbiBmaXJzdFssIHNlY29uZCBhbmQgdGhpcmRdXG4gIHJ1bm5lclBsdXJhbGl6ZTogZnVuY3Rpb24gcnVubmVyUGx1cmFsaXplKHMpIHtcbiAgICBpZiAocy5pbmRleE9mKCcsJykgPj0gMCB8fCBzLmluZGV4T2YoJ2FuZCcpID49IDApIHtcbiAgICAgIHJldHVybiBzLnJlcGxhY2UoJ1J1bm5lcicsICdSdW5uZXJzJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzO1xuICAgIH1cbiAgfSxcbiAgLy8gYWRkcyBhIHNwYWNlIGJlZm9yZSB0aGUgd29yZFxuICBzcGFjZWQ6IGZ1bmN0aW9uIHNwYWNlZChzKSB7XG4gICAgaWYgKHMpIHtcbiAgICAgIHJldHVybiBcIiBcIi5jb25jYXQocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIEJBU0VTID0gWydmaXJzdCcsICdzZWNvbmQnLCAndGhpcmQnLCAnZm91cnRoJ107XG5cbnZhciBjaGVjayA9IGZ1bmN0aW9uIGNoZWNrKGFuYWx5c2lzLCBldmVudERhdGEpIHtcbiAgLy9jb25zdCB1cGRhdGUgPSB1dGlsLmdldFVwZGF0ZVRleHQoZXZlbnREYXRhKTtcbiAgaWYgKGV2ZW50RGF0YS5iYXNlcnVubmVyQ291bnQpIHtcbiAgICAvLyBpIHJlcHJlc2VudHMgdGhlIG9yZGVyIG9mIGJhc2VydW5uZXJzXG4gICAgLy8gYmFzZXNPY2N1cGllZFtpXSBpcyB0aGUgYmFzZSB0aGV5IGFyZSBvbiwgMC1pbmRleGVkXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudERhdGEuYmFzZXNPY2N1cGllZC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIF9ldmVudERhdGEkYmFzZVJ1bm5lcjtcblxuICAgICAgdmFyIGJhc2UgPSBldmVudERhdGEuYmFzZXNPY2N1cGllZFtpXTtcbiAgICAgIGFuYWx5c2lzLmJhc2VSdW5uZXJzW0JBU0VTW2Jhc2VdXSA9IHtcbiAgICAgICAgcGxheWVyTmFtZTogKChfZXZlbnREYXRhJGJhc2VSdW5uZXIgPSBldmVudERhdGEuYmFzZVJ1bm5lck5hbWVzKSA9PT0gbnVsbCB8fCBfZXZlbnREYXRhJGJhc2VSdW5uZXIgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9ldmVudERhdGEkYmFzZVJ1bm5lcltpXSkgfHwgJycsXG4gICAgICAgIHBsYXllcklkOiBldmVudERhdGEuYmFzZVJ1bm5lcnNbaV1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY2hlY2s6IGNoZWNrXG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiBjaGVjayhhbmFseXNpcywgZXZlbnREYXRhKSB7XG4gIHZhciBfZXZlbnREYXRhJGhvbWVUZWFtTmksIF9ldmVudERhdGEkYXdheVRlYW1OaTtcblxuICB2YXIgdXBkYXRlID0gdXRpbC5nZXRVcGRhdGVUZXh0KGV2ZW50RGF0YSk7XG4gIHZhciBob21lID0gKGV2ZW50RGF0YSA9PT0gbnVsbCB8fCBldmVudERhdGEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IChfZXZlbnREYXRhJGhvbWVUZWFtTmkgPSBldmVudERhdGEuaG9tZVRlYW1OaWNrbmFtZSkgPT09IG51bGwgfHwgX2V2ZW50RGF0YSRob21lVGVhbU5pID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfZXZlbnREYXRhJGhvbWVUZWFtTmkudG9Mb3dlckNhc2UoKSkgfHwgJyc7XG4gIHZhciBob21lU2NvcmUgPSAoZXZlbnREYXRhID09PSBudWxsIHx8IGV2ZW50RGF0YSA9PT0gdm9pZCAwID8gdm9pZCAwIDogZXZlbnREYXRhLmhvbWVTY29yZSkgfHwgMDtcbiAgdmFyIGF3YXkgPSAoZXZlbnREYXRhID09PSBudWxsIHx8IGV2ZW50RGF0YSA9PT0gdm9pZCAwID8gdm9pZCAwIDogKF9ldmVudERhdGEkYXdheVRlYW1OaSA9IGV2ZW50RGF0YS5hd2F5VGVhbU5pY2tuYW1lKSA9PT0gbnVsbCB8fCBfZXZlbnREYXRhJGF3YXlUZWFtTmkgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9ldmVudERhdGEkYXdheVRlYW1OaS50b0xvd2VyQ2FzZSgpKSB8fCAnJztcbiAgdmFyIGF3YXlTY29yZSA9IChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuYXdheVNjb3JlKSB8fCAwO1xuXG4gIGlmICh1cGRhdGUuaW5kZXhPZigncGxheSBiYWxsJykgPj0gMCkge1xuICAgIGFuYWx5c2lzLmdhbWVTdGF0dXMgPSAnYmVmb3JlRmlyc3RQaXRjaCc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ3RvcCBvZicpID49IDApIHtcbiAgICBhbmFseXNpcy5nYW1lU3RhdHVzID0gJ2ZpcnN0SGFsZklubmluZ1N0YXJ0JztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignYm90dG9tIG9mJykgPj0gMCkge1xuICAgIGFuYWx5c2lzLmdhbWVTdGF0dXMgPSAnc2Vjb25kSGFsZklubmluZ1N0YXJ0JztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignZ2FtZSBvdmVyJykgPj0gMCB8fCB1cGRhdGUuaW5kZXhPZihcIlwiLmNvbmNhdChob21lLCBcIiBcIikuY29uY2F0KGhvbWVTY29yZSwgXCIsIFwiKS5jb25jYXQoYXdheSwgXCIgXCIpLmNvbmNhdChhd2F5U2NvcmUpKSA+PSAwIHx8IHVwZGF0ZS5pbmRleE9mKFwiXCIuY29uY2F0KGF3YXksIFwiIFwiKS5jb25jYXQoYXdheVNjb3JlLCBcIiwgXCIpLmNvbmNhdChob21lLCBcIiBcIikuY29uY2F0KGhvbWVTY29yZSkpID49IDApIHtcbiAgICBhbmFseXNpcy5nYW1lU3RhdHVzID0gJ2dhbWVFbmQnO1xuICB9XG5cbiAgaWYgKGFuYWx5c2lzLmdhbWVTdGF0dXMpIHtcbiAgICByZXR1cm4gYW5hbHlzaXM7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY2hlY2s6IGNoZWNrXG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgY2hlY2tIaXRSYmlQcmVTMTIgPSBmdW5jdGlvbiBjaGVja0hpdFJiaVByZVMxMihhbmFseXNpcywgdXBkYXRlKSB7XG4gIC8vIGZyb20gc29tZSBub24tZXhoYXVzdGl2ZSByZXNlYXJjaCwgaSB0aGluayB0aGVyZSB3ZXJlbid0IGFueSBncmFuZCBzbGFtc1xuICAvLyBwcmUtczEyIHRoYXQgd2VyZSBub3QgNCBydW5zXG4gIGlmIChhbmFseXNpcy5oaXRNZXRhLmtpbmQgPT09ICdncmFuZFNsYW0nKSB7XG4gICAgYW5hbHlzaXMucnVuc1Njb3JlZCA9IDQ7XG4gICAgcmV0dXJuO1xuICB9IC8vIGlmIGEgc2luZ2xlL2RvdWJsZS90cmlwbGUgd2FzIGhpdCAmIHggcnVucyB3ZXJlIHNjb3JlZCwgaXQgc2hvd3MgdXBcbiAgLy8gYXQgdGhlIGVuZCBvZiB0aGUgdXBkYXRlIGFzIFwiLi4uISB4IHNjb3Jlc1wiXG5cblxuICB2YXIgcnVucyA9IHV0aWwuZ2V0TnVtYmVyKHVwZGF0ZSwgLyEgLywgLyBzY29yZXMvKSB8fCAwO1xuXG4gIGlmIChydW5zKSB7XG4gICAgYW5hbHlzaXMucnVuc1Njb3JlZCA9IHJ1bnM7XG4gICAgcmV0dXJuO1xuICB9IC8vIGlmIGEgc29sbyBob21lIHJ1biB3YXMgaGl0LCB1cGRhdGUgY29udGFpbnMgdGhlIHRleHQgXCJzb2xvIGhvbWUgcnVuXCJcblxuXG4gIGlmICh1cGRhdGUuaW5kZXhPZignc29sbyBob21lIHJ1bicpID49IDApIHtcbiAgICBhbmFseXNpcy5ydW5zU2NvcmVkID0gMTtcbiAgICByZXR1cm47XG4gIH0gLy8gaWYgYSBtdWx0aS1ydW4gaG9tZSBydW4gd2FzIGhpdCwgdXBkYXRlIGNvbnRhaW5zIHRoZSB0ZXh0IFwieC1ydW4gaG9tZVxuICAvLyBydW5cIlxuXG5cbiAgcnVucyA9IHV0aWwuZ2V0TnVtYmVyKHVwZGF0ZSwgbnVsbCwgLy1ydW4gaG9tZSBydW4vKSB8fCAwO1xuXG4gIGlmIChydW5zKSB7XG4gICAgYW5hbHlzaXMucnVuc1Njb3JlZCA9IHJ1bnM7XG4gICAgcmV0dXJuO1xuICB9XG59O1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiBjaGVjayhhbmFseXNpcywgZXZlbnREYXRhKSB7XG4gIHZhciB1cGRhdGUgPSB1dGlsLmdldFVwZGF0ZVRleHQoZXZlbnREYXRhKTtcblxuICBpZiAodXBkYXRlLmluZGV4T2YoJ2hpdHMgYSBzaW5nbGUnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuaGl0TWV0YS5raW5kID0gJ3NpbmdsZSc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2hpdHMgYSBkb3VibGUnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuaGl0TWV0YS5raW5kID0gJ2RvdWJsZSc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2hpdHMgYSB0cmlwbGUnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuaGl0TWV0YS5raW5kID0gJ3RyaXBsZSc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2hvbWUgcnVuJykgPj0gMCkge1xuICAgIGFuYWx5c2lzLmhpdE1ldGEua2luZCA9ICdob21lUnVuJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignZ3JhbmQgc2xhbScpID49IDApIHtcbiAgICBhbmFseXNpcy5oaXRNZXRhLmtpbmQgPSAnZ3JhbmRTbGFtJztcbiAgfVxuXG4gIGlmIChhbmFseXNpcy5oaXRNZXRhLmtpbmQpIHtcbiAgICBhbmFseXNpcy5oaXQgPSB0cnVlOyAvLyBjaGVjayBpZiBob21lIHJ1biAvIGdyYW5kIHNsYW0gbGFuZGVkIGluIGJpZyBidWNrZXRcblxuICAgIGlmICh1cGRhdGUuaW5kZXhPZignYmFsbCBsYW5kcyBpbiBhIGJpZyBidWNrZXQnKSA+PSAwKSB7XG4gICAgICBhbmFseXNpcy5oaXRNZXRhLmJpZ0J1Y2tldCA9IHRydWU7XG4gICAgfSAvL2Zyb20gczEyIG9ud2FyZCwgc2NvcmVzIG9uIHRoZSBwbGF5IGFyZSBpbiB0aGUgc2NvcmVVcGRhdGUgZmllbGRcbiAgICAvL2NvbnN0IHNjb3JlVXBkYXRlID0gZXZlbnREYXRhPy5zY29yZVVwZGF0ZSB8fCAnJztcbiAgICAvL2lmIChzY29yZVVwZGF0ZSkge1xuICAgIC8vYW5hbHlzaXMucnVuc1Njb3JlZCA9IHV0aWwuZ2V0TnVtYmVyKHNjb3JlVXBkYXRlLCBudWxsLCBudWxsKSB8fCAwO1xuICAgIC8vIGlmIHRoZXJlJ3Mgbm8gc2NvcmVVcGRhdGUsIGRlZHVjZSB0aGUgc2NvcmUgZnJvbSB0aGUgdXBkYXRlXG4gICAgLy8gdGhpcyBpcyB0aGUgY2FzZSBmb3IgZ2FtZXMgYmV0d2VlbiBzMiAmIHMxMVxuXG5cbiAgICBpZiAoIShldmVudERhdGEgIT09IG51bGwgJiYgZXZlbnREYXRhICE9PSB2b2lkIDAgJiYgZXZlbnREYXRhLnNjb3JlVXBkYXRlKSkge1xuICAgICAgY2hlY2tIaXRSYmlQcmVTMTIoYW5hbHlzaXMsIHVwZGF0ZSk7XG4gICAgfSAvLyBzY29yZSB1cGRhdGVzIGZyb20gczEyIG9ud2FyZCByZWdpc3RlcmVkIGluIHNyYy9taXNjLmpzXG5cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNoZWNrOiBjaGVja1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGNoZWNrTWF4aW11bUJsYXNlYmFsbCA9IGZ1bmN0aW9uIGNoZWNrTWF4aW11bUJsYXNlYmFsbChhbmFseXNpcywgZXZlbnREYXRhKSB7XG4gIHZhciBiYWxscywgYmFzZXMsIG91dHMsIHN0cmlrZXM7XG5cbiAgaWYgKGV2ZW50RGF0YS50b3BPZklubmluZykge1xuICAgIC8vIGF3YXkgaXMgYmF0dGluZ1xuICAgIGJhbGxzID0gZXZlbnREYXRhLmF3YXlCYWxscztcbiAgICBiYXNlcyA9IGV2ZW50RGF0YS5hd2F5QmFzZXM7XG4gICAgb3V0cyA9IGV2ZW50RGF0YS5hd2F5T3V0cztcbiAgICBzdHJpa2VzID0gZXZlbnREYXRhLmF3YXlTdHJpa2VzO1xuICB9IGVsc2Uge1xuICAgIC8vIGhvbWUgaXMgYmF0dGluZ1xuICAgIGJhbGxzID0gZXZlbnREYXRhLmhvbWVCYWxscztcbiAgICBiYXNlcyA9IGV2ZW50RGF0YS5ob21lQmFzZXM7XG4gICAgb3V0cyA9IGV2ZW50RGF0YS5ob21lT3V0cztcbiAgICBzdHJpa2VzID0gZXZlbnREYXRhLmhvbWVTdHJpa2VzO1xuICB9XG5cbiAgaWYgKGV2ZW50RGF0YS5oYWxmSW5uaW5nT3V0cyA9PT0gb3V0cyAtIDEgJiYgZXZlbnREYXRhLmF0QmF0QmFsbHMgPT09IGJhbGxzIC0gMSAmJiBldmVudERhdGEuYXRCYXRTdHJpa2VzID09PSBzdHJpa2VzIC0gMSAmJiBldmVudERhdGEuYmFzZXJ1bm5lckNvdW50ID09PSBiYXNlcyAtIDEpIHtcbiAgICBhbmFseXNpcy5tYXhpbXVtQmxhc2ViYWxsID0gdHJ1ZTtcbiAgfVxufTtcblxudmFyIGNoZWNrU2NvcmVVcGRhdGUgPSBmdW5jdGlvbiBjaGVja1Njb3JlVXBkYXRlKGFuYWx5c2lzLCBldmVudERhdGEpIHtcbiAgdmFyIF9ldmVudERhdGEkc2NvcmVVcGRhdDtcblxuICB2YXIgc2NvcmVVcGRhdGUgPSBldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiAoX2V2ZW50RGF0YSRzY29yZVVwZGF0ID0gZXZlbnREYXRhLnNjb3JlVXBkYXRlKSA9PT0gbnVsbCB8fCBfZXZlbnREYXRhJHNjb3JlVXBkYXQgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9ldmVudERhdGEkc2NvcmVVcGRhdC50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmIChzY29yZVVwZGF0ZSkge1xuICAgIGFuYWx5c2lzLnJ1bnNTY29yZWQgPSB1dGlsLmdldE51bWJlcihzY29yZVVwZGF0ZSwgbnVsbCwgLyBydW5zPyBzY29yZS8pO1xuICAgIGFuYWx5c2lzLnVucnVuc1Njb3JlZCA9IHV0aWwuZ2V0TnVtYmVyKHNjb3JlVXBkYXRlLCBudWxsLCAvIHVucnVucz8gc2NvcmUvKTtcbiAgfVxufTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gY2hlY2soYW5hbHlzaXMsIGV2ZW50RGF0YSkge1xuICB2YXIgdXBkYXRlID0gdXRpbC5nZXRVcGRhdGVUZXh0KGV2ZW50RGF0YSk7XG4gIGNoZWNrU2NvcmVVcGRhdGUoYW5hbHlzaXMsIGV2ZW50RGF0YSk7XG4gIGNoZWNrTWF4aW11bUJsYXNlYmFsbChhbmFseXNpcywgZXZlbnREYXRhKTsgLy8gY2hlY2sgZm9yIHdoZXRoZXIgYSBiYXR0ZXIganVzdCBzaG93ZWQgdXAgdG8gYmF0XG5cbiAgaWYgKHVwZGF0ZS5pbmRleE9mKCdiYXR0aW5nIGZvcicpID49IDApIHtcbiAgICBhbmFseXNpcy5iYXR0ZXJVcCA9IHRydWU7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjaGVjazogY2hlY2tcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBnYW1lU3RhdHVzID0gcmVxdWlyZSgnLi9nYW1lLXN0YXR1cycpO1xuXG52YXIgb3V0cyA9IHJlcXVpcmUoJy4vb3V0cycpO1xuXG52YXIgaGl0cyA9IHJlcXVpcmUoJy4vaGl0cycpO1xuXG52YXIgc3RlYWxzID0gcmVxdWlyZSgnLi9zdGVhbHMnKTtcblxudmFyIHdhbGtzID0gcmVxdWlyZSgnLi93YWxrcycpO1xuXG52YXIgc3BlY2lhbCA9IHJlcXVpcmUoJy4vc3BlY2lhbCcpO1xuXG52YXIgbWlzYyA9IHJlcXVpcmUoJy4vbWlzYycpO1xuXG52YXIgYmFzZVJ1bm5lcnMgPSByZXF1aXJlKCcuL2Jhc2UtcnVubmVycycpO1xuLypcbiAqIHNldHMgYWxsIGtub3duIChha2EgaW1wbGVtZW50ZWQpIGFuYWx5c2lzIHJlc3VsdHMgdG8gdGhlaXIgZGVmYXVsc1xuICogcmV0dXJuIGFuIG9iamVjdCB3aXRoIHRoZSBwcm9wczpcbiAqXG4gKiBpZDogc3RyaW5nIHx8IHVuZGVmaW5lZFxuICogICAtIHRoZSBnYW1lIGV2ZW50IElEXG4gKlxuICogcnVuc1Njb3JlZDogbnVtYmVyXG4gKiAgIC0gaG93IG1hbnkgcnVucyB3ZXJlIHNjb3JlZCBvbiB0aGUgcGxheVxuICpcbiAqIHVucnVuc1Njb3JlZDogbnVtYmVyXG4gKiAgIC0gaG93IG1hbnkgdW5ydW5zIHdlcmUgc2NvcmVkIG9uIHRoZSBwbGF5XG4gKlxuICogYmF0dGVyVXA6IGJvb2xlYW5cbiAqICAgLSB3aGV0aGVyIGEgYmF0dGVyIGp1c3Qgc2hvd2VkIHVwIHRvIGJhdFxuICpcbiAqIGdhbWVTdGF0dXM6IG51bGwgfHwgc3RyaW5nXG4gKiAgIC0gd2lsbCBiZSBudWxsIG9yIG9uZSBvZjpcbiAqICAgLSBiZWZvcmVGaXJzdFBpdGNoLCB3aGVuIHRoZSBmaXJzdCBwaXRjaCBoYXNuJ3QgYmVlbiB0aHJvd24geWV0XG4gKiAgIC0gZmlyc3RIYWxmSW5uaW5nU3RhcnQsIHdoZW4gdGhlIGZpcnN0IGhhbGYgb2YgYW4gaW5uaW5nIGlzIHN0YXJ0aW5nXG4gKiAgIC0gc2Vjb25kSGFsZklubmluZ1N0YXJ0LCB3aGVuIHRoZSBzZWNvbmQgaGFsZiBvZiBhbiBpbm5pbmcgaXMgc3RhcnRpbmdcbiAqICAgLSBoYWxmSW5uaW5nRW5kLCB3aGVuIGFueSBoYWxmIG9mIGFuIGlubmluZyBpcyBlbmRpbmcgb24gdGhlIHBsYXlcbiAqICAgLSBnYW1lRW5kLCB3aGVuIHRoZSBnYW1lIGhhcyBlbmRlZFxuICogICAtIGlubmluZ1Jld2luZCwgd2hlbiB0aGUgc2FsbW9uIHN3aW0gdXBzdHJlYW1cbiAqXG4gKiBvdXQ6IGJvb2xlYW5cbiAqICAgLSB0cnVlIHdoZW4gdGhlcmUgaXMgYW4gb3V0IG9uIHRoZSBwbGF5XG4gKiBvdXRNZXRhOiBvYmplY3QsIHdpdGggdGhlIHByb3BzOlxuICogICAtIGtpbmQ6IG51bGwgfHwgc3RyaW5nXG4gKiAgICAgLSB3aWxsIGJlIG9uZSBvZjpcbiAqICAgICAtIGZseVxuICogICAgIC0gZ3JvdW5kXG4gKiAgICAgLSBzdHJpa2VcbiAqICAgICAtIGNhdWdodFN0ZWFsaW5nXG4gKiAgICAgLSB1bnNwZWNpZmllZCAoYXMgeW91IHNvbWV0aW1lcyBzZWUgd2l0aCBzYWNyaWZpY2Ugb3V0cylcbiAqICAgLSBzYWNyaWZpY2U6IGJvb2xlYW5cbiAqICAgICAtIHRydWUgd2hlbiB0aGUgb3V0IHdhcyBhIHNhY3JpZmljZVxuICogICAtIHNhY3JpZmljZU1ldGE6IG9iamVjdCwgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BzOlxuICogICAgIC0ga2luZDogc3RyaW5nIHx8IG51bGxcbiAqICAgICAgIC0gd2lsbCBiZSBvbmUgb2Y6XG4gKiAgICAgICAtIGFkdmFuY2VcbiAqICAgICAgIC0gc2NvcmVcbiAqICAgLSBmcmVlUmVmaWxsOiBib29sZWFuXG4gKiAgICAgLSB0cnVlIHdoZW4gYmF0dGVyIHVzZWQgdGhlaXIgZnJlZSByZWZpbGwgb24gdGhlIHBsYXlcbiAqXG4gKiBoaXQ6IGJvb2xlYW5cbiAqICAgLSB0cnVlIHdoZW4gdGhlcmUgaXMgYSBoaXQgb24gdGhlIHBsYXlcbiAqIGhpdE1ldGE6IG9iamVjdCwgd2l0aCB0aGUgcHJvcHM6XG4gKiAgIC0ga2luZDogbnVsbCB8fCBzdHJpbmdcbiAqICAgICAtIHdpbGwgYmUgb25lIG9mOlxuICogICAgIC0gc2luZ2xlXG4gKiAgICAgLSBkb3VibGVcbiAqICAgICAtIHRyaXBsZVxuICogICAgIC0gaG9tZVJ1blxuICogICAgIC0gZ3JhbmRTbGFtXG4gKiAgIC0gYmlnQnVja2V0OiBib29sZWFuXG4gKiAgICAgLSB3aGV0aGVyIGEgQmlnIEJ1Y2tldCB3YXMgYWN0aXZhdGVkIG9uIHRoZSBwbGF5XG4gKlxuICogc3RlYWw6IGJvb2xlYW5cbiAqICAgLSB0cnVlIHdoZW4gdGhlcmUgaXMgYW4gYXR0ZW1wdGVkIHN0ZWFsIG9uIHRoZSBwbGF5XG4gKiBzdGVhbE1ldGE6IG9iamVjdCwgd2l0aCB0aGUgcHJvcHM6XG4gKiAgIC0gc3VjY2VzczogYm9vbGVhblxuICogICAgIC0gdHJ1ZSB3aGVuIHRoaWVmIG5vdCBjYXVnaHQsIGZhbHNlIG90aGVyd2lzZVxuICogICAtIGJhc2VTdG9sZW46IG51bGwgfHwgbnVtYmVyXG4gKiAgICAgLSB0aGUgYmFzZSB3aGljaCB3YXMgc3RvbGVuICgwLWluZGV4ZWQpXG4gKlxuICogd2FsazogYm9vbGVhblxuICogICAtIHRydWUgd2hlbiB0aGVyZSBpcyBhIHdhbGsgb24gdGhlIHBsYXlcbiAqIHdhbGtNZXRhOiBvYmplY3QsIHdpdGggdGhlIHByb3BzOlxuICogICAtIG1pbmRUcmljazogYm9vbGVhblxuICogICAgIC0gdHJ1ZSB3aGVuIHRoZSBwaXRjaGVzIHVzZWQgYSBtaW5kIHRyaWNrIHRvIHR1cm4gdGhlIHdhbGsgaW50byBhXG4gKiAgICAgICBzdHJpa2VvdXRcbiAqXG4gKiBzcGVjaWFsOiBib29sZWFuXG4gKiAgIC0gdHJ1ZSB3aGVuIHRoZXJlIHdhcyBhIHNwZWNpYWwgZXZlbnQgb24gdGhlIHBsYXlcbiAqIHNwZWNpYWxNZXRhOiBvYmplY3QsIHdpdGggdGhlIHByb3BzOlxuICogICAtIGtpbmQ6IG51bGwgfHwgc3RyaW5nXG4gKiAgICAgLSB3aWxsIGJlIG9uZSBvZjpcbiAqICAgICAtIGJsb29kcmFpblxuICogICAgIC0gaXNQYXJ0eWluZ1xuICogICAgIC0gcmV2ZXJiXG4gKiAgICAgLSBiaXJkc0NpcmNsZVxuICogICAgIC0gYmlyZHNQZWNrZWRcbiAqICAgICAtIGp1c3RCaXJkc1xuICogICAgIC0gYWxsZXJnaWNSZWFjdGlvblxuICogICAgIC0gaW5jaW5lcmF0ZWRcbiAqICAgICAtIGJlY2FtZU1hZ21hdGljXG4gKiAgICAgLSBmZWVkYmFja1xuICogICAgIC0gZWxlY3RyaWNpdHlcbiAqICAgICAtIHVuc3RhYmxlXG4gKiAgICAgLSBmbGlja2VyaW5nXG4gKiAgICAgLSBjb25zdW1lcnNBdHRhY2tcbiAqICAgICAtIHNhbG1vblxuICogICAtIGRldGFpbHM6IG9iamVjdCwgd2l0aCBwcm9wcyBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2YgZXZlbnRcbiAqXG4gKiBiYXNlUnVubmVyczogb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBwcm9wcywgcmVwcmVzZW50aW5nIGJhc2VzXG4gKiAgIC0gZmlyc3RcbiAqICAgLSBzZWNvbmRcbiAqICAgLSB0aGlyZFxuICogICAtIGZvdXJ0aFxuICogICAtIGlmIHRoZXJlIGlzIGEgYmFzZXJ1bm5lciBvbiB0aGUgZ2l2ZW4gYmFzZSwgdGhlIHZhbHVlIGZvciB0aGF0IGJhc2VcbiAqICAgICB3aWxsIGJlIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgcHJvcHM6XG4gKiAgICAgLSBwbGF5ZXJOYW1lXG4gKiAgICAgLSBwbGF5ZXJJZFxuICpcbiAqIG1heGltdW1CbGFzZWJhbGw6IGJvb2xlYW5cbiAqICAgLSB0cnVlIHdoZW4gd2UncmUgYXQgTUFYSU1VTSBCTEFTRUJBTExcbiAqL1xuXG5cbnZhciBpbml0QW5hbHlzaXMgPSBmdW5jdGlvbiBpbml0QW5hbHlzaXMoZXZlbnREYXRhKSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGV2ZW50RGF0YS5pZCB8fCBldmVudERhdGEuX2lkLFxuICAgIGdhbWVTdGF0dXM6IG51bGwsXG4gICAgcnVuc1Njb3JlZDogMCxcbiAgICB1bnJ1bnNTY29yZWQ6IDAsXG4gICAgYmF0dGVyVXA6IGZhbHNlLFxuICAgIG91dDogZmFsc2UsXG4gICAgb3V0TWV0YToge1xuICAgICAga2luZDogbnVsbCxcbiAgICAgIHNhY3JpZmljZTogZmFsc2UsXG4gICAgICBzYWNyaWZpY2VNZXRhOiB7XG4gICAgICAgIGtpbmQ6IG51bGxcbiAgICAgIH0sXG4gICAgICBmcmVlUmVmaWxsOiBmYWxzZVxuICAgIH0sXG4gICAgaGl0OiBmYWxzZSxcbiAgICBoaXRNZXRhOiB7XG4gICAgICBraW5kOiBudWxsLFxuICAgICAgYmlnQnVja2V0OiBmYWxzZVxuICAgIH0sXG4gICAgc3RlYWw6IGZhbHNlLFxuICAgIHN0ZWFsTWV0YToge1xuICAgICAgc3VjY2VzczogbnVsbCxcbiAgICAgIGJhc2VTdG9sZW46IG51bGxcbiAgICB9LFxuICAgIHdhbGs6IGZhbHNlLFxuICAgIHdhbGtNZXRhOiB7XG4gICAgICBtaW5kVHJpY2s6IGZhbHNlXG4gICAgfSxcbiAgICBzcGVjaWFsOiBmYWxzZSxcbiAgICBzcGVjaWFsTWV0YToge1xuICAgICAga2luZDogbnVsbFxuICAgIH0sXG4gICAgYmFzZVJ1bm5lcnM6IHtcbiAgICAgIGZpcnN0OiB7fSxcbiAgICAgIHNlY29uZDoge30sXG4gICAgICB0aGlyZDoge30sXG4gICAgICBmb3VydGg6IHt9XG4gICAgfSxcbiAgICBtYXhpbXVtQmxhc2ViYWxsOiBmYWxzZVxuICB9O1xufTtcblxudmFyIGFuYWx5emVHYW1lRXZlbnQgPSBmdW5jdGlvbiBhbmFseXplR2FtZUV2ZW50KGV2ZW50RGF0YSkge1xuICBpZiAoIWV2ZW50RGF0YSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmFyIGFuYWx5c2lzID0gaW5pdEFuYWx5c2lzKGV2ZW50RGF0YSk7XG4gIHZhciBjaGVja2VycyA9IFtnYW1lU3RhdHVzLCBvdXRzLCBoaXRzLCB3YWxrcywgc3RlYWxzLCBzcGVjaWFsLCBtaXNjLCBiYXNlUnVubmVyc107XG5cbiAgZm9yICh2YXIgX2kgPSAwLCBfY2hlY2tlcnMgPSBjaGVja2VyczsgX2kgPCBfY2hlY2tlcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgdmFyIGNoZWNrZXIgPSBfY2hlY2tlcnNbX2ldO1xuICAgIGNoZWNrZXIuY2hlY2soYW5hbHlzaXMsIGV2ZW50RGF0YSk7XG4gIH1cblxuICByZXR1cm4gYW5hbHlzaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYW5hbHl6ZUdhbWVFdmVudDogYW5hbHl6ZUdhbWVFdmVudFxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gY2hlY2soYW5hbHlzaXMsIGV2ZW50RGF0YSkge1xuICB2YXIgdXBkYXRlID0gdXRpbC5nZXRVcGRhdGVUZXh0KGV2ZW50RGF0YSk7XG5cbiAgaWYgKHVwZGF0ZS5pbmRleE9mKCdmbHlvdXQnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMub3V0TWV0YS5raW5kID0gJ2ZseSc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2dyb3VuZCBvdXQnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMub3V0TWV0YS5raW5kID0gJ2dyb3VuZCc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ3N0cmlrZXMgb3V0JykgPj0gMCkge1xuICAgIGFuYWx5c2lzLm91dE1ldGEua2luZCA9ICdzdHJpa2UnO1xuICB9IGVsc2UgaWYgKHVwZGF0ZS5pbmRleE9mKCdmaWVsZGVyXFwncyBjaG9pY2UnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMub3V0TWV0YS5raW5kID0gJ2ZpZWxkZXJzQ2hvaWNlJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignYSBkb3VibGUgcGxheScpID49IDApIHtcbiAgICBhbmFseXNpcy5vdXRNZXRhLmtpbmQgPSAnZG91YmxlUGxheSc7XG4gIH1cblxuICBpZiAodXBkYXRlLmluZGV4T2YoJ3NhY3JpZmljZScpID49IDApIHtcbiAgICAvLyB0aGlzIG1heSBhbHJlYWR5IGJlIGEgZ3JvdW5kL2ZseW91dCwgb3IgaXRzIHVuc3BlY2lmaWVkXG4gICAgYW5hbHlzaXMub3V0TWV0YS5raW5kID0gYW5hbHlzaXMub3V0TWV0YS5raW5kIHx8ICd1bnNwZWNpZmllZCc7XG4gICAgYW5hbHlzaXMub3V0TWV0YS5zYWNyaWZpY2UgPSB0cnVlOyAvLyBjaGVjayBpZiBzb21lb25lIHNjb3JlZCBvciBhZHZhbmNlZCBvbiB0aGUgc2FjcmlmaWNlXG5cbiAgICBpZiAodXBkYXRlLmluZGV4T2YoJ3Njb3JlcycpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLm91dE1ldGEuc2FjcmlmaWNlTWV0YS5raW5kID0gJ3Njb3JlJztcblxuICAgICAgaWYgKCEoZXZlbnREYXRhICE9PSBudWxsICYmIGV2ZW50RGF0YSAhPT0gdm9pZCAwICYmIGV2ZW50RGF0YS5zY29yZVVwZGF0ZSkpIHtcbiAgICAgICAgYW5hbHlzaXMucnVuc1Njb3JlZCA9IDE7XG4gICAgICB9IC8vIG90aGVyd2lzZSBzY29yZXMgYXJlIGNhcHR1cmVkIGluIHNyYy9taXNjLmpzXG5cbiAgICB9IGVsc2UgaWYgKHVwZGF0ZS5pbmRleE9mKCdhZHZhbmNlJykgPj0gMCkge1xuICAgICAgYW5hbHlzaXMub3V0TWV0YS5zYWNyaWZpY2VNZXRhLmtpbmQgPSAnYWR2YW5jZSc7XG4gICAgfVxuICB9XG5cbiAgaWYgKGFuYWx5c2lzLm91dE1ldGEua2luZCkge1xuICAgIGFuYWx5c2lzLm91dCA9IHRydWU7XG5cbiAgICBpZiAoKGV2ZW50RGF0YSA9PT0gbnVsbCB8fCBldmVudERhdGEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGV2ZW50RGF0YS5oYWxmSW5uaW5nT3V0cykgPT09IDApIHtcbiAgICAgIGFuYWx5c2lzLmdhbWVTdGF0dXMgPSAnaGFsZklubmluZ0VuZCc7XG4gICAgfVxuXG4gICAgaWYgKHVwZGF0ZS5pbmRleE9mKCdmcmVlIHJlZmlsbCcpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLm91dE1ldGEuZnJlZVJlZmlsbCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHVwZGF0ZS5pbmRleE9mKCd1c2VzIGEgbWluZCB0cmljaycpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLm91dE1ldGEubWluZFRyaWNrID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjaGVjazogY2hlY2tcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIG93bktleXMob2JqZWN0LCBlbnVtZXJhYmxlT25seSkgeyB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7IGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7IHZhciBzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpOyBpZiAoZW51bWVyYWJsZU9ubHkpIHN5bWJvbHMgPSBzeW1ib2xzLmZpbHRlcihmdW5jdGlvbiAoc3ltKSB7IHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgc3ltKS5lbnVtZXJhYmxlOyB9KTsga2V5cy5wdXNoLmFwcGx5KGtleXMsIHN5bWJvbHMpOyB9IHJldHVybiBrZXlzOyB9XG5cbmZ1bmN0aW9uIF9vYmplY3RTcHJlYWQodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV0gIT0gbnVsbCA/IGFyZ3VtZW50c1tpXSA6IHt9OyBpZiAoaSAlIDIpIHsgb3duS2V5cyhPYmplY3Qoc291cmNlKSwgdHJ1ZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IF9kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgc291cmNlW2tleV0pOyB9KTsgfSBlbHNlIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycykgeyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKHNvdXJjZSkpOyB9IGVsc2UgeyBvd25LZXlzKE9iamVjdChzb3VyY2UpKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwga2V5KSk7IH0pOyB9IH0gcmV0dXJuIHRhcmdldDsgfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKSB7IGlmIChrZXkgaW4gb2JqKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgeyB2YWx1ZTogdmFsdWUsIGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUgfSk7IH0gZWxzZSB7IG9ialtrZXldID0gdmFsdWU7IH0gcmV0dXJuIG9iajsgfVxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgY2hlY2sgPSBmdW5jdGlvbiBjaGVjayhhbmFseXNpcywgZXZlbnREYXRhKSB7XG4gIHZhciB1cGRhdGUgPSB1dGlsLmdldFVwZGF0ZVRleHQoZXZlbnREYXRhKTtcblxuICBpZiAodXBkYXRlLmluZGV4T2YoJ2Jsb29kZHJhaW4nKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdibG9vZGRyYWluJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignaXMgcGFydHlpbmcnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdpc1BhcnR5aW5nJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZigncmV2ZXJiJykgPj0gMCkge1xuICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmtpbmQgPSAncmV2ZXJiJztcbiAgfSBlbHNlIGlmICggLy8gdGhpcyBjaGVjayBoYXMgdG8gY29tZSBiZWZvcmUgYmlyZHMgY2lyY2xlLCBiZWNhdXNlIHRoZSB0ZXh0XG4gIC8vICd0aGUgYmlyZHMgY2lyY2xlJyBpcyBwcmVzZW50IGluIGJvdGggY2FzZXNcbiAgdXBkYXRlLmluZGV4T2YoJ3RoZSBiaXJkcyBwZWNrZWQnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdiaXJkc1BlY2tlZCc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ3RoZSBiaXJkcyBjaXJjbGUnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdiaXJkc0NpcmNsZSc7XG4gIH0gZWxzZSBpZiAoIC8vIHRoaXMgaXMgdG8gY2FwdHVyZSBhbnkgb3RoZXIgbm9uLXBlY2tpbmcgJiBub24tY2lyY2xpbmcgYmlyZGluZXNzXG4gIHVwZGF0ZS5pbmRleE9mKCdiaXJkcycpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2p1c3RCaXJkcyc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2hhZCBhbiBhbGxlcmdpYyByZWFjdGlvbicpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2FsbGVyZ2ljUmVhY3Rpb24nO1xuICB9IGVsc2UgaWYgKHVwZGF0ZS5pbmRleE9mKCdyb2d1ZSB1bXBpcmUgaW5jaW5lcmF0ZWQnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdpbmNpbmVyYXRlZCc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2JlY2FtZSBtYWdtYXRpYycpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2JlY2FtZU1hZ21hdGljJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignZmVlZGJhY2snKSA+PSAwICYmICh1cGRhdGUuaW5kZXhPZigncmVhbGl0eSBmbGlja2VycycpID49IDAgfHwgdXBkYXRlLmluZGV4T2YoJ3N3aXRjaGVkIHRlYW1zJykgPj0gMCkpIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2ZlZWRiYWNrJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZigndGhlIGVsZWN0cmljaXR5IHphcHMnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdlbGVjdHJpY2l0eSc7XG4gIH0gZWxzZSBpZiAodXBkYXRlLmluZGV4T2YoJ2lzIG5vdyB1bnN0YWJsZScpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ3Vuc3RhYmxlJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignaXMgbm93IGZsaWNrZXJpbmcnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdmbGlja2VyaW5nJztcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignY29uc3VtZXJzIGF0dGFjaycpID49IDApIHtcbiAgICBpZiAodXBkYXRlLmluZGV4T2YoJ2RlZmVuZHMnKSA+PSAwKSB7XG4gICAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2NvbnN1bWVyc0F0dGFja0RlZmVuZGVkJztcbiAgICB9IGVsc2Uge1xuICAgICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdjb25zdW1lcnNBdHRhY2snO1xuICAgIH1cbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignc2FsbW9uIHN3aW0gdXBzdHJlYW0nKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdzYWxtb24nO1xuICAgIGFuYWx5c2lzLmdhbWVTdGF0dXMgPSAnaW5uaW5nUmV3aW5kJzsgLy8gZmlyc3QsIGdyYWIgYWxsIHRoZSBzZW50ZW5jZXMgd2l0aCB3aGljaCB0ZWFtIGxvc3QgaG93IG1hbnkgcnVuc1xuXG4gICAgdmFyIHRlYW1zID0gdXBkYXRlLm1hdGNoKC8oXFxkKyhcXC5cXGQrKT8pIG9mIHRoZSAuKidzIHJ1bnMgYXJlIGxvc3QvZyk7XG5cbiAgICBpZiAodGVhbXMpIHtcbiAgICAgIHZhciBydW5zU3RvbGVuID0gdGVhbXMubWFwKGZ1bmN0aW9uICh0ZWFtKSB7XG4gICAgICAgIHJldHVybiB1dGlsLmdldE51bWJlcih0ZWFtLCBudWxsLCBudWxsKSB8fCAwO1xuICAgICAgfSk7XG4gICAgICB2YXIgcnVuc1N0b2xlbkZyb20gPSB0ZWFtcy5tYXAoZnVuY3Rpb24gKHRlYW0pIHtcbiAgICAgICAgcmV0dXJuIHV0aWwuZ2V0VGVhbShldmVudERhdGEsIHRlYW0sIC9vZiB0aGUgLywgLydzIHJ1bnMvKTtcbiAgICAgIH0pO1xuICAgICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEuZGV0YWlscyA9IHtcbiAgICAgICAgcnVuc1N0b2xlbjogcnVuc1N0b2xlbixcbiAgICAgICAgcnVuc1N0b2xlbkZyb206IHJ1bnNTdG9sZW5Gcm9tXG4gICAgICB9O1xuICAgIH1cbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZigncnVucyBhcmUgb3ZlcmZsb3dpbmcnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdydW5zT3ZlcmZsb3dpbmcnO1xuICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmRldGFpbHMgPSB7XG4gICAgICBydW5zR2FpbmVkOiB1dGlsLmdldE51bWJlcih1cGRhdGUsIG51bGwsIC8gdW5ydW5zLyksXG4gICAgICBydW5zT3ZlcmZsb3dpbmdGb3I6IHV0aWwuZ2V0VGVhbShldmVudERhdGEsIHVwZGF0ZSwgL1xcbi8sIC8gZ2Fpbi8pXG4gICAgfTtcbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignc29sYXIgcGFuZWxzIGFic29yYicpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ3J1bnNDb2xsZWN0ZWQnO1xuICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmRldGFpbHMgPSB7XG4gICAgICBydW5zQ29sbGVjdGVkOiB1dGlsLmdldE51bWJlcih1cGRhdGUsIG51bGwsIC8gcnVucyBhcmUgY29sbGVjdGVkLyksXG4gICAgICBydW5zQ29sbGVjdGVkRnJvbTogdXRpbC5nZXRUZWFtKGV2ZW50RGF0YSwgdXBkYXRlLCAvc2F2ZWQgZm9yIHRoZSAvLCAvJ3MgbmV4dCBnYW1lLylcbiAgICB9O1xuICB9IGVsc2UgaWYgKHVwZGF0ZS5pbmRleE9mKCdzdW4gMiBzbWlsZXMnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCA9ICdzdW4yJztcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5kZXRhaWxzID0ge1xuICAgICAgcnVuc0NvbGxlY3RlZDogdXRpbC5nZXROdW1iZXIodXBkYXRlLCBudWxsLCAvISBzdW4gMiBzbWlsZXMvKSxcbiAgICAgIHdpblNldFVwb246IHV0aWwuZ2V0VGVhbShldmVudERhdGEsIHVwZGF0ZSwgL3NldCBhIHdpbiB1cG9uIHRoZSAvLCAvXFwuLylcbiAgICB9O1xuICB9IGVsc2UgaWYgKHVwZGF0ZS5pbmRleE9mKCdibGFjayBob2xlIHN3YWxsb3dzJykgPj0gMCkge1xuICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmtpbmQgPSAnYmxhY2tIb2xlJztcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5kZXRhaWxzID0ge1xuICAgICAgcnVuc0NvbGxlY3RlZDogdXRpbC5nZXROdW1iZXIodXBkYXRlLCAvY29sbGVjdCAvLCAvIS8pLFxuICAgICAgd2luU3dhbGxvd2VkRnJvbTogdXRpbC5nZXRUZWFtKGV2ZW50RGF0YSwgdXBkYXRlLCAvc3dhbGxvd3MgdGhlIHJ1bnMgYW5kIGEgLywgLyB3aW4uLylcbiAgICB9OyAvLyBzZWUgaWYgY2FyY2luaXphdGlvbiB0cmlnZ2VyZWQgYnkgdGhlIGJsYWNrIGhvbGVcblxuICAgIGlmICh1cGRhdGUuaW5kZXhPZigndGhlIGJhbHRpbW9yZSBjcmFicyBzdGVhbCcpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmRldGFpbHMucGxheWVyU3RvbGVuID0gdXRpbC5nZXRQbGF5ZXIodXBkYXRlLCAvY3JhYnMgc3RlYWwgLywgLyBmb3IgdGhlIHJlbWFpbmRlci8pO1xuICAgIH1cbiAgfSBlbHNlIGlmICh1cGRhdGUuaW5kZXhPZignZ3JpbmQgcmFpbCcpID49IDApIHtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5raW5kID0gJ2dyaW5kUmFpbCc7XG4gICAgdmFyIHRyaWNrcyA9IHV0aWwuZ2V0U2thdGVUcmlja3ModXBkYXRlKTtcbiAgICBhbmFseXNpcy5zcGVjaWFsTWV0YS5kZXRhaWxzID0gX29iamVjdFNwcmVhZCh7XG4gICAgICBwbGF5ZXI6IHV0aWwuZ2V0UGxheWVyKHVwZGF0ZSwgL14vLCAvIGhvcHMgb24vKVxuICAgIH0sIHRyaWNrcyk7XG5cbiAgICBpZiAodXBkYXRlLmluZGV4T2YoJ3NhZmUhJykgPj0gMCkge1xuICAgICAgYW5hbHlzaXMuc3BlY2lhbE1ldGEuZGV0YWlscyA9IF9vYmplY3RTcHJlYWQoX29iamVjdFNwcmVhZCh7fSwgYW5hbHlzaXMuc3BlY2lhbE1ldGEuZGV0YWlscyksIHt9LCB7XG4gICAgICAgIGdyaW5kU3VjY2VzczogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG91dCFcbiAgICAgIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmRldGFpbHMgPSBfb2JqZWN0U3ByZWFkKF9vYmplY3RTcHJlYWQoe30sIGFuYWx5c2lzLnNwZWNpYWxNZXRhLmRldGFpbHMpLCB7fSwge1xuICAgICAgICBncmluZFN1Y2Nlc3M6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGFuYWx5c2lzLm91dCA9IHRydWU7XG4gICAgICBhbmFseXNpcy5vdXRNZXRhLmtpbmQgPSAncmFpbEJhaWwnO1xuICAgIH1cbiAgfSAvLyBpZiB3ZSBmb3VuZCBzb21ldGhpbmcsIHRoZW46XG5cblxuICBpZiAoYW5hbHlzaXMuc3BlY2lhbE1ldGEua2luZCkge1xuICAgIGFuYWx5c2lzLnNwZWNpYWwgPSB0cnVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNoZWNrOiBjaGVja1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gY2hlY2soYW5hbHlzaXMsIGV2ZW50RGF0YSkge1xuICB2YXIgdXBkYXRlID0gdXRpbC5nZXRVcGRhdGVUZXh0KGV2ZW50RGF0YSk7XG5cbiAgaWYgKHVwZGF0ZS5pbmRleE9mKCdzdGVhbCcpID49IDApIHtcbiAgICBhbmFseXNpcy5zdGVhbCA9IHRydWU7XG5cbiAgICBpZiAodXBkYXRlLmluZGV4T2YoJ2NhdWdodCcpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLnN0ZWFsTWV0YS5zdWNjZXNzID0gZmFsc2U7XG4gICAgICBhbmFseXNpcy5vdXQgPSB0cnVlO1xuICAgICAgYW5hbHlzaXMub3V0TWV0YS5raW5kID0gJ2NhdWdodFN0ZWFsaW5nJztcbiAgICB9IGVsc2Uge1xuICAgICAgYW5hbHlzaXMuc3RlYWxNZXRhLnN1Y2Nlc3MgPSB0cnVlO1xuICAgIH0gLy8gYmFzZVN0b2xlbiBpcyAwLWluZGV4ZWRcblxuXG4gICAgaWYgKHVwZGF0ZS5zZWFyY2goL3N0ZWFsLipmaXJzdC8pICE9PSAtMSkge1xuICAgICAgYW5hbHlzaXMuc3RlYWxNZXRhLmJhc2VTdG9sZW4gPSAwO1xuICAgIH0gZWxzZSBpZiAodXBkYXRlLnNlYXJjaCgvc3RlYWwuKnNlY29uZC8pICE9PSAtMSkge1xuICAgICAgYW5hbHlzaXMuc3RlYWxNZXRhLmJhc2VTdG9sZW4gPSAxO1xuICAgIH0gZWxzZSBpZiAodXBkYXRlLnNlYXJjaCgvc3RlYWwuKnRoaXJkLykgIT09IC0xKSB7XG4gICAgICBhbmFseXNpcy5zdGVhbE1ldGEuYmFzZVN0b2xlbiA9IDI7XG4gICAgfSBlbHNlIGlmICh1cGRhdGUuc2VhcmNoKC9zdGVhbC4qZm91cnRoLykgIT09IC0xKSB7XG4gICAgICBhbmFseXNpcy5zdGVhbE1ldGEuYmFzZVN0b2xlbiA9IDM7IC8vIHRoaXMgbWF5IGhhdmUgYmVlbiBhIHJ1biBpZiB0aGVyZSBhcmUgNCBiYXNlcyBpbiBwbGF5XG5cbiAgICAgIGlmICghKGV2ZW50RGF0YSAhPT0gbnVsbCAmJiBldmVudERhdGEgIT09IHZvaWQgMCAmJiBldmVudERhdGEuc2NvcmVVcGRhdGUpICYmIGFuYWx5c2lzLnN0ZWFsTWV0YS5zdWNjZXNzICYmIChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuaG9tZUJhdHRlcikgIT09IG51bGwgJiYgKGV2ZW50RGF0YSA9PT0gbnVsbCB8fCBldmVudERhdGEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGV2ZW50RGF0YS5hd2F5QmFzZXMpID09PSA0KSB7XG4gICAgICAgIGFuYWx5c2lzLnJ1bnNTY29yZWQgPSAxO1xuICAgICAgfSBlbHNlIGlmICghKGV2ZW50RGF0YSAhPT0gbnVsbCAmJiBldmVudERhdGEgIT09IHZvaWQgMCAmJiBldmVudERhdGEuc2NvcmVVcGRhdGUpICYmIGFuYWx5c2lzLnN0ZWFsTWV0YS5zdWNjZXNzICYmIChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuYXdheUJhdHRlcikgIT09IG51bGwgJiYgKGV2ZW50RGF0YSA9PT0gbnVsbCB8fCBldmVudERhdGEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IGV2ZW50RGF0YS5ob21lQmFzZXMpID09PSA0KSB7XG4gICAgICAgIGFuYWx5c2lzLnJ1bnNTY29yZWQgPSAxO1xuICAgICAgfSAvLyBvdGhlcndpc2Ugc2NvcmVzIGFyZSBjYXB0dXJlZCBpbiBzcmMvbWlzYy5qc1xuXG4gICAgfSBlbHNlIGlmICh1cGRhdGUuc2VhcmNoKC9zdGVhbC4qaG9tZS8pICE9PSAtMSkge1xuICAgICAgLy8gc2VlIGlmIGhvbWUgb3IgYXdheSBzdG9sZSB0aGUgYmFzZVxuICAgICAgaWYgKChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuaG9tZUJhdHRlcikgIT09IG51bGwpIHtcbiAgICAgICAgYW5hbHlzaXMuc3RlYWxNZXRhLmJhc2VTdG9sZW4gPSAoZXZlbnREYXRhID09PSBudWxsIHx8IGV2ZW50RGF0YSA9PT0gdm9pZCAwID8gdm9pZCAwIDogZXZlbnREYXRhLmF3YXlCYXNlcykgLSAxIHx8IDM7XG4gICAgICB9IGVsc2UgaWYgKChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuYXdhQmF0dGVyKSAhPT0gbnVsbCkge1xuICAgICAgICBhbmFseXNpcy5zdGVhbE1ldGEuYmFzZVN0b2xlbiA9IChldmVudERhdGEgPT09IG51bGwgfHwgZXZlbnREYXRhID09PSB2b2lkIDAgPyB2b2lkIDAgOiBldmVudERhdGEuaG9tZUJhc2VzKSAtIDEgfHwgMztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG9sZGVyIGdhbWVzIGRvbid0IGhhdmUgdGhlc2UgZmllbGRzLCBvciBtYXkgaGF2ZSBib3RoXG4gICAgICAgIC8vIGhvbWUgYW5kIGF3YXkgYmF0dGVycyBmaWxsZWQgaW47IGp1c3QgYXNzdW1lZCBob21lIGJhc2VcbiAgICAgICAgLy8gaXMgYmFzZSAjMyBpbiB0aG9zZSBjYXNlcywgaSBndWVzc1xuICAgICAgICBhbmFseXNpcy5zdGVhbE1ldGEuYmFzZVN0b2xlbiA9IDM7XG4gICAgICB9XG5cbiAgICAgIGlmICghKGV2ZW50RGF0YSAhPT0gbnVsbCAmJiBldmVudERhdGEgIT09IHZvaWQgMCAmJiBldmVudERhdGEuc2NvcmVVcGRhdGUpKSB7XG4gICAgICAgIGFuYWx5c2lzLnJ1bnNTY29yZWQgPSAxO1xuICAgICAgfSAvLyBvdGhlcndpc2Ugc2NvcmVzIGFyZSBjYXB0dXJlZCBpbiBzcmMvbWlzYy5qc1xuXG4gICAgfSAvLyBjaGVjayBmb3IgYmxhc2VydW5uaW5nIHNjb3JlcyBwcmUgcy0xMiAob3RoZXJ3aXNlIGNhcHR1cmVkIGluXG4gICAgLy8gc3JjL21pc2MuanMpXG5cblxuICAgIGlmICghKGV2ZW50RGF0YSAhPT0gbnVsbCAmJiBldmVudERhdGEgIT09IHZvaWQgMCAmJiBldmVudERhdGEuc2NvcmVVcGRhdGUpICYmIHVwZGF0ZS5pbmRleE9mKCdibGFzZXJ1bm5pbmcnKSA+PSAwKSB7XG4gICAgICBhbmFseXNpcy5ydW5zU2NvcmVkID0gdXRpbC5nZXROdW1iZXIodXBkYXRlLCAvc2NvcmVzIC8sIC8gd2l0aCBibGFzZXJ1bm5pbmcvKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjaGVjazogY2hlY2tcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBnZXRVcGRhdGVUZXh0ID0gZnVuY3Rpb24gZ2V0VXBkYXRlVGV4dChldmVudERhdGEpIHtcbiAgdmFyIF9ldmVudERhdGEkbGFzdFVwZGF0ZTtcblxuICByZXR1cm4gKGV2ZW50RGF0YSA9PT0gbnVsbCB8fCBldmVudERhdGEgPT09IHZvaWQgMCA/IHZvaWQgMCA6IChfZXZlbnREYXRhJGxhc3RVcGRhdGUgPSBldmVudERhdGEubGFzdFVwZGF0ZSkgPT09IG51bGwgfHwgX2V2ZW50RGF0YSRsYXN0VXBkYXRlID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfZXZlbnREYXRhJGxhc3RVcGRhdGUudG9Mb3dlckNhc2UoKSkgfHwgJyc7XG59O1xuLypcbiAqIHdpbGwgbG9vayB0aHJvdWdoIHMgZm9yIGEgbnVtYmVyIChzdXBwb3J0cyBwb3NpdGl2ZSBpbnRlZ2VycyAmIGZsb2F0cyksXG4gKiBwcmUgaXMgcmVnZXggdG8gcHJlcGVuZCB0byB0aGUgcmVnZXggZm9yIG51bWJlcnNcbiAqIHBvc3QgaXMgcmVnZXggdG8gYXBwZW5kIHRvIHRoZSByZWdleCBmb3IgbnVtYmVyc1xuICogd2lsbCByZXR1cm4gYSBudW1iZXIgb3IgbnVsbFxuICovXG5cblxudmFyIGdldE51bWJlciA9IGZ1bmN0aW9uIGdldE51bWJlcihzLCBwcmUsIHBvc3QpIHtcbiAgdmFyIG51bSA9IG51bGw7XG4gIHZhciBudW1SZWdleCA9IC8oKFxcZCspPyhcXC5cXGQrKT8pLztcblxuICBpZiAoIXByZSkge1xuICAgIHByZSA9IG5ldyBSZWdFeHAoJycpO1xuICB9XG5cbiAgaWYgKCFwb3N0KSB7XG4gICAgcG9zdCA9IG5ldyBSZWdFeHAoJycpO1xuICB9XG5cbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChwcmUuc291cmNlICsgbnVtUmVnZXguc291cmNlICsgcG9zdC5zb3VyY2UpO1xuICB2YXIgbWF0Y2hlcyA9IHJlZ2V4W1N5bWJvbC5tYXRjaF0ocyk7XG5cbiAgaWYgKG1hdGNoZXMgJiYgbWF0Y2hlc1sxXSkge1xuICAgIG51bSA9IE51bWJlcihtYXRjaGVzWzFdKSB8fCBudW07XG4gIH1cblxuICByZXR1cm4gbnVtO1xufTtcbi8qXG4gKiB3aWxsIGxvb2sgdGhyb3VnaCBzIGZvciBhIG1hdGNoIGJldHdlZW4gcHJlIGFuZCBwb3N0XG4gKiBwcmUgaXMgcmVnZXggdG8gcHJlcGVuZCB0byB0aGUgbWF0Y2hcbiAqIHBvc3QgaXMgcmVnZXggdG8gYXBwZW5kIHRvIHRoZSBtYXRjaFxuICogd2lsbCByZXR1cm4gdGhlIG1hdGNoLCBvciBhbiBlbXB0eSBzdHJpbmdcbiAqL1xuXG5cbnZhciBnZXRNYXRjaCA9IGZ1bmN0aW9uIGdldE1hdGNoKHMsIHByZSwgcG9zdCkge1xuICB2YXIgbWF0Y2hSZWdleCA9IC8oLiopLztcblxuICBpZiAoIXByZSkge1xuICAgIHByZSA9IG5ldyBSZWdFeHAoJycpO1xuICB9XG5cbiAgaWYgKCFwb3N0KSB7XG4gICAgcG9zdCA9IG5ldyBSZWdFeHAoJycpO1xuICB9XG5cbiAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChwcmUuc291cmNlICsgbWF0Y2hSZWdleC5zb3VyY2UgKyBwb3N0LnNvdXJjZSk7XG4gIHZhciBtYXRjaGVzID0gcmVnZXhbU3ltYm9sLm1hdGNoXShzKTtcblxuICBpZiAobWF0Y2hlcyAmJiBtYXRjaGVzWzFdKSB7XG4gICAgcmV0dXJuIG1hdGNoZXNbMV07XG4gIH1cblxuICByZXR1cm4gJyc7XG59O1xuLypcbiAqIHdpbGwgbG9vayB0aHJvdWdoIHMgZm9yIGEgdGVhbSBuYW1lXG4gKiBwcmUgaXMgcmVnZXggdG8gcHJlcGVuZCB0byB0aGUgcmVnZXggZm9yIHRoZSB0ZWFtIG5hbWVcbiAqIHBvc3QgaXMgcmVnZXggdG8gYXBwZW5kIHRvIHRoZSByZWdleCB0aGUgdGVhbSBuYW1lXG4gKiB3aWxsIHJldHVybiAnaG9tZScgJ2F3YXknIG9yICcnXG4gKi9cblxuXG52YXIgZ2V0VGVhbSA9IGZ1bmN0aW9uIGdldFRlYW0oZXZlbnREYXRhLCBzLCBwcmUsIHBvc3QpIHtcbiAgdmFyIHRlYW0gPSBnZXRNYXRjaChzLCBwcmUsIHBvc3QpO1xuXG4gIGlmICh0ZWFtKSB7XG4gICAgdGVhbSA9IGV2ZW50RGF0YS5ob21lVGVhbU5pY2tuYW1lLnRvTG93ZXJDYXNlKCkgPT09IHRlYW0gPyAnaG9tZScgOiAnYXdheSc7XG4gIH1cblxuICByZXR1cm4gdGVhbTtcbn07XG5cbnZhciB0aXRsZUNhc2UgPSBmdW5jdGlvbiB0aXRsZUNhc2Uocykge1xuICBpZiAoIXMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICA7XG4gIHJldHVybiBzLnNwbGl0KCcgJykubWFwKGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgaWYgKHdvcmQpIHtcbiAgICAgIHJldHVybiBcIlwiLmNvbmNhdCh3b3JkWzBdLnRvVXBwZXJDYXNlKCkpLmNvbmNhdCh3b3JkLnNsaWNlKDEpKTtcbiAgICB9XG4gIH0pLmpvaW4oJyAnKTtcbn07XG4vKlxuICogd2lsbCBsb29rIHRocm91Z2ggcyBmb3IgYSBwbGF5ZXIgbmFtZVxuICogcHJlIGlzIHJlZ2V4IHRvIHByZXBlbmQgdG8gdGhlIHJlZ2V4IGZvciB0aGUgdGVhbSBuYW1lXG4gKiBwb3N0IGlzIHJlZ2V4IHRvIGFwcGVuZCB0byB0aGUgcmVnZXggdGhlIHRlYW0gbmFtZVxuICogd2lsbCByZXR1cm4gdGhlIHBsYXllciBuYW1lIG9yICcnXG4gKi9cblxuXG52YXIgZ2V0UGxheWVyID0gZnVuY3Rpb24gZ2V0UGxheWVyKHMsIHByZSwgcG9zdCkge1xuICB2YXIgcGxheWVyID0gZ2V0TWF0Y2gocywgcHJlLCBwb3N0KTtcbiAgcmV0dXJuIHRpdGxlQ2FzZShwbGF5ZXIpO1xufTtcblxudmFyIGdldFNrYXRlVHJpY2tzID0gZnVuY3Rpb24gZ2V0U2thdGVUcmlja3ModXBkYXRlKSB7XG4gIHZhciBncmluZFRyaWNrLCBncmluZFNjb3JlLCBsYW5kVHJpY2ssIGxhbmRTY29yZTtcbiAgdmFyIHRyaWNrcyA9IHVwZGF0ZS5tYXRjaCgvIGEgKC4qKSBcXCgoXFxkKykvZyk7IC8vIGdyaW5kIHRyaWNrXG5cbiAgaWYgKHRyaWNrc1swXSkge1xuICAgIGdyaW5kVHJpY2sgPSB0aXRsZUNhc2UoZ2V0TWF0Y2godHJpY2tzWzBdLCAvYSAvLCAvIFxcKC8pKTtcbiAgICBncmluZFNjb3JlID0gZ2V0TnVtYmVyKHRyaWNrc1swXSwgL1xcKC8sIC8kLyk7XG4gIH0gLy8gbGFuZCB0cmlja1xuXG5cbiAgaWYgKHRyaWNrc1sxXSkge1xuICAgIGxhbmRUcmljayA9IHRpdGxlQ2FzZShnZXRNYXRjaCh0cmlja3NbMV0sIC9hIC8sIC8gXFwoLykpO1xuICAgIGxhbmRTY29yZSA9IGdldE51bWJlcih0cmlja3NbMV0sIC9cXCgvLCAvJC8pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBncmluZFRyaWNrOiBncmluZFRyaWNrLFxuICAgIGdyaW5kU2NvcmU6IGdyaW5kU2NvcmUsXG4gICAgbGFuZFRyaWNrOiBsYW5kVHJpY2ssXG4gICAgbGFuZFNjb3JlOiBsYW5kU2NvcmVcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRVcGRhdGVUZXh0OiBnZXRVcGRhdGVUZXh0LFxuICBnZXROdW1iZXI6IGdldE51bWJlcixcbiAgZ2V0VGVhbTogZ2V0VGVhbSxcbiAgZ2V0UGxheWVyOiBnZXRQbGF5ZXIsXG4gIGdldFNrYXRlVHJpY2tzOiBnZXRTa2F0ZVRyaWNrc1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIGNoZWNrID0gZnVuY3Rpb24gY2hlY2soYW5hbHlzaXMsIGV2ZW50RGF0YSkge1xuICB2YXIgdXBkYXRlID0gdXRpbC5nZXRVcGRhdGVUZXh0KGV2ZW50RGF0YSk7XG5cbiAgaWYgKHVwZGF0ZS5pbmRleE9mKCdkcmF3cyBhIHdhbGsnKSA+PSAwKSB7XG4gICAgYW5hbHlzaXMud2FsayA9IHRydWU7IC8vIGNoZWNrIGlmIGFueSBydW5zIHdlcmUgc2NvcmVkIG9uIHRoZSBwbGF5IHByaW9yIHRvIHMxMlxuXG4gICAgaWYgKCEoZXZlbnREYXRhICE9PSBudWxsICYmIGV2ZW50RGF0YSAhPT0gdm9pZCAwICYmIGV2ZW50RGF0YS5zY29yZVVwZGF0ZSkgJiYgdXBkYXRlLmluZGV4T2YoJ3Njb3JlcycpID49IDApIHtcbiAgICAgIGFuYWx5c2lzLnJ1bnNTY29yZWQgPSAxO1xuICAgIH0gLy8gb3RoZXJ3aXNlIHNjb3JlcyBjYXB0dXJlZCBpbiBzcmMvbWlzYy5qc1xuICAgIC8vIGNoZWNrIGZvciBtaW5kIHRyaWNrIHNoZW5hbmlnYW5zXG5cblxuICAgIGlmICh1cGRhdGUuaW5kZXhPZigndXNlcyBhIG1pbmQgdHJpY2snKSkge1xuICAgICAgYW5hbHlzaXMud2Fsa01ldGEubWluZFRyaWNrID0gdHJ1ZTtcblxuICAgICAgaWYgKHVwZGF0ZS5pbmRleE9mKCdzdHJpa2VzIG91dCcpKSB7XG4gICAgICAgIGFuYWx5c2lzLm91dCA9IHRydWU7XG4gICAgICAgIGFuYWx5c2lzLm91dE1ldGEua2luZCA9ICdzdHJpa2UnO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNoZWNrOiBjaGVja1xufTsiLCIvKipcbiAqIEBhdXRob3IgS2F0ZVxuICovXG5cbnZhciB0cmFjZXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJhbmRvbSA9IE1hdGgucmFuZG9tO1xuXG4gICAgZnVuY3Rpb24gc2V0UmFuZG9tKG5ld1JhbmRvbSkge1xuICAgICAgICByYW5kb20gPSBuZXdSYW5kb207XG4gICAgfVxuXG4gICAgdmFyIFRyYWNlcnlOb2RlID0gZnVuY3Rpb24ocGFyZW50LCBjaGlsZEluZGV4LCBzZXR0aW5ncykge1xuICAgICAgICB0aGlzLmVycm9ycyA9IFtdO1xuXG4gICAgICAgIC8vIE5vIGlucHV0PyBBZGQgYW4gZXJyb3IsIGJ1dCBjb250aW51ZSBhbnl3YXlzXG4gICAgICAgIGlmIChzZXR0aW5ncy5yYXcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5lcnJvcnMucHVzaChcIkVtcHR5IGlucHV0IGZvciBub2RlXCIpO1xuICAgICAgICAgICAgc2V0dGluZ3MucmF3ID0gXCJcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSByb290IG5vZGUgb2YgYW4gZXhwYW5zaW9uLCBpdCB3aWxsIGhhdmUgdGhlIGdyYW1tYXIgcGFzc2VkIGFzIHRoZSAncGFyZW50J1xuICAgICAgICAvLyAgc2V0IHRoZSBncmFtbWFyIGZyb20gdGhlICdwYXJlbnQnLCBhbmQgc2V0IGFsbCBvdGhlciB2YWx1ZXMgZm9yIGEgcm9vdCBub2RlXG4gICAgICAgIGlmICggcGFyZW50IGluc3RhbmNlb2YgdHJhY2VyeS5HcmFtbWFyKSB7XG4gICAgICAgICAgICB0aGlzLmdyYW1tYXIgPSBwYXJlbnQ7XG4gICAgICAgICAgICB0aGlzLnBhcmVudCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRlcHRoID0gMDtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRJbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmdyYW1tYXIgPSBwYXJlbnQuZ3JhbW1hcjtcbiAgICAgICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICAgICAgdGhpcy5kZXB0aCA9IHBhcmVudC5kZXB0aCArIDE7XG4gICAgICAgICAgICB0aGlzLmNoaWxkSW5kZXggPSBjaGlsZEluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yYXcgPSBzZXR0aW5ncy5yYXc7XG4gICAgICAgIHRoaXMudHlwZSA9IHNldHRpbmdzLnR5cGU7XG4gICAgICAgIHRoaXMuaXNFeHBhbmRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmICghdGhpcy5ncmFtbWFyKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBncmFtbWFyIHNwZWNpZmllZCBmb3IgdGhpcyBub2RlXCIsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgVHJhY2VyeU5vZGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBcIk5vZGUoJ1wiICsgdGhpcy5yYXcgKyBcIicgXCIgKyB0aGlzLnR5cGUgKyBcIiBkOlwiICsgdGhpcy5kZXB0aCArIFwiKVwiO1xuICAgIH07XG5cbiAgICAvLyBFeHBhbmQgdGhlIG5vZGUgKHdpdGggdGhlIGdpdmVuIGNoaWxkIHJ1bGUpXG4gICAgLy8gIE1ha2UgY2hpbGRyZW4gaWYgdGhlIG5vZGUgaGFzIGFueVxuICAgIFRyYWNlcnlOb2RlLnByb3RvdHlwZS5leHBhbmRDaGlsZHJlbiA9IGZ1bmN0aW9uKGNoaWxkUnVsZSwgcHJldmVudFJlY3Vyc2lvbikge1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuZmluaXNoZWRUZXh0ID0gXCJcIjtcblxuICAgICAgICAvLyBTZXQgdGhlIHJ1bGUgZm9yIG1ha2luZyBjaGlsZHJlbixcbiAgICAgICAgLy8gYW5kIGV4cGFuZCBpdCBpbnRvIHNlY3Rpb25cbiAgICAgICAgdGhpcy5jaGlsZFJ1bGUgPSBjaGlsZFJ1bGU7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkUnVsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgc2VjdGlvbnMgPSB0cmFjZXJ5LnBhcnNlKGNoaWxkUnVsZSk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBlcnJvcnMgdG8gdGhpc1xuICAgICAgICAgICAgaWYgKHNlY3Rpb25zLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvcnMgPSB0aGlzLmVycm9ycy5jb25jYXQoc2VjdGlvbnMuZXJyb3JzKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGlsZHJlbltpXSA9IG5ldyBUcmFjZXJ5Tm9kZSh0aGlzLCBpLCBzZWN0aW9uc1tpXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmV2ZW50UmVjdXJzaW9uKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoaWxkcmVuW2ldLmV4cGFuZChwcmV2ZW50UmVjdXJzaW9uKTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBpbiB0aGUgZmluaXNoZWQgdGV4dFxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWRUZXh0ICs9IHRoaXMuY2hpbGRyZW5baV0uZmluaXNoZWRUZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW4gbm9ybWFsIG9wZXJhdGlvbiwgdGhpcyBzaG91bGRuJ3QgZXZlciBoYXBwZW5cbiAgICAgICAgICAgIHRoaXMuZXJyb3JzLnB1c2goXCJObyBjaGlsZCBydWxlIHByb3ZpZGVkLCBjYW4ndCBleHBhbmQgY2hpbGRyZW5cIik7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBjaGlsZCBydWxlIHByb3ZpZGVkLCBjYW4ndCBleHBhbmQgY2hpbGRyZW5cIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gRXhwYW5kIHRoaXMgcnVsZSAocG9zc2libHkgY3JlYXRpbmcgY2hpbGRyZW4pXG4gICAgVHJhY2VyeU5vZGUucHJvdG90eXBlLmV4cGFuZCA9IGZ1bmN0aW9uKHByZXZlbnRSZWN1cnNpb24pIHtcblxuICAgICAgICBpZiAoIXRoaXMuaXNFeHBhbmRlZCkge1xuICAgICAgICAgICAgdGhpcy5pc0V4cGFuZGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgdGhpcy5leHBhbnNpb25FcnJvcnMgPSBbXTtcblxuICAgICAgICAgICAgLy8gVHlwZXMgb2Ygbm9kZXNcbiAgICAgICAgICAgIC8vIC0xOiByYXcsIG5lZWRzIHBhcnNpbmdcbiAgICAgICAgICAgIC8vICAwOiBQbGFpbnRleHRcbiAgICAgICAgICAgIC8vICAxOiBUYWcgKFwiI3N5bWJvbC5tb2QubW9kMi5tb2QzI1wiIG9yIFwiI1twdXNoVGFyZ2V0OnB1c2hSdWxlXXN5bWJvbC5tb2RcIilcbiAgICAgICAgICAgIC8vICAyOiBBY3Rpb24gKFwiW3B1c2hUYXJnZXQ6cHVzaFJ1bGVdLCBbcHVzaFRhcmdldDpQT1BdXCIsIG1vcmUgaW4gdGhlIGZ1dHVyZSlcblxuICAgICAgICAgICAgc3dpdGNoKHRoaXMudHlwZSkge1xuICAgICAgICAgICAgLy8gUmF3IHJ1bGVcbiAgICAgICAgICAgIGNhc2UgLTE6XG5cbiAgICAgICAgICAgICAgICB0aGlzLmV4cGFuZENoaWxkcmVuKHRoaXMucmF3LCBwcmV2ZW50UmVjdXJzaW9uKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gcGxhaW50ZXh0LCBkbyBub3RoaW5nIGJ1dCBjb3B5IHRleHQgaW50byBmaW5zaWhlZCB0ZXh0XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZFRleHQgPSB0aGlzLnJhdztcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gVGFnXG4gICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgdG8gZmluZCBhbnkgYWN0aW9ucywgYW5kIGZpZ3VyZSBvdXQgd2hhdCB0aGUgc3ltYm9sIGlzXG4gICAgICAgICAgICAgICAgdGhpcy5wcmVhY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5wb3N0YWN0aW9ucyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhcnNlZCA9IHRyYWNlcnkucGFyc2VUYWcodGhpcy5yYXcpO1xuXG4gICAgICAgICAgICAgICAgLy8gQnJlYWsgaW50byBzeW1ib2wgYWN0aW9ucyBhbmQgbW9kaWZpZXJzXG4gICAgICAgICAgICAgICAgdGhpcy5zeW1ib2wgPSBwYXJzZWQuc3ltYm9sO1xuICAgICAgICAgICAgICAgIHRoaXMubW9kaWZpZXJzID0gcGFyc2VkLm1vZGlmaWVycztcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhbGwgdGhlIHByZWFjdGlvbnMgZnJvbSB0aGUgcmF3IHN5bnRheFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyc2VkLnByZWFjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmVhY3Rpb25zW2ldID0gbmV3IE5vZGVBY3Rpb24odGhpcywgcGFyc2VkLnByZWFjdGlvbnNbaV0ucmF3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJzZWQucG9zdGFjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICB0aGlzLnBvc3RhY3Rpb25zW2ldID0gbmV3IE5vZGVBY3Rpb24odGhpcywgcGFyc2VkLnBvc3RhY3Rpb25zW2ldLnJhdyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTWFrZSB1bmRvIGFjdGlvbnMgZm9yIGFsbCBwcmVhY3Rpb25zIChwb3BzIGZvciBlYWNoIHB1c2gpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnByZWFjdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucHJlYWN0aW9uc1tpXS50eXBlID09PSAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3N0YWN0aW9ucy5wdXNoKHRoaXMucHJlYWN0aW9uc1tpXS5jcmVhdGVVbmRvKCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGFsbCB0aGUgcHJlYWN0aW9uc1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wcmVhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJlYWN0aW9uc1tpXS5hY3RpdmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWRUZXh0ID0gdGhpcy5yYXc7XG5cbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgKHBhc3NpbmcgdGhlIG5vZGUsIHRoaXMgYWxsb3dzIHRyYWNraW5nIG9mIHJlY3Vyc2lvbiBkZXB0aClcblxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZFJ1bGUgPSB0aGlzLmdyYW1tYXIuc2VsZWN0UnVsZSh0aGlzLnN5bWJvbCwgdGhpcywgdGhpcy5lcnJvcnMpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5leHBhbmRDaGlsZHJlbihzZWxlY3RlZFJ1bGUsIHByZXZlbnRSZWN1cnNpb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgbW9kaWZpZXJzXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogVXBkYXRlIHBhcnNlIGZ1bmN0aW9uIHRvIG5vdCB0cmlnZ2VyIG9uIGhhc2h0YWdzIHdpdGhpbiBwYXJlbnRoZXNpcyB3aXRoaW4gdGFncyxcbiAgICAgICAgICAgICAgICAvLyAgIHNvIHRoYXQgbW9kaWZpZXIgcGFyYW1ldGVycyBjYW4gY29udGFpbiB0YWdzIFwiI3N0b3J5LnJlcGxhY2UoI3Byb3RhZ29uaXN0IywgI25ld0NoYXJhY3RlciMpI1wiXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1vZGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW9kTmFtZSA9IHRoaXMubW9kaWZpZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW9kUGFyYW1zID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2ROYW1lLmluZGV4T2YoXCIoXCIpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ0V4cCA9IC9cXCgoW14pXSspXFwpLztcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVG9kbzogaWdub3JlIGFueSBlc2NhcGVkIGNvbW1hcy4gIEZvciBub3csIGNvbW1hcyBhbHdheXMgc3BsaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gcmVnRXhwLmV4ZWModGhpcy5tb2RpZmllcnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRzIHx8IHJlc3VsdHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbW9kUGFyYW1zID0gcmVzdWx0c1sxXS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kTmFtZSA9IHRoaXMubW9kaWZpZXJzW2ldLnN1YnN0cmluZygwLCBtb2ROYW1lLmluZGV4T2YoXCIoXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1vZCA9IHRoaXMuZ3JhbW1hci5tb2RpZmllcnNbbW9kTmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWlzc2luZyBtb2RpZmllcj9cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtb2QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JzLnB1c2goXCJNaXNzaW5nIG1vZGlmaWVyIFwiICsgbW9kTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaGVkVGV4dCArPSBcIigoLlwiICsgbW9kTmFtZSArIFwiKSlcIjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWRUZXh0ID0gbW9kKHRoaXMuZmluaXNoZWRUZXh0LCBtb2RQYXJhbXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFBlcmZvcm0gcG9zdC1hY3Rpb25zXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBvc3RhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zdGFjdGlvbnNbaV0uYWN0aXZhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG5cbiAgICAgICAgICAgICAgICAvLyBKdXN0IGEgYmFyZSBhY3Rpb24/ICBFeHBhbmQgaXQhXG4gICAgICAgICAgICAgICAgdGhpcy5hY3Rpb24gPSBuZXcgTm9kZUFjdGlvbih0aGlzLCB0aGlzLnJhdyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hY3Rpb24uYWN0aXZhdGUoKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vIHZpc2libGUgdGV4dCBmb3IgYW4gYWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogc29tZSB2aXNpYmxlIHRleHQgZm9yIGlmIHRoZXJlIGlzIGEgZmFpbHVyZSB0byBwZXJmb3JtIHRoZSBhY3Rpb24/XG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZFRleHQgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS53YXJuKFwiQWxyZWFkeSBleHBhbmRlZCBcIiArIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgVHJhY2VyeU5vZGUucHJvdG90eXBlLmNsZWFyRXNjYXBlQ2hhcnMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB0aGlzLmZpbmlzaGVkVGV4dCA9IHRoaXMuZmluaXNoZWRUZXh0LnJlcGxhY2UoL1xcXFxcXFxcL2csIFwiRE9VQkxFQkFDS1NMQVNIXCIpLnJlcGxhY2UoL1xcXFwvZywgXCJcIikucmVwbGFjZSgvRE9VQkxFQkFDS1NMQVNIL2csIFwiXFxcXFwiKTtcbiAgICB9O1xuXG4gICAgLy8gQW4gYWN0aW9uIHRoYXQgb2NjdXJzIHdoZW4gYSBub2RlIGlzIGV4cGFuZGVkXG4gICAgLy8gVHlwZXMgb2YgYWN0aW9uczpcbiAgICAvLyAwIFB1c2g6IFtrZXk6cnVsZV1cbiAgICAvLyAxIFBvcDogW2tleTpQT1BdXG4gICAgLy8gMiBmdW5jdGlvbjogW2Z1bmN0aW9uTmFtZShwYXJhbTAscGFyYW0xKV0gKFRPRE8hKVxuICAgIGZ1bmN0aW9uIE5vZGVBY3Rpb24obm9kZSwgcmF3KSB7XG4gICAgICAgIC8qXG4gICAgICAgICBpZiAoIW5vZGUpXG4gICAgICAgICBjb25zb2xlLndhcm4oXCJObyBub2RlIGZvciBOb2RlQWN0aW9uXCIpO1xuICAgICAgICAgaWYgKCFyYXcpXG4gICAgICAgICBjb25zb2xlLndhcm4oXCJObyByYXcgY29tbWFuZHMgZm9yIE5vZGVBY3Rpb25cIik7XG4gICAgICAgICAqL1xuXG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XG5cbiAgICAgICAgdmFyIHNlY3Rpb25zID0gcmF3LnNwbGl0KFwiOlwiKTtcbiAgICAgICAgdGhpcy50YXJnZXQgPSBzZWN0aW9uc1swXTtcblxuICAgICAgICAvLyBObyBjb2xvbj8gQSBmdW5jdGlvbiFcbiAgICAgICAgaWYgKHNlY3Rpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgdGhpcy50eXBlID0gMjtcblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29sb24/IEl0J3MgZWl0aGVyIGEgcHVzaCBvciBhIHBvcFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucnVsZSA9IHNlY3Rpb25zWzFdO1xuICAgICAgICAgICAgaWYgKHRoaXMucnVsZSA9PT0gXCJQT1BcIikge1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIE5vZGVBY3Rpb24ucHJvdG90eXBlLmNyZWF0ZVVuZG8gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMudHlwZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBOb2RlQWN0aW9uKHRoaXMubm9kZSwgdGhpcy50YXJnZXQgKyBcIjpQT1BcIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyBOb3Qgc3VyZSBob3cgdG8gbWFrZSBVbmRvIGFjdGlvbnMgZm9yIGZ1bmN0aW9ucyBvciBQT1BzXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICBOb2RlQWN0aW9uLnByb3RvdHlwZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZ3JhbW1hciA9IHRoaXMubm9kZS5ncmFtbWFyO1xuICAgICAgICBzd2l0Y2godGhpcy50eXBlKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIC8vIHNwbGl0IGludG8gc2VjdGlvbnMgKHRoZSB3YXkgdG8gZGVub3RlIGFuIGFycmF5IG9mIHJ1bGVzKVxuICAgICAgICAgICAgdGhpcy5ydWxlU2VjdGlvbnMgPSB0aGlzLnJ1bGUuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgdGhpcy5maW5pc2hlZFJ1bGVzID0gW107XG4gICAgICAgICAgICB0aGlzLnJ1bGVOb2RlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnJ1bGVTZWN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBuID0gbmV3IFRyYWNlcnlOb2RlKGdyYW1tYXIsIDAsIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6IC0xLFxuICAgICAgICAgICAgICAgICAgICByYXcgOiB0aGlzLnJ1bGVTZWN0aW9uc1tpXVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgbi5leHBhbmQoKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWRSdWxlcy5wdXNoKG4uZmluaXNoZWRUZXh0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVE9ETzogZXNjYXBlIGNvbW1hcyBwcm9wZXJseVxuICAgICAgICAgICAgZ3JhbW1hci5wdXNoUnVsZXModGhpcy50YXJnZXQsIHRoaXMuZmluaXNoZWRSdWxlcywgdGhpcyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgZ3JhbW1hci5wb3BSdWxlcyh0aGlzLnRhcmdldCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgZ3JhbW1hci5mbGF0dGVuKHRoaXMudGFyZ2V0LCB0cnVlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgTm9kZUFjdGlvbi5wcm90b3R5cGUudG9UZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHN3aXRjaCh0aGlzLnR5cGUpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGFyZ2V0ICsgXCI6XCIgKyB0aGlzLnJ1bGU7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRhcmdldCArIFwiOlBPUFwiO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICByZXR1cm4gXCIoKHNvbWUgZnVuY3Rpb24pKVwiO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIFwiKChVbmtub3duIEFjdGlvbikpXCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gU2V0cyBvZiBydWxlc1xuICAgIC8vIENhbiBhbHNvIGNvbnRhaW4gY29uZGl0aW9uYWwgb3IgZmFsbGJhY2sgc2V0cyBvZiBydWxlc2V0cylcbiAgICBmdW5jdGlvbiBSdWxlU2V0KGdyYW1tYXIsIHJhdykge1xuICAgICAgICB0aGlzLnJhdyA9IHJhdztcbiAgICAgICAgdGhpcy5ncmFtbWFyID0gZ3JhbW1hcjtcbiAgICAgICAgdGhpcy5mYWxsb2ZmID0gMTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyYXcpKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSdWxlcyA9IHJhdztcbiAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIHJhdyA9PT0gJ3N0cmluZycgfHwgcmF3IGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmRlZmF1bHRSdWxlcyA9IFtyYXddO1xuICAgICAgICB9IGVsc2UgaWYgKHJhdyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgZm9yIGNvbmRpdGlvbmFsIGFuZCBoaWVyYXJjaGljYWwgcnVsZSBzZXRzXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBSdWxlU2V0LnByb3RvdHlwZS5zZWxlY3RSdWxlID0gZnVuY3Rpb24oZXJyb3JzKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiR2V0IHJ1bGVcIiwgdGhpcy5yYXcpO1xuICAgICAgICAvLyBJcyB0aGVyZSBhIGNvbmRpdGlvbmFsP1xuICAgICAgICBpZiAodGhpcy5jb25kaXRpb25hbFJ1bGUpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMuZ3JhbW1hci5leHBhbmQodGhpcy5jb25kaXRpb25hbFJ1bGUsIHRydWUpO1xuICAgICAgICAgICAgLy8gZG9lcyB0aGlzIHZhbHVlIG1hdGNoIGFueSBvZiB0aGUgY29uZGl0aW9uYWxzP1xuICAgICAgICAgICAgaWYgKHRoaXMuY29uZGl0aW9uYWxWYWx1ZXNbdmFsdWVdKSB7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSB0aGlzLmNvbmRpdGlvbmFsVmFsdWVzW3ZhbHVlXS5zZWxlY3RSdWxlKGVycm9ycyk7XG4gICAgICAgICAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgdiAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5vIHJldHVybmVkIHZhbHVlP1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSXMgdGhlcmUgYSByYW5rZWQgb3JkZXI/XG4gICAgICAgIGlmICh0aGlzLnJhbmtpbmcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5yYW5raW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSB0aGlzLnJhbmtpbmcuc2VsZWN0UnVsZSgpO1xuICAgICAgICAgICAgICAgIGlmICh2ICE9PSBudWxsICYmIHYgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0aWxsIG5vIHJldHVybmVkIHZhbHVlP1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFJ1bGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICAvLyBTZWxlY3QgZnJvbSB0aGlzIGJhc2ljIGFycmF5IG9mIHJ1bGVzXG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgZGlzdHJpYnV0aW9uIGZyb20gdGhlIGdyYW1tYXIgaWYgdGhlcmUgaXMgbm8gb3RoZXJcbiAgICAgICAgICAgIHZhciBkaXN0cmlidXRpb24gPSB0aGlzLmRpc3RyaWJ1dGlvbjtcbiAgICAgICAgICAgIGlmICghZGlzdHJpYnV0aW9uKVxuICAgICAgICAgICAgICAgIGRpc3RyaWJ1dGlvbiA9IHRoaXMuZ3JhbW1hci5kaXN0cmlidXRpb247XG5cbiAgICAgICAgICAgIHN3aXRjaChkaXN0cmlidXRpb24pIHtcbiAgICAgICAgICAgIGNhc2UgXCJzaHVmZmxlXCI6XG5cbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYSBzaHVmZmxlIGRlc2tcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2h1ZmZsZWREZWNrIHx8IHRoaXMuc2h1ZmZsZWREZWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2h1ZmZsZWREZWNrID0gZnlzaHVmZmxlKEFycmF5LmFwcGx5KG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aCA6IHRoaXMuZGVmYXVsdFJ1bGVzLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICB9KS5tYXAoTnVtYmVyLmNhbGwsIE51bWJlciksIHRoaXMuZmFsbG9mZik7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMuc2h1ZmZsZWREZWNrLnBvcCgpO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwid2VpZ2h0ZWRcIjpcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChcIldlaWdodGVkIGRpc3RyaWJ1dGlvbiBub3QgeWV0IGltcGxlbWVudGVkXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImZhbGxvZmZcIjpcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChcIkZhbGxvZmYgZGlzdHJpYnV0aW9uIG5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuXG4gICAgICAgICAgICAgICAgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucG93KHJhbmRvbSgpLCB0aGlzLmZhbGxvZmYpICogdGhpcy5kZWZhdWx0UnVsZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCF0aGlzLmRlZmF1bHRVc2VzKVxuICAgICAgICAgICAgICAgIHRoaXMuZGVmYXVsdFVzZXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFVzZXNbaW5kZXhdID0gKyt0aGlzLmRlZmF1bHRVc2VzW2luZGV4XSB8fCAxO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVmYXVsdFJ1bGVzW2luZGV4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVycm9ycy5wdXNoKFwiTm8gZGVmYXVsdCBydWxlcyBkZWZpbmVkIGZvciBcIiArIHRoaXMpO1xuICAgICAgICByZXR1cm4gbnVsbDtcblxuICAgIH07XG5cbiAgICBSdWxlU2V0LnByb3RvdHlwZS5jbGVhclN0YXRlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuZGVmYXVsdFVzZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFVzZXMgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBmeXNodWZmbGUoYXJyYXksIGZhbGxvZmYpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgICAgIHRlbXBvcmFyeVZhbHVlLFxuICAgICAgICAgICAgcmFuZG9tSW5kZXg7XG5cbiAgICAgICAgLy8gV2hpbGUgdGhlcmUgcmVtYWluIGVsZW1lbnRzIHRvIHNodWZmbGUuLi5cbiAgICAgICAgd2hpbGUgKDAgIT09IGN1cnJlbnRJbmRleCkge1xuXG4gICAgICAgICAgICAvLyBQaWNrIGEgcmVtYWluaW5nIGVsZW1lbnQuLi5cbiAgICAgICAgICAgIHJhbmRvbUluZGV4ID0gTWF0aC5mbG9vcihyYW5kb20oKSAqIGN1cnJlbnRJbmRleCk7XG4gICAgICAgICAgICBjdXJyZW50SW5kZXggLT0gMTtcblxuICAgICAgICAgICAgLy8gQW5kIHN3YXAgaXQgd2l0aCB0aGUgY3VycmVudCBlbGVtZW50LlxuICAgICAgICAgICAgdGVtcG9yYXJ5VmFsdWUgPSBhcnJheVtjdXJyZW50SW5kZXhdO1xuICAgICAgICAgICAgYXJyYXlbY3VycmVudEluZGV4XSA9IGFycmF5W3JhbmRvbUluZGV4XTtcbiAgICAgICAgICAgIGFycmF5W3JhbmRvbUluZGV4XSA9IHRlbXBvcmFyeVZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cblxuICAgIHZhciBTeW1ib2wgPSBmdW5jdGlvbihncmFtbWFyLCBrZXksIHJhd1J1bGVzKSB7XG4gICAgICAgIC8vIFN5bWJvbHMgY2FuIGJlIG1hZGUgd2l0aCBhIHNpbmdsZSB2YWx1ZSwgYW5kIGFycmF5LCBvciBhcnJheSBvZiBvYmplY3RzIG9mIChjb25kaXRpb25zL3ZhbHVlcylcbiAgICAgICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgICAgIHRoaXMuZ3JhbW1hciA9IGdyYW1tYXI7XG4gICAgICAgIHRoaXMucmF3UnVsZXMgPSByYXdSdWxlcztcblxuICAgICAgICB0aGlzLmJhc2VSdWxlcyA9IG5ldyBSdWxlU2V0KHRoaXMuZ3JhbW1hciwgcmF3UnVsZXMpO1xuICAgICAgICB0aGlzLmNsZWFyU3RhdGUoKTtcblxuICAgIH07XG5cbiAgICBTeW1ib2wucHJvdG90eXBlLmNsZWFyU3RhdGUgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBDbGVhciB0aGUgc3RhY2sgYW5kIGNsZWFyIGFsbCBydWxlc2V0IHVzYWdlc1xuICAgICAgICB0aGlzLnN0YWNrID0gW3RoaXMuYmFzZVJ1bGVzXTtcblxuICAgICAgICB0aGlzLnVzZXMgPSBbXTtcbiAgICAgICAgdGhpcy5iYXNlUnVsZXMuY2xlYXJTdGF0ZSgpO1xuICAgIH07XG5cbiAgICBTeW1ib2wucHJvdG90eXBlLnB1c2hSdWxlcyA9IGZ1bmN0aW9uKHJhd1J1bGVzKSB7XG4gICAgICAgIHZhciBydWxlcyA9IG5ldyBSdWxlU2V0KHRoaXMuZ3JhbW1hciwgcmF3UnVsZXMpO1xuICAgICAgICB0aGlzLnN0YWNrLnB1c2gocnVsZXMpO1xuICAgIH07XG5cbiAgICBTeW1ib2wucHJvdG90eXBlLnBvcFJ1bGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3RhY2sucG9wKCk7XG4gICAgfTtcblxuICAgIFN5bWJvbC5wcm90b3R5cGUuc2VsZWN0UnVsZSA9IGZ1bmN0aW9uKG5vZGUsIGVycm9ycykge1xuICAgICAgICB0aGlzLnVzZXMucHVzaCh7XG4gICAgICAgICAgICBub2RlIDogbm9kZVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKFwiVGhlIHJ1bGUgc3RhY2sgZm9yICdcIiArIHRoaXMua2V5ICsgXCInIGlzIGVtcHR5LCB0b28gbWFueSBwb3BzP1wiKTtcbiAgICAgICAgICAgIHJldHVybiBcIigoXCIgKyB0aGlzLmtleSArIFwiKSlcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnN0YWNrW3RoaXMuc3RhY2subGVuZ3RoIC0gMV0uc2VsZWN0UnVsZSgpO1xuICAgIH07XG5cbiAgICBTeW1ib2wucHJvdG90eXBlLmdldEFjdGl2ZVJ1bGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhY2tbdGhpcy5zdGFjay5sZW5ndGggLSAxXS5zZWxlY3RSdWxlKCk7XG4gICAgfTtcblxuICAgIFN5bWJvbC5wcm90b3R5cGUucnVsZXNUb0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMucmF3UnVsZXMpO1xuICAgIH07XG5cbiAgICB2YXIgR3JhbW1hciA9IGZ1bmN0aW9uKHJhdywgc2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5tb2RpZmllcnMgPSB7fTtcbiAgICAgICAgdGhpcy5sb2FkRnJvbVJhd09iaihyYXcpO1xuICAgIH07XG5cbiAgICBHcmFtbWFyLnByb3RvdHlwZS5jbGVhclN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zeW1ib2xzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnN5bWJvbHNba2V5c1tpXV0uY2xlYXJTdGF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEdyYW1tYXIucHJvdG90eXBlLmFkZE1vZGlmaWVycyA9IGZ1bmN0aW9uKG1vZHMpIHtcblxuICAgICAgICAvLyBjb3B5IG92ZXIgdGhlIGJhc2UgbW9kaWZpZXJzXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBtb2RzKSB7XG4gICAgICAgICAgICBpZiAobW9kcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RpZmllcnNba2V5XSA9IG1vZHNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgIH07XG5cbiAgICBHcmFtbWFyLnByb3RvdHlwZS5sb2FkRnJvbVJhd09iaiA9IGZ1bmN0aW9uKHJhdykge1xuXG4gICAgICAgIHRoaXMucmF3ID0gcmF3O1xuICAgICAgICB0aGlzLnN5bWJvbHMgPSB7fTtcbiAgICAgICAgdGhpcy5zdWJncmFtbWFycyA9IFtdO1xuXG4gICAgICAgIGlmICh0aGlzLnJhdykge1xuICAgICAgICAgICAgLy8gQWRkIGFsbCBydWxlcyB0byB0aGUgZ3JhbW1hclxuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMucmF3KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmF3Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zeW1ib2xzW2tleV0gPSBuZXcgU3ltYm9sKHRoaXMsIGtleSwgdGhpcy5yYXdba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIEdyYW1tYXIucHJvdG90eXBlLmNyZWF0ZVJvb3QgPSBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5vZGUgYW5kIHN1Ym5vZGVzXG4gICAgICAgIHZhciByb290ID0gbmV3IFRyYWNlcnlOb2RlKHRoaXMsIDAsIHtcbiAgICAgICAgICAgIHR5cGUgOiAtMSxcbiAgICAgICAgICAgIHJhdyA6IHJ1bGUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByb290O1xuICAgIH07XG5cbiAgICBHcmFtbWFyLnByb3RvdHlwZS5leHBhbmQgPSBmdW5jdGlvbihydWxlLCBhbGxvd0VzY2FwZUNoYXJzKSB7XG4gICAgICAgIHZhciByb290ID0gdGhpcy5jcmVhdGVSb290KHJ1bGUpO1xuICAgICAgICByb290LmV4cGFuZCgpO1xuICAgICAgICBpZiAoIWFsbG93RXNjYXBlQ2hhcnMpXG4gICAgICAgICAgICByb290LmNsZWFyRXNjYXBlQ2hhcnMoKTtcblxuICAgICAgICByZXR1cm4gcm9vdDtcbiAgICB9O1xuXG4gICAgR3JhbW1hci5wcm90b3R5cGUuZmxhdHRlbiA9IGZ1bmN0aW9uKHJ1bGUsIGFsbG93RXNjYXBlQ2hhcnMpIHtcbiAgICAgICAgdmFyIHJvb3QgPSB0aGlzLmV4cGFuZChydWxlLCBhbGxvd0VzY2FwZUNoYXJzKTtcblxuICAgICAgICByZXR1cm4gcm9vdC5maW5pc2hlZFRleHQ7XG4gICAgfTtcblxuICAgIEdyYW1tYXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc3ltYm9scyk7XG4gICAgICAgIHZhciBzeW1ib2xKU09OID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBzeW1ib2xKU09OLnB1c2goJyBcIicgKyBrZXkgKyAnXCIgOiAnICsgdGhpcy5zeW1ib2xzW2tleV0ucnVsZXNUb0pTT04oKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwie1xcblwiICsgc3ltYm9sSlNPTi5qb2luKFwiLFxcblwiKSArIFwiXFxufVwiO1xuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgb3IgcHVzaCBydWxlc1xuICAgIEdyYW1tYXIucHJvdG90eXBlLnB1c2hSdWxlcyA9IGZ1bmN0aW9uKGtleSwgcmF3UnVsZXMsIHNvdXJjZUFjdGlvbikge1xuXG4gICAgICAgIGlmICh0aGlzLnN5bWJvbHNba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnN5bWJvbHNba2V5XSA9IG5ldyBTeW1ib2wodGhpcywga2V5LCByYXdSdWxlcyk7XG4gICAgICAgICAgICBpZiAoc291cmNlQWN0aW9uKVxuICAgICAgICAgICAgICAgIHRoaXMuc3ltYm9sc1trZXldLmlzRHluYW1pYyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnN5bWJvbHNba2V5XS5wdXNoUnVsZXMocmF3UnVsZXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEdyYW1tYXIucHJvdG90eXBlLnBvcFJ1bGVzID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICghdGhpcy5zeW1ib2xzW2tleV0pXG4gICAgICAgICAgICB0aGlzLmVycm9ycy5wdXNoKFwiQ2FuJ3QgcG9wOiBubyBzeW1ib2wgZm9yIGtleSBcIiArIGtleSk7XG4gICAgICAgIHRoaXMuc3ltYm9sc1trZXldLnBvcFJ1bGVzKCk7XG4gICAgfTtcblxuICAgIEdyYW1tYXIucHJvdG90eXBlLnNlbGVjdFJ1bGUgPSBmdW5jdGlvbihrZXksIG5vZGUsIGVycm9ycykge1xuICAgICAgICBpZiAodGhpcy5zeW1ib2xzW2tleV0pIHtcbiAgICAgICAgICAgIHZhciBydWxlID0gdGhpcy5zeW1ib2xzW2tleV0uc2VsZWN0UnVsZShub2RlLCBlcnJvcnMpO1xuXG4gICAgICAgICAgICByZXR1cm4gcnVsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhaWxvdmVyIHRvIGFsdGVybmF0aXZlIHN1YmdyYW1tYXJzXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zdWJncmFtbWFycy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zdWJncmFtbWFyc1tpXS5zeW1ib2xzW2tleV0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3ViZ3JhbW1hcnNbaV0uc3ltYm9sc1trZXldLnNlbGVjdFJ1bGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vIHN5bWJvbD9cbiAgICAgICAgZXJyb3JzLnB1c2goXCJObyBzeW1ib2wgZm9yICdcIiArIGtleSArIFwiJ1wiKTtcbiAgICAgICAgcmV0dXJuIFwiKChcIiArIGtleSArIFwiKSlcIjtcbiAgICB9O1xuXG4gICAgLy8gUGFyc2VzIGEgcGxhaW50ZXh0IHJ1bGUgaW4gdGhlIHRyYWNlcnkgc3ludGF4XG4gICAgdHJhY2VyeSA9IHtcblxuICAgICAgICBjcmVhdGVHcmFtbWFyIDogZnVuY3Rpb24ocmF3KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEdyYW1tYXIocmF3KTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRSYW5kb206IHNldFJhbmRvbSxcblxuICAgICAgICAvLyBQYXJzZSB0aGUgY29udGVudHMgb2YgYSB0YWdcbiAgICAgICAgcGFyc2VUYWcgOiBmdW5jdGlvbih0YWdDb250ZW50cykge1xuXG4gICAgICAgICAgICB2YXIgcGFyc2VkID0ge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBwcmVhY3Rpb25zIDogW10sXG4gICAgICAgICAgICAgICAgcG9zdGFjdGlvbnMgOiBbXSxcbiAgICAgICAgICAgICAgICBtb2RpZmllcnMgOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBzZWN0aW9ucyA9IHRyYWNlcnkucGFyc2UodGFnQ29udGVudHMpO1xuICAgICAgICAgICAgdmFyIHN5bWJvbFNlY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlY3Rpb25zW2ldLnR5cGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN5bWJvbFNlY3Rpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3ltYm9sU2VjdGlvbiA9IHNlY3Rpb25zW2ldLnJhdztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IChcIm11bHRpcGxlIG1haW4gc2VjdGlvbnMgaW4gXCIgKyB0YWdDb250ZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZWQucHJlYWN0aW9ucy5wdXNoKHNlY3Rpb25zW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzeW1ib2xTZWN0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyAgIHRocm93IChcIm5vIG1haW4gc2VjdGlvbiBpbiBcIiArIHRhZ0NvbnRlbnRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBvbmVudHMgPSBzeW1ib2xTZWN0aW9uLnNwbGl0KFwiLlwiKTtcbiAgICAgICAgICAgICAgICBwYXJzZWQuc3ltYm9sID0gY29tcG9uZW50c1swXTtcbiAgICAgICAgICAgICAgICBwYXJzZWQubW9kaWZpZXJzID0gY29tcG9uZW50cy5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGFyc2UgOiBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgICAgICB2YXIgZGVwdGggPSAwO1xuICAgICAgICAgICAgdmFyIGluVGFnID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgc2VjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIHZhciBlc2NhcGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHZhciBlcnJvcnMgPSBbXTtcbiAgICAgICAgICAgIHZhciBzdGFydCA9IDA7XG5cbiAgICAgICAgICAgIHZhciBlc2NhcGVkU3Vic3RyaW5nID0gXCJcIjtcbiAgICAgICAgICAgIHZhciBsYXN0RXNjYXBlZENoYXIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGlmIChydWxlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMuZXJyb3JzID0gZXJyb3JzO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlY3Rpb25zO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVTZWN0aW9uKHN0YXJ0LCBlbmQsIHR5cGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZW5kIC0gc3RhcnQgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goc3RhcnQgKyBcIjogZW1wdHkgdGFnXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gMilcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKHN0YXJ0ICsgXCI6IGVtcHR5IGFjdGlvblwiKTtcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmF3U3Vic3RyaW5nO1xuICAgICAgICAgICAgICAgIGlmIChsYXN0RXNjYXBlZENoYXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByYXdTdWJzdHJpbmcgPSBlc2NhcGVkU3Vic3RyaW5nICsgXCJcXFxcXCIgKyBydWxlLnN1YnN0cmluZyhsYXN0RXNjYXBlZENoYXIgKyAxLCBlbmQpO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmF3U3Vic3RyaW5nID0gcnVsZS5zdWJzdHJpbmcoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB0eXBlIDogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgcmF3IDogcmF3U3Vic3RyaW5nXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbGFzdEVzY2FwZWRDaGFyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGVzY2FwZWRTdWJzdHJpbmcgPSBcIlwiO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWVzY2FwZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGMgPSBydWxlLmNoYXJBdChpKTtcblxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goYykge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEVudGVyIGEgZGVlcGVyIGJyYWNrZXRlZCBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1snOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoID09PSAwICYmICFpblRhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGFydCA8IGkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVNlY3Rpb24oc3RhcnQsIGksIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXB0aCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnXSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXB0aC0tO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbmQgYSBicmFja2V0ZWQgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoID09PSAwICYmICFpblRhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVNlY3Rpb24oc3RhcnQsIGksIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICAvLyBIYXNodGFnXG4gICAgICAgICAgICAgICAgICAgIC8vICAgaWdub3JlIGlmIG5vdCBhdCBkZXB0aCAwLCB0aGF0IG1lYW5zIHdlIGFyZSBpbiBhIGJyYWNrZXRcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5UYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlU2VjdGlvbihzdGFydCwgaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0IDwgaSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVNlY3Rpb24oc3RhcnQsIGksIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpblRhZyA9ICFpblRhZztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1xcXFwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXNjYXBlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBlc2NhcGVkU3Vic3RyaW5nID0gZXNjYXBlZFN1YnN0cmluZyArIHJ1bGUuc3Vic3RyaW5nKHN0YXJ0LCBpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0RXNjYXBlZENoYXIgPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlc2NhcGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXJ0IDwgcnVsZS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgY3JlYXRlU2VjdGlvbihzdGFydCwgcnVsZS5sZW5ndGgsIDApO1xuXG4gICAgICAgICAgICBpZiAoaW5UYWcpIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChcIlVuY2xvc2VkIHRhZ1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZXB0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChcIlRvbyBtYW55IFtcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goXCJUb28gbWFueSBdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdHJpcCBvdXQgZW1wdHkgcGxhaW50ZXh0IHNlY3Rpb25zXG5cbiAgICAgICAgICAgIHNlY3Rpb25zID0gc2VjdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKHNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VjdGlvbi50eXBlID09PSAwICYmIHNlY3Rpb24ucmF3Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZWN0aW9ucy5lcnJvcnMgPSBlcnJvcnM7XG4gICAgICAgICAgICByZXR1cm4gc2VjdGlvbnM7XG4gICAgICAgIH0sXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGlzVm93ZWwoYykge1xuICAgICAgICB2YXIgYzIgPSBjLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiAoYzIgPT09ICdhJykgfHwgKGMyID09PSAnZScpIHx8IChjMiA9PT0gJ2knKSB8fCAoYzIgPT09ICdvJykgfHwgKGMyID09PSAndScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpc0FscGhhTnVtKGMpIHtcbiAgICAgICAgcmV0dXJuIChjID49ICdhJyAmJiBjIDw9ICd6JykgfHwgKGMgPj0gJ0EnICYmIGMgPD0gJ1onKSB8fCAoYyA+PSAnMCcgJiYgYyA8PSAnOScpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLiorP149IToke30oKXxcXFtcXF1cXC9cXFxcXSkvZywgXCJcXFxcJDFcIik7XG4gICAgfVxuXG4gICAgdmFyIGJhc2VFbmdNb2RpZmllcnMgPSB7XG5cbiAgICAgICAgcmVwbGFjZSA6IGZ1bmN0aW9uKHMsIHBhcmFtcykge1xuICAgICAgICAgICAgLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzExNDQ3ODMvcmVwbGFjaW5nLWFsbC1vY2N1cnJlbmNlcy1vZi1hLXN0cmluZy1pbi1qYXZhc2NyaXB0XG4gICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKG5ldyBSZWdFeHAoZXNjYXBlUmVnRXhwKHBhcmFtc1swXSksICdnJyksIHBhcmFtc1sxXSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FwaXRhbGl6ZUFsbCA6IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgICAgIHZhciBzMiA9IFwiXCI7XG4gICAgICAgICAgICB2YXIgY2FwTmV4dCA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgIGlmICghaXNBbHBoYU51bShzLmNoYXJBdChpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FwTmV4dCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHMyICs9IHMuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FwTmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgczIgKz0gcy5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzMiArPSBzLmNoYXJBdChpKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FwTmV4dCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gczI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcy5zdWJzdHJpbmcoMSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYSA6IGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgICAgIGlmIChzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAocy5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzLmNoYXJBdCgyKS50b0xvd2VyQ2FzZSgpID09PSAnaScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiYSBcIiArIHM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWb3dlbChzLmNoYXJBdCgwKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiYW4gXCIgKyBzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIFwiYSBcIiArIHM7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBmaXJzdFMgOiBmdW5jdGlvbihzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzKTtcbiAgICAgICAgICAgIHZhciBzMiA9IHMuc3BsaXQoXCIgXCIpO1xuXG4gICAgICAgICAgICB2YXIgZmluaXNoZWQgPSBiYXNlRW5nTW9kaWZpZXJzLnMoczJbMF0pICsgXCIgXCIgKyBzMi5zbGljZSgxKS5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGZpbmlzaGVkKTtcbiAgICAgICAgICAgIHJldHVybiBmaW5pc2hlZDtcbiAgICAgICAgfSxcblxuICAgICAgICBzIDogZnVuY3Rpb24ocykge1xuICAgICAgICAgICAgc3dpdGNoIChzLmNoYXJBdChzLmxlbmd0aCAtMSkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3MnOlxuICAgICAgICAgICAgICAgIHJldHVybiBzICsgXCJlc1wiO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcImVzXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcyArIFwiZXNcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3knOlxuICAgICAgICAgICAgICAgIGlmICghaXNWb3dlbChzLmNoYXJBdChzLmxlbmd0aCAtIDIpKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyaW5nKDAsIHMubGVuZ3RoIC0gMSkgKyBcImllc1wiO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcInNcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcInNcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZWQgOiBmdW5jdGlvbihzKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHMuY2hhckF0KHMubGVuZ3RoIC0xKSkge1xuICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcImVkXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcyArIFwiZFwiO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcImVkXCI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcyArIFwiZWRcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3knOlxuICAgICAgICAgICAgICAgIGlmICghaXNWb3dlbChzLmNoYXJBdChzLmxlbmd0aCAtIDIpKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyaW5nKDAsIHMubGVuZ3RoIC0gMSkgKyBcImllZFwiO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcImRcIjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMgKyBcImVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdHJhY2VyeS5iYXNlRW5nTW9kaWZpZXJzID0gYmFzZUVuZ01vZGlmaWVyczsgXG4gICAgLy8gRXh0ZXJuYWxpemVcbiAgICB0cmFjZXJ5LlRyYWNlcnlOb2RlID0gVHJhY2VyeU5vZGU7XG5cbiAgICB0cmFjZXJ5LkdyYW1tYXIgPSBHcmFtbWFyO1xuICAgIHRyYWNlcnkuU3ltYm9sID0gU3ltYm9sO1xuICAgIHRyYWNlcnkuUnVsZVNldCA9IFJ1bGVTZXQ7XG4gICAgcmV0dXJuIHRyYWNlcnk7XG59KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gdHJhY2VyeTtcbiIsImNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubGV0IHJlYWR5ID0gZmFsc2U7XG5cbmxldCAkZGlhbG9ncztcbmxldCAkbGluZU9uZTtcbmxldCAkbGluZVR3bztcbmxldCAkbmV4dDtcblxubGV0IGxpbmVPbmVBbmltYXRpbmc7XG5sZXQgbGluZVR3b0FuaW1hdGluZztcblxubGV0IGN1cjtcbmxldCBwcmV2O1xubGV0IG5leHQ7XG5cblxuY29uc3QgaW5pdCA9ICgpID0+IHtcbiAgY29uc29sZS5kZWJ1ZygnRGlhbG9nLmluaXQoKScpO1xuXG4gICRkaWFsb2dzID0gJCgnI2hpZ2hsaWdodHMtZGlhbG9nX190ZXh0IHAnKTtcbiAgJGxpbmVPbmUgPSAkZGlhbG9ncy5maXJzdCgpO1xuICAkbGluZVR3byA9ICRkaWFsb2dzLmxhc3QoKTtcbiAgJG5leHQgPSAkKCcjaGlnaGxpZ2h0cy1kaWFsb2dfX25leHQnKTtcblxuICBsaW5lT25lQW5pbWF0aW5nID0gZmFsc2U7XG4gIGxpbmVUd29BbmltYXRpbmcgPSBmYWxzZTtcblxuICAkZGlhbG9ncy5lYWNoKChfLCBlbCkgPT4ge1xuICAgIHV0aWwucHJlZml4ZWRPbigkKGVsKSwgJ0FuaW1hdGlvbkVuZCcsIG9uQW5pbUVuZCk7XG4gIH0pO1xuXG4gIHJlYWR5ID0gdHJ1ZTtcbn07XG5cbmNvbnN0IHN0YXJ0SGlnaGxpZ2h0ID0gKGhpZ2hsaWdodHMpID0+IHs7XG4gIGN1ciA9IGhpZ2hsaWdodHMuY3VyO1xuICBwcmV2ID0gaGlnaGxpZ2h0cy5wcmV2O1xuICBuZXh0ID0gaGlnaGxpZ2h0cy5uZXh0O1xuXG4gIGlmICghcmVhZHkpIGluaXQoKTtcblxuICAvLyByZXNldCBkaWFsb2dcbiAgLy9oaWdobGlnaHQuY3VyRGlhbG9nUGFydCA9IDA7XG4gICRsaW5lT25lLnJlbW92ZUNsYXNzKCdhbmltYXRpb24tZmluaXNoZWQgYW5pbWF0ZScpO1xuICAkbGluZVR3by5yZW1vdmVDbGFzcygnYW5pbWF0aW9uLWZpbmlzaGVkIGFuaW1hdGUnKTtcblxuICBjdXIuc3RhcnRlZCA9IHRydWU7XG4gIGFuaW1hdGVIaWdobGlnaHQoY3VyKTtcbn07XG5cbmNvbnN0IGFuaW1hdGVIaWdobGlnaHQgPSAoaGlnaGxpZ2h0KSA9PiB7XG4gICRsaW5lT25lLnRleHQoaGlnaGxpZ2h0LmRpYWxvZ1BhcnRzW2hpZ2hsaWdodC5jdXJEaWFsb2dQYXJ0XVswXSB8fCAnJyk7XG4gICRsaW5lVHdvLnRleHQoaGlnaGxpZ2h0LmRpYWxvZ1BhcnRzW2hpZ2hsaWdodC5jdXJEaWFsb2dQYXJ0XVsxXSB8fCAnJyk7XG5cbiAgaGlkZU5leHQoKTtcbiAgYW5pbWF0ZSgnb25lJyk7XG59O1xuXG5jb25zdCBhbmltYXRlID0gKGxpbmUpID0+IHtcbiAgaWYgKGxpbmUgPT09ICdvbmUnKSB7XG4gICAgLy9zdG9wQW5pbWF0ZSgndHdvJyk7XG4gICAgJGxpbmVPbmUuYWRkQ2xhc3MoJ2FuaW1hdGUnKTtcbiAgICBsaW5lT25lQW5pbWF0aW5nID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChsaW5lID09PSAndHdvJykge1xuICAgIC8vc3RvcEFuaW1hdGUoJ29uZScpO1xuICAgICRsaW5lVHdvLmFkZENsYXNzKCdhbmltYXRlJyk7XG4gICAgbGluZVR3b0FuaW1hdGluZyA9IHRydWU7XG4gIH1cbn07XG5cbmNvbnN0IHN0b3BBbmltYXRlID0gKGxpbmUpID0+IHtcbiAgaWYgKGxpbmUgPT09ICdvbmUnKSB7XG4gICAgJGxpbmVPbmVcbiAgICAgIC5yZW1vdmVDbGFzcygnYW5pbWF0ZScpXG4gICAgICAuYWRkQ2xhc3MoJ2FuaW1hdGlvbi1maW5pc2hlZCcpO1xuICAgIGxpbmVPbmVBbmltYXRpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChsaW5lID09PSAndHdvJykge1xuICAgICRsaW5lVHdvXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2FuaW1hdGUnKVxuICAgICAgLmFkZENsYXNzKCdhbmltYXRpb24tZmluaXNoZWQnKTtcbiAgICBsaW5lVHdvQW5pbWF0aW5nID0gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IG9uQW5pbUVuZCA9ICgpID0+IHtcbiAgLy8gY2hlY2sgZm9yIHRoZSBzZWNvbmQgYW5pbWF0aW9uIGZpcnN0IHNvIHRoZSBzZWNvbmQgYW5pbWF0aW9uXG4gIC8vIGRvZXNuJ3QgZ2V0IHRyaWdnZXJlZCB0aGVuIGltbWVkaWF0ZWx5IGVuZGVkIGluc2lkZSB0aGlzIGZ1bmNcbiAgaWYgKGxpbmVUd29BbmltYXRpbmcpIHtcbiAgICBzdG9wQW5pbWF0ZSgndHdvJyk7XG5cbiAgICBzaG93TmV4dCgpO1xuICB9XG5cbiAgaWYgKGxpbmVPbmVBbmltYXRpbmcpIHtcbiAgICBzdG9wQW5pbWF0ZSgnb25lJyk7XG5cbiAgICAvLyBpZiB0aGVyZSdzIHRleHQgaW4gbGluZVR3bywgYW5pbWF0ZSBpdFxuICAgIGlmICgkbGluZVR3by50ZXh0KCkubGVuZ3RoKSB7XG4gICAgICBhbmltYXRlKCd0d28nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd05leHQoKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIHNob3cgbmV4dCBhcnJvdyBpZjpcbi8vIHRoZXJlIGFyZSBwYXJ0cyBsZWZ0IHRvIHRoaXMgaGlnaGxpZ2h0XG4vLyB0aGVyZSBhcmUgaGlnaGxpZ2h0cyBsZWZ0IHRvIHRoZSBzdG9yeVxuY29uc3Qgc2hvd05leHQgPSAoKSA9PiB7XG4gIGlmIChjdXIuaGFzRGlhbG9nTGVmdCgpIHx8IG5leHQpIHtcbiAgICAkbmV4dC5hZGRDbGFzcygnc2hvdycpO1xuICB9XG59O1xuXG5jb25zdCBoaWRlTmV4dCA9ICgpID0+IHtcbiAgJG5leHQucmVtb3ZlQ2xhc3MoJ3Nob3cnKTtcbn07XG5cbmNvbnN0IGNvbnRpbnVlSGlnaGxpZ2h0ID0gKGhpZ2hsaWdodHMpID0+IHtcbiAgY3VyID0gaGlnaGxpZ2h0cy5jdXI7XG4gIHByZXYgPSBoaWdobGlnaHRzLnByZXY7XG4gIG5leHQgPSBoaWdobGlnaHRzLm5leHQ7XG5cbiAgaWYgKCFjdXIuc3RhcnRlZCkgeyByZXR1cm4gZmFsc2U7IH1cblxuICBjdXIuY3VyRGlhbG9nUGFydCsrO1xuXG4gIC8vIG5vIG1vcmUgdGV4dCB0byB0aGlzIGhpZ2hsaWdodFxuICBpZiAoY3VyLmN1ckRpYWxvZ1BhcnQgPT09IGN1ci5kaWFsb2dQYXJ0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhbmltYXRlSGlnaGxpZ2h0KGN1cik7XG4gIHJldHVybiB0cnVlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0YXJ0SGlnaGxpZ2h0LFxuICBjb250aW51ZUhpZ2hsaWdodCxcbn07XG5cbiIsImNvbnN0IG1sdXN0YXJkID0gcmVxdWlyZSgnbWx1c3RhcmQnKTtcblxuY29uc3QgaGlnaGxpZ2h0ID0gcmVxdWlyZSgnLi9oaWdobGlnaHQnKTtcblxubGV0IGdhbWVFdmVudHMgPSB7fTtcbmxldCBoaWdobGlnaHRzID0gW107XG5cbmNvbnN0IGdlbmVyYXRlSGlnaGxpZ2h0cyA9IChjYikgPT4ge1xuICAkKCcuZ2FtZS1ldmVudF9fY29udGFpbmVyIGlucHV0OmNoZWNrZWQnKS5lYWNoKChfLCBjaGVja2VkKSA9PiB7XG4gICAgY29uc3QgaWQgPSAkKGNoZWNrZWQpLmF0dHIoJ2lkJyk7XG5cbiAgICBjb25zdCBobCA9IGhpZ2hsaWdodC5tYWtlSGlnaGxpZ2h0KHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGdhbWVFdmVudDogZ2FtZUV2ZW50c1tpZF0uZXYsXG4gICAgICBtbHVzdGFyZDogZ2FtZUV2ZW50c1tpZF0ubWx1c3RhcmQsXG4gICAgfSk7XG5cbiAgICBoaWdobGlnaHRzLnB1c2goaGwpO1xuICB9KTtcblxuICBjb25zb2xlLmRlYnVnKCdnZW5lcmF0ZUhpZ2hsaWdodHM6JywgaGlnaGxpZ2h0cyk7XG4gIGNiKGhpZ2hsaWdodHMpO1xufTtcblxuY29uc3QgbWFrZUNvdW50Q2lyY2xlID0gKGNsYXNzZXMpID0+IHtcbiAgcmV0dXJuICQoJzxzcGFuPicpLmFkZENsYXNzKGNsYXNzZXMpO1xufTtcblxuY29uc3QgbWFrZUJhc2VEaWFtb25kID0gKG9jYykgPT4ge1xuICBjb25zdCAkZGlhbW9uZCA9ICQoJzxzcGFuPicpLmFkZENsYXNzKCdkaWFtb25kJyk7XG5cbiAgaWYgKG9jYykge1xuICAgICRkaWFtb25kLmFkZENsYXNzKCdmaWxsZWQnKTtcbiAgfVxuXG4gIHJldHVybiAkZGlhbW9uZDtcbn07XG5cbmNvbnN0IHJlbmRlckdhbWVFdiA9IChnYW1lRXYpID0+IHtcbiAgY29uc3QgZGF0YSA9IGdhbWVFdi5ldi5kYXRhO1xuXG4gIGlmICghZGF0YS5sYXN0VXBkYXRlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgJGdhbWVFdiA9ICQoJzxkaXY+Jyk7XG5cbiAgLy8gZm9ybSBzdHVmZlxuICBjb25zdCAkY2hDb250YWluZXIgPSAkKCc8ZGl2PicpO1xuICBjb25zdCAkY2hlY2sgPSAkKCc8aW5wdXQ+Jyk7XG4gIGNvbnN0ICRsYWJlbCA9ICQoJzxsYWJlbD4nKTtcblxuICBsZXQgdXBkYXRlID0gYCR7ZGF0YS5sYXN0VXBkYXRlfSAke2RhdGEuc2NvcmVVcGRhdGUgfHwgJyd9YDtcblxuICAkY2hlY2tcbiAgICAuYWRkQ2xhc3MoJ2Zvcm0tY2hlY2staW5wdXQnKVxuICAgIC5hdHRyKCdpZCcsIGdhbWVFdi5ldi5oYXNoKVxuICAgIC5hdHRyKCd0eXBlJywgJ2NoZWNrYm94JylcbiAgICAuYXR0cignbmFtZScsICdnYW1lIGV2ZW50JylcbiAgICAudmFsKCcnKTtcblxuICAkbGFiZWxcbiAgICAuYWRkQ2xhc3MoJ2Zvcm0tY2hlY2stbGFiZWwnKVxuICAgIC5hdHRyKCdmb3InLCBnYW1lRXYuZXYuaGFzaClcbiAgICAudGV4dCh1cGRhdGUpO1xuXG4gICRjaENvbnRhaW5lclxuICAgIC5hZGRDbGFzcygnZm9ybS1jaGVjayBjb2wtNycpXG4gICAgLmFwcGVuZCgkY2hlY2spXG4gICAgLmFwcGVuZCgkbGFiZWwpO1xuXG4gIC8vIGdhbWUgZXZlbnQgaW5mb1xuICBjb25zdCAkZ2FtZUV2SW5mbyA9ICQoJzxkaXY+Jyk7XG4gIGNvbnN0ICRzY29yZSA9ICQoJzxzcGFuPicpO1xuICBjb25zdCAkYmFzZXMgPSAkKCc8c3Bhbj4nKTtcbiAgY29uc3QgJGJhbGxzID0gJCgnPHNwYW4+Jyk7XG4gIGNvbnN0ICRzdHJpa2VzID0gJCgnPHNwYW4+Jyk7XG4gIGNvbnN0ICRvdXRzID0gJCgnPHNwYW4+Jyk7XG5cbiAgbGV0IGhvbWVFbW9qaSA9ICcnO1xuICBsZXQgYXdheUVtb2ppID0gJyc7XG5cbiAgdHJ5IHtcbiAgICBob21lRW1vamkgPSBkYXRhLmhvbWVUZWFtRW1vamkgPyBTdHJpbmcuZnJvbUNvZGVQb2ludChkYXRhLmhvbWVUZWFtRW1vamkpIDogJyc7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGhvbWVFbW9qaSA9IGRhdGEuaG9tZVRlYW1FbW9qaTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdheUVtb2ppID0gZGF0YS5hd2F5VGVhbUVtb2ppID8gU3RyaW5nLmZyb21Db2RlUG9pbnQoZGF0YS5hd2F5VGVhbUVtb2ppKSA6ICcnO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBhd2F5RW1vamkgPSBkYXRhLmF3YXlUZWFtRW1vamk7XG4gIH1cblxuICBsZXQgc2NvcmUgPSBgJHtob21lRW1vaml9ICR7ZGF0YS5ob21lU2NvcmV9IDogJHthd2F5RW1vaml9ICR7ZGF0YS5hd2F5U2NvcmV9YDtcbiAgbGV0IGJhc2VzID0gJyc7XG5cbiAgLy8gZmlsbCBpbiBiYWxscyBjb3VudFxuICBmb3IgKGxldCBiYWxsID0gMDsgYmFsbCA8IGRhdGEuYXRCYXRCYWxsczsgYmFsbCsrKSB7XG4gICAgJGJhbGxzLmFwcGVuZChtYWtlQ291bnRDaXJjbGUoJ2NpcmNsZSBmdWxsJykpO1xuICB9XG5cbiAgZm9yIChsZXQgYmFsbCA9IDM7IGJhbGwgPiBkYXRhLmF0QmF0QmFsbHM7IGJhbGwtLSkge1xuICAgICRiYWxscy5hcHBlbmQobWFrZUNvdW50Q2lyY2xlKCdjaXJjbGUgZW1wdHknKSk7XG4gIH1cblxuICAvLyBmaWxsIGluIHN0cmlrZXMgY291bnRcbiAgZm9yIChsZXQgc3RyaWtlID0gMDsgc3RyaWtlIDwgZGF0YS5hdEJhdFN0cmlrZXM7IHN0cmlrZSsrKSB7XG4gICAgJHN0cmlrZXMuYXBwZW5kKG1ha2VDb3VudENpcmNsZSgnY2lyY2xlIGZ1bGwnKSk7XG4gIH1cblxuICBmb3IgKGxldCBzdHJpa2UgPSAyOyBzdHJpa2UgPiBkYXRhLmF0QmF0U3RyaWtlczsgc3RyaWtlLS0pIHtcbiAgICAkc3RyaWtlcy5hcHBlbmQobWFrZUNvdW50Q2lyY2xlKCdjaXJjbGUgZW1wdHknKSk7XG4gIH1cblxuICAvLyBmaWxsIGluIG91dHMgY291bnRcbiAgZm9yIChsZXQgb3V0ID0gMDsgb3V0IDwgZGF0YS5oYWxmSW5uaW5nT3V0czsgb3V0KyspIHtcbiAgICAkb3V0cy5hcHBlbmQobWFrZUNvdW50Q2lyY2xlKCdjaXJjbGUgZnVsbCcpKTtcbiAgfVxuXG4gIGZvciAobGV0IG91dCA9IDI7IG91dCA+IGRhdGEuaGFsZklubmluZ091dHM7IG91dC0tKSB7XG4gICAgJG91dHMuYXBwZW5kKG1ha2VDb3VudENpcmNsZSgnY2lyY2xlIGVtcHR5JykpO1xuICB9XG5cbiAgLy8gZmlsbCBpbiBiYXNlIGRpYW1vbmRzXG4gICRiYXNlcy5hcHBlbmQobWFrZUJhc2VEaWFtb25kKGdhbWVFdi5tbHVzdGFyZC5iYXNlUnVubmVycy50aGlyZC5wbGF5ZXJOYW1lKSk7XG4gICRiYXNlcy5hcHBlbmQobWFrZUJhc2VEaWFtb25kKGdhbWVFdi5tbHVzdGFyZC5iYXNlUnVubmVycy5zZWNvbmQucGxheWVyTmFtZSkpO1xuICAkYmFzZXMuYXBwZW5kKG1ha2VCYXNlRGlhbW9uZChnYW1lRXYubWx1c3RhcmQuYmFzZVJ1bm5lcnMuZmlyc3QucGxheWVyTmFtZSkpO1xuICAvLyB0b2RvOiBkZWFsIHdpdGggNCBiYXNlc1xuICAvLyRiYXNlcy5hcHBlbmQobWFrZUJhc2VEaWFtb25kKGdhbWVFdi5tbHVzdGFyZC5iYXNlUnVubmVycy5maXJzdC5wbGF5ZXJOYW1lKSk7XG5cbiAgJHNjb3JlXG4gICAgLnRleHQoc2NvcmUpO1xuICAkYmFsbHNcbiAgICAuYXR0cigndGl0bGUnLCAnQmFsbHMnKVxuICAgIC5hZGRDbGFzcygnYmFsbHMtY291bnQnKTtcbiAgJHN0cmlrZXNcbiAgICAuYXR0cigndGl0bGUnLCAnU3RyaWtlcycpXG4gICAgLmFkZENsYXNzKCdzdHJpa2VzLWNvdW50Jyk7XG4gICRvdXRzXG4gICAgLmF0dHIoJ3RpdGxlJywgJ091dHMnKVxuICAgIC5hZGRDbGFzcygnb3V0cy1jb3VudCcpO1xuICAkYmFzZXNcbiAgICAuYXR0cigndGl0bGUnLCAnQmFzZXMgb2NjdXBpZWQnKVxuICAgIC5hZGRDbGFzcygnYmFzZXMtb2NjdXBpZWQnKTtcblxuICAkZ2FtZUV2SW5mb1xuICAgIC5hZGRDbGFzcygnY29sLTUnKVxuICAgIC5hcHBlbmQoJHNjb3JlKVxuICAgIC5hcHBlbmQoJGJhc2VzKVxuICAgIC5hcHBlbmQoJGJhbGxzKVxuICAgIC5hcHBlbmQoJHN0cmlrZXMpXG4gICAgLmFwcGVuZCgkb3V0cyk7XG5cbiAgJGdhbWVFdlxuICAgIC5hZGRDbGFzcygnZ2FtZS1ldmVudF9fY29udGFpbmVyIHJvdyBib3JkZXInKVxuICAgIC5hcHBlbmQoJGNoQ29udGFpbmVyKVxuICAgIC5hcHBlbmQoJGdhbWVFdkluZm8pO1xuXG4gIHJldHVybiAkZ2FtZUV2O1xufTtcblxuY29uc3QgcmVuZGVyR2FtZUV2cyA9ICgpID0+IHtcbiAgc3RvcExvYWRpbmcoKTtcbiAgJCgnI2dhbWUtZXZlbnRzLXNlbGVjdCcpLnJlbW92ZUNsYXNzKCdkLW5vbmUnKTtcblxuICBjb25zdCAkY29udGFpbmVyID0gJCgnI2dhbWUtZXZlbnRzLWNob29zZV9fY29udGFpbmVyJyk7XG5cbiAgLy8gZ290dGEgcmVuZGVyIHNvbWUgZ2VuZXJhbCBzdHVmZiB0b28gKGhvbWUgdnMgYXdheSwgcyNkIywgd2VhdGhlcilcbiAgLy8gYWxzbzogbGFiZWwgZm9yIHRoZSBzZWxlY3QsIGFuZCB0aGUgc2VsZWN0IGl0c2VsZlxuICBmb3IgKGxldCBpZCBpbiBnYW1lRXZlbnRzKSB7XG4gICAgbGV0ICRnYW1lRXYgPSByZW5kZXJHYW1lRXYoZ2FtZUV2ZW50c1tpZF0pO1xuXG4gICAgaWYgKCRnYW1lRXYpIHtcbiAgICAgICRjb250YWluZXIuYXBwZW5kKCRnYW1lRXYpO1xuICAgIH1cbiAgfVxufTtcblxuY29uc3QgZ2V0R2FtZUV2ZW50cyA9IGFzeW5jIChnYW1lSWQsIG5leHRQYWdlKSA9PiB7XG4gIGxldCBnYW1lc1VSTCA9IGBodHRwczovL2FwaS5zaWJyLmRldi9jaHJvbmljbGVyL3YxL2dhbWVzL3VwZGF0ZXM/Z2FtZT0ke2dhbWVJZH1gO1xuXG4gIGlmIChuZXh0UGFnZSkge1xuICAgIGdhbWVzVVJMICs9IGAmcGFnZT0ke25leHRQYWdlfWA7XG4gIH1cblxuICBzdGFydExvYWRpbmcoKTtcblxuICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2goZ2FtZXNVUkwpO1xuXG4gIGlmIChyZXNwLm9rKSB7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3AuanNvbigpO1xuXG4gICAgZm9yIChsZXQgZ2FtZUV2IG9mIGRhdGEuZGF0YSkge1xuICAgICAgZ2FtZUV2ZW50c1tnYW1lRXYuaGFzaF0gPSB7XG4gICAgICAgIGV2OiBnYW1lRXYsXG4gICAgICAgIG1sdXN0YXJkOiBtbHVzdGFyZC5hbmFseXplR2FtZUV2ZW50KGdhbWVFdi5kYXRhKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGRhdGEubmV4dFBhZ2UpIHtcbiAgICAgIGdldEdhbWVFdmVudHMoZ2FtZUlkLCBkYXRhLm5leHRQYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZG9uZSBsb2FkaW5nIGFsbCBnYW1lIGV2ZW50c1xuICAgICAgcmVuZGVyR2FtZUV2cygpO1xuICAgICAgY29uc29sZS5kZWJ1ZygnZ2V0R2FtZUV2ZW50cyBkb25lOicsIGdhbWVFdmVudHMpO1xuICAgIH1cblxuICB9XG59O1xuXG5jb25zdCBzdGFydExvYWRpbmcgPSAoKSA9PiB7XG4gIGNvbnN0ICRnYW1lRXZGb3JtID0gJCgnI2dhbWUtZXZlbnQtZm9ybScpO1xuXG4gICRnYW1lRXZGb3JtLmZpbmQoJ2J1dHRvbicpLmFkZENsYXNzKCdkLW5vbmUnKTtcbiAgJGdhbWVFdkZvcm0uZmluZCgnLnNwaW5uZXItYm9yZGVyJykucmVtb3ZlQ2xhc3MoJ2Qtbm9uZScpO1xufTtcblxuY29uc3Qgc3RvcExvYWRpbmcgPSAoKSA9PiB7XG4gIGNvbnN0ICRnYW1lRXZGb3JtID0gJCgnI2dhbWUtZXZlbnQtZm9ybScpO1xuXG4gICRnYW1lRXZGb3JtLmZpbmQoJ2J1dHRvbicpLnJlbW92ZUNsYXNzKCdkLW5vbmUnKTtcbiAgJGdhbWVFdkZvcm0uZmluZCgnLnNwaW5uZXItYm9yZGVyJykuYWRkQ2xhc3MoJ2Qtbm9uZScpO1xufTtcblxuY29uc3QgaW5pdCA9IChoaWdobGlnaHRzUmVhZHlDYikgPT4ge1xuICBjb25zdCAkZ2FtZUV2Rm9ybSA9ICQoJyNnYW1lLWV2ZW50LWZvcm0nKTtcblxuICAkZ2FtZUV2Rm9ybS5vbignc3VibWl0JywgKGV2KSA9PiB7XG4gICAgZXYucHJldmVudERlZmF1bHQoKTtcblxuICAgIGNvbnN0IGdhbWVJZCA9ICRnYW1lRXZGb3JtIC5maW5kKCcjZ2FtZS1pZCcpLnZhbCgpIC5zcGxpdCgnLycpLnBvcCgpO1xuICAgIGdldEdhbWVFdmVudHMoZ2FtZUlkKTtcbiAgfSk7XG5cbiAgY29uc3QgJGhpZ2hsaWdodHNTZWxlY3RGb3JtID0gJCgnI2dhbWUtZXZlbnRzLWNob29zZV9fZm9ybScpO1xuXG4gICRoaWdobGlnaHRzU2VsZWN0Rm9ybS5vbignc3VibWl0JywgKGV2KSA9PiB7XG4gICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICBnZW5lcmF0ZUhpZ2hsaWdodHMoaGlnaGxpZ2h0c1JlYWR5Q2IpO1xuICB9KTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQsXG59O1xuXG4iLCJjb25zdCBncmFuZFNsYWxhbWkgPSByZXF1aXJlKCdncmFuZC1zbGFsYW1pJyk7XG5cbi8vIG1ha2luZyBhICdjbGFzcycgZm9yIGhpZ2hsaWdodHMgaW4gdGhlIG9sZC1zY2hvb2wgd2F5XG4vLyBjYXVzZSBpIGRvbid0IHdhbm5hIGhhdmUgdG8gY29tcGxpY2F0ZSB0aGluZ3MgZnVydGhlciB3aXRoIGJhYmVsXG5jb25zdCBtYWtlSGlnaGxpZ2h0ID0gKHNldHRpbmdzKSA9PiB7XG4gIHNldHRpbmdzID0gc2V0dGluZ3MgfHwge307XG5cbiAgbGV0IGlkO1xuICBsZXQgZ2FtZUV2ZW50O1xuICBsZXQgbWx1c3RhcmQ7XG4gIGxldCBjb21tZW50YXJ5O1xuICBsZXQgbWF4RGlhbG9nTGVuO1xuICBsZXQgZGlhbG9nUGFydHM7XG4gIGxldCBjdXJEaWFsb2dQYXJ0O1xuXG4gIGNvbnN0IGluaXQgPSAoKSA9PiB7XG4gICAgaWQgPSBzZXR0aW5ncy5pZDtcbiAgICBnYW1lRXZlbnQgPSBzZXR0aW5ncy5nYW1lRXZlbnQ7XG4gICAgbWx1c3RhcmQgPSBzZXR0aW5ncy5tbHVzdGFyZDtcbiAgICBjb21tZW50YXJ5ID0gZ2VuZXJhdGVDb21tZW50YXJ5KCk7XG4gICAgbWF4RGlhbG9nTGVuID0gc2V0TWF4RGlhbG9nTGVuKCk7XG4gICAgZGlhbG9nUGFydHMgPSBbXTtcbiAgICBjdXJEaWFsb2dQYXJ0ID0gMDtcbiAgICBicmVha0ludG9EaWFsb2dQYXJ0cygpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkLFxuICAgICAgZ2FtZUV2ZW50LFxuICAgICAgbWx1c3RhcmQsXG4gICAgICBjb21tZW50YXJ5LFxuICAgICAgZGlhbG9nUGFydHMsXG4gICAgICBjdXJEaWFsb2dQYXJ0LFxuICAgICAgaGFzRGlhbG9nTGVmdCxcbiAgICB9O1xuICB9O1xuXG4gIGNvbnN0IGdlbmVyYXRlQ29tbWVudGFyeSA9ICgpID0+IHtcbiAgICByZXR1cm4gZ3JhbmRTbGFsYW1pLmdldENvbW1lbnQoe1xuICAgICAgZ2FtZUV2ZW50OiBnYW1lRXZlbnQuZGF0YSxcbiAgICAgIG1sdXN0YXJkOiBtbHVzdGFyZCxcbiAgICB9KTtcbiAgfTtcblxuICAvLyB0b2RvOiBkbyBpIHdhbm5hIHN1cHBvcnQgbW9iaWxlPyB0aGVuIHVwZGF0ZSB0aGlzIGFjY29yZGluZ2x5XG4gIGNvbnN0IHNldE1heERpYWxvZ0xlbiA9ICgpID0+IHtcbiAgICByZXR1cm4gNDA7XG4gIH07XG5cbiAgY29uc3QgYnJlYWtJbnRvRGlhbG9nUGFydHMgPSAoKSA9PiB7XG4gICAgLy8gc3BsaXQgYnkgbmV3bGluZXMgKGVuZm9yY2VkIHBhY2luZylcbiAgICBjb25zdCBwYWNpbmdQYXJ0cyA9IGNvbW1lbnRhcnkuc3BsaXQoJ1xcbicpO1xuXG4gICAgcGFjaW5nUGFydHMuZm9yRWFjaCgocCkgPT4ge1xuICAgICAgYnJlYWtJbnRvUGFydHMocCk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gc3BsaXQgZWFjaCBwYXJ0IGludG8gaXRzIGFuaW1hdGlvbiBwYXJ0cyBieSBsaW5lIGxlbmd0aFxuICBjb25zdCBicmVha0ludG9QYXJ0cyA9ICh0ZXh0KSA9PiB7XG4gICAgbGV0IHBhcnRzID0gW1tdLCBbXV07XG4gICAgbGV0IHVuZmlsbGVkID0gMDtcbiAgICBsZXQgbGVuID0gMDtcblxuICAgIHRleHQuc3BsaXQoJyAnKS5mb3JFYWNoKCh3b3JkKSA9PiB7XG4gICAgICBsZXQgd29yZExlbiA9IHdvcmQubGVuZ3RoO1xuXG4gICAgICBpZiAoKGxlbiArIHdvcmRMZW4pID4gbWF4RGlhbG9nTGVuKSB7XG4gICAgICAgIGxlbiA9IDA7XG5cbiAgICAgICAgaWYgKHVuZmlsbGVkID09PSAxKSB7XG4gICAgICAgICAgZGlhbG9nUGFydHMucHVzaChtYWtlU2VudGVuY2VzKHBhcnRzKSk7XG4gICAgICAgICAgcGFydHMgPSBbW10sIFtdXTtcbiAgICAgICAgICB1bmZpbGxlZCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdW5maWxsZWQgPSAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICgobGVuICsgd29yZExlbikgPD0gbWF4RGlhbG9nTGVuKSB7XG4gICAgICAgIHBhcnRzW3VuZmlsbGVkXS5wdXNoKHdvcmQpO1xuICAgICAgICBsZW4gKz0gd29yZExlbiArIDE7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBkaWFsb2dQYXJ0cy5wdXNoKG1ha2VTZW50ZW5jZXMocGFydHMpKTtcbiAgfTtcblxuICBjb25zdCBtYWtlU2VudGVuY2VzID0gKHBhcnRzKSA9PiB7XG4gICAgcmV0dXJuIHBhcnRzLm1hcCgod29yZHMpID0+IHtcbiAgICAgIHJldHVybiB3b3Jkcy5qb2luKCcgJyk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgaGFzRGlhbG9nTGVmdCA9ICgpID0+IHtcbiAgICByZXR1cm4gISgoY3VyRGlhbG9nUGFydCArIDEpID09PSBkaWFsb2dQYXJ0cy5sZW5ndGgpO1xuICB9O1xuXG4gIHJldHVybiBpbml0KCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWFrZUhpZ2hsaWdodCxcbn07XG5cbiIsImNvbnN0IGdhbWVFdmVudFNlbGVjdG9yID0gcmVxdWlyZSgnLi9nYW1lLWV2ZW50LXNlbGVjdG9yJyk7XG5jb25zdCBkaWFsb2cgPSByZXF1aXJlKCcuL2RpYWxvZycpO1xuY29uc3QgdmlzdWFsID0gcmVxdWlyZSgnLi92aXN1YWwnKTtcblxubGV0IGhpZ2hsaWdodHMgPSBbXTtcbmxldCBjdXJIaWdobGlnaHQgPSAwO1xubGV0IGludHJvID0gdHJ1ZTtcblxuY29uc3QgZ2V0SGlnaGxpZ2h0cyA9ICgpID0+IHtcbiAgcmV0dXJuIHtcbiAgICBwcmV2OiBoaWdobGlnaHRzW2N1ckhpZ2hsaWdodCAtIDFdLFxuICAgIGN1cjogaGlnaGxpZ2h0c1tjdXJIaWdobGlnaHRdLFxuICAgIG5leHQ6IGhpZ2hsaWdodHNbY3VySGlnaGxpZ2h0ICsgMV0sXG4gIH07XG59O1xuXG5jb25zdCBuZXh0SGlnaGxpZ2h0ID0gKCkgPT4ge1xuICB2aXN1YWwudXBkYXRlRGlhbW9uZChnZXRIaWdobGlnaHRzKCkpO1xuICBkaWFsb2cuc3RhcnRIaWdobGlnaHQoZ2V0SGlnaGxpZ2h0cygpKTtcbn07XG5cbmNvbnN0IGNvbnRpbnVlSGlnaGxpZ2h0ID0gKCkgPT4ge1xuICByZXR1cm4gZGlhbG9nLmNvbnRpbnVlSGlnaGxpZ2h0KGdldEhpZ2hsaWdodHMoKSk7XG59O1xuXG5jb25zdCBoYW5kbGVBY3Rpb24gPSAoZXZ0KSA9PiB7XG4gIGlmIChldnQudHlwZSA9PT0gJ2tleXVwJyAmJiAhKFxuICAgIGV2dC5rZXlDb2RlID09PSAzMiB8fCAvLyBzcGFjZVxuICAgIGV2dC5rZXlDb2RlID09PSAzOSB8fCAvLyBhcnJvdyByaWdodFxuICAgIGV2dC5rZXlDb2RlID09PSA0MCAgICAvLyBhcnJvdyBkb3duXG4gICkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBkbyBub3RoaW5nIGlmIHRoZXJlJ3Mgbm8gbW9yZSBoaWdobGlnaHRzXG4gIGlmIChoaWdobGlnaHRzLmxlbmd0aCA9PT0gY3VySGlnaGxpZ2h0KSB7IHJldHVybiB9O1xuXG4gIC8vIGlmIHdlJ3JlIGluIHRoZSBpbnRybywgc3RhcnQgYXQgdGhlIGZpcnN0IGhpZ2hsaWdodFxuICBpZiAoaW50cm8pIHtcbiAgICBpbnRybyA9IGZhbHNlO1xuXG4gICAgbmV4dEhpZ2hsaWdodCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHRyeSB0byBhZHZhbmNlIHRoZSBoaWdobGlnaHQsIGlmIHRoZXJlJ3MgbW9yZSB0ZXh0IHRvIGFuaW1hdGVcbiAgaWYgKCFjb250aW51ZUhpZ2hsaWdodCgpKSB7XG4gICAgY3VySGlnaGxpZ2h0Kys7XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgbm8gbW9yZSBoaWdobGlnaHRzLCBtb3ZlIGludG8gb3V0cm9cbiAgICBpZiAoaGlnaGxpZ2h0cy5sZW5ndGggPT09IGN1ckhpZ2hsaWdodCkge1xuICAgICAgLy8gdG9kbzogb3V0cm9cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2UsIHNob3cgdGhlIG5leHQgaGlnaGxpZ2h0XG4gICAgbmV4dEhpZ2hsaWdodCgpO1xuICB9XG59O1xuXG5jb25zdCBzZXR1cEludHJvID0gKCkgPT4ge1xuICAvLyBncmFiIGdhbWUgaW5mbyBmcm9tIGZpcnN0IGhpZ2hsaWdodFxuICBjb25zdCBnYW1lRXYgPSBoaWdobGlnaHRzWzBdLmdhbWVFdmVudC5kYXRhO1xuICBjb25zdCAkaG9tZSA9ICQoJyNpbnRybyAudnMtbG9nb19faG9tZScpO1xuICBjb25zdCAkYXdheSA9ICQoJyNpbnRybyAudnMtbG9nb19fYXdheScpO1xuXG4gIGxldCBoTmljayA9IGdhbWVFdi5ob21lVGVhbU5pY2tuYW1lLnNwbGl0KCcgJykucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgbGV0IGFOaWNrID0gZ2FtZUV2LmF3YXlUZWFtTmlja25hbWUuc3BsaXQoJyAnKS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmIChhTmljayA9PT0gJ21lY2hhbmljcycpIHtcbiAgICBhTmljayArPSAnLWF3YXknO1xuICB9XG5cbiAgJCgnI2ludHJvIC5nYW1lLW5hbWUnKS50ZXh0KGBTZWFzb24gJHtnYW1lRXYuc2Vhc29uICsgMX0sIERheSAke2dhbWVFdi5kYXkgKyAxfWApO1xuICAkaG9tZS5hdHRyKCdzcmMnLCBgLi9pbWFnZXMvbG9nby0ke2hOaWNrfS5wbmdgKTtcbiAgJGF3YXkuYXR0cignc3JjJywgYC4vaW1hZ2VzL2xvZ28tJHthTmlja30ucG5nYCk7XG5cbiAgLy8gZ2VvcmdpYXMgZG9uJ3QgaGF2ZSBhIHN0YW5kYXJkIHNpemUgbG9nb1xuICBpZiAoaE5pY2sgPT09ICdnZW9yZ2lhcycpIHtcbiAgICAkaG9tZS5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gIH1cblxuICBpZiAoYU5pY2sgPT09ICdnZW9yZ2lhcycpIHtcbiAgICAkYXdheS5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gIH1cbn07XG5cbmNvbnN0IG9uSGlnaGxpZ2h0c1JlYWR5ID0gKGhscykgPT4ge1xuICBoaWdobGlnaHRzID0gaGxzO1xuXG4gIHNldHVwSW50cm8oKTtcblxuICAkKGRvY3VtZW50KS5vbigna2V5dXAnLCBoYW5kbGVBY3Rpb24pO1xuICAkKCcjaGlnaGxpZ2h0cy1kaWFsb2dfX2NvbnRhaW5lcicpLm9uKCdjbGljaycsIGhhbmRsZUFjdGlvbik7XG59O1xuXG5jb25zdCBpbml0QXBwID0gKCkgPT4ge1xuICBnYW1lRXZlbnRTZWxlY3Rvci5pbml0KG9uSGlnaGxpZ2h0c1JlYWR5KTtcblxuICB3aW5kb3cuc3RhcnRIaWdobGlnaHQgPSBkaWFsb2cuc3RhcnRIaWdobGlnaHQ7XG5cbn07XG5cbmluaXRBcHAoKTtcblxuIiwiLy8gYXBhdGVkIGZyb21cbi8vIGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vY29udHJvbGxpbmctY3NzLWFuaW1hdGlvbnMtdHJhbnNpdGlvbnMtamF2YXNjcmlwdC9cbmNvbnN0IHByZWZpeGVzID0gWyd3ZWJraXQnLCAnbW96JywgJ01TJywgJ28nLCAnJ107XG5cbmNvbnN0IHByZWZpeGVkT24gPSAoJGVsLCB0eXBlLCBjYikgPT4ge1xuICBmb3IgKGxldCBwcmVmaXggb2YgcHJlZml4ZXMpIHtcbiAgICBpZiAoIXByZWZpeCkgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAkZWwub24oYCR7cHJlZml4fSR7dHlwZX1gLCBjYik7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwcmVmaXhlZE9uLFxufTtcblxuIiwiY29uc3QgJGRpYW1vbmQgPSAkKCcjZGlhbW9uZCcpO1xuY29uc3QgZGlhbW9uZExvY2F0aW9ucyA9IHtcbiAgJG1vdW5kOiAkZGlhbW9uZC5maW5kKCcubW91bmQnKSxcbiAgJGJhdHRpbmc6ICRkaWFtb25kLmZpbmQoJy5iYXR0aW5nJyksXG4gICRmaXJzdDogJGRpYW1vbmQuZmluZCgnLmZpcnN0JyksXG4gICRzZWNvbmQ6ICRkaWFtb25kLmZpbmQoJy5zZWNvbmQnKSxcbiAgJHRoaXJkOiAkZGlhbW9uZC5maW5kKCcudGhpcmQnKSxcbn07XG5cbmNvbnN0IEJBU0VTID0gWydmaXJzdCcsICdzZWNvbmQnLCAndGhpcmQnXTsgLy8gdG9kbzogJ2ZvdXJ0aCcsICdzZWNyZXQnP1xuXG5jb25zdCBkcmF3QmF0dGVyID0gKGhpZ2hsaWdodHMpID0+IHtcbiAgLy9jb25zdCBtbCA9IGhpZ2hsaWdodC5tbHVzdGFyZDtcbiAgY29uc3QgY3VyID0gaGlnaGxpZ2h0cy5jdXI7XG4gIGNvbnN0IGdlID0gY3VyLmdhbWVFdmVudC5kYXRhO1xuXG4gIGNvbnN0IHRlYW0gPSBnZS50b3BPZklubmluZyA/ICdhd2F5JyA6ICdob21lJztcblxuICBkaWFtb25kTG9jYXRpb25zWyckYmF0dGluZyddXG4gICAgLmNzcygnY29sb3InLCBnZVtgJHt0ZWFtfVRlYW1Db2xvcmBdKVxuICAgIC50ZXh0KGdlW2Ake3RlYW19QmF0dGVyTmFtZWBdKTtcbn07XG5cbmNvbnN0IGRyYXdQaXRjaGVyID0gKGhpZ2hsaWdodHMpID0+IHtcbiAgLy9jb25zdCBtbCA9IGhpZ2hsaWdodC5tbHVzdGFyZDtcbiAgY29uc3QgY3VyID0gaGlnaGxpZ2h0cy5jdXI7XG4gIGNvbnN0IGdlID0gY3VyLmdhbWVFdmVudC5kYXRhO1xuXG4gIGNvbnN0IHRlYW0gPSBnZS50b3BPZklubmluZyA/ICdob21lJyA6ICdhd2F5JztcblxuICBkaWFtb25kTG9jYXRpb25zWyckbW91bmQnXVxuICAgIC5jc3MoJ2NvbG9yJywgZ2VbYCR7dGVhbX1UZWFtQ29sb3JgXSlcbiAgICAudGV4dChnZVtgJHt0ZWFtfVBpdGNoZXJOYW1lYF0pO1xufTtcblxuY29uc3QgZHJhd0Jhc2VydW5uZXJzID0gKGhpZ2hsaWdodHMpID0+IHtcbiAgY29uc3QgY3VyID0gaGlnaGxpZ2h0cy5jdXI7XG4gIGNvbnN0IG1sID0gY3VyLm1sdXN0YXJkO1xuICBjb25zdCBnZSA9IGN1ci5nYW1lRXZlbnQuZGF0YTtcblxuICBjb25zdCB0ZWFtID0gZ2UudG9wT2ZJbm5pbmcgPyAnYXdheScgOiAnaG9tZSc7XG5cbiAgaWYgKG1sICYmIG1sLmJhc2VSdW5uZXJzKSB7XG4gICAgZm9yIChsZXQgYmFzZSBvZiBCQVNFUykge1xuICAgICAgaWYgKG1sLmJhc2VSdW5uZXJzW2Jhc2VdLnBsYXllck5hbWUpIHtcbiAgICAgICAgZGlhbW9uZExvY2F0aW9uc1tgJCR7YmFzZX1gXVxuICAgICAgICAgIC5jc3MoJ2NvbG9yJywgZ2VbYCR7dGVhbX1UZWFtQ29sb3JgXSlcbiAgICAgICAgICAudGV4dChtbC5iYXNlUnVubmVyc1tiYXNlXS5wbGF5ZXJOYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmNvbnN0IHVwZGF0ZURpYW1vbmQgPSAoaGlnaGxpZ2h0cykgPT4ge1xuICBkcmF3QmF0dGVyKGhpZ2hsaWdodHMpO1xuICBkcmF3UGl0Y2hlcihoaWdobGlnaHRzKTtcbiAgZHJhd0Jhc2VydW5uZXJzKGhpZ2hsaWdodHMpO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdXBkYXRlRGlhbW9uZCxcbn07XG5cbiJdfQ==

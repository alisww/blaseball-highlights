const grandSlalami = require('grand-slalami');

let gameEvents = {};
let highlights = {};

/*
 * highlights:
 * {
 *   id: '', chronicler hash?
 *   gameEvent: {}, just the data
 *   commentary: '', first generated by grand-slalami
 * }
 */

const generateHighlights = () => {
  $('.game-event-select__option:selected').each((_, selected) => {
    const id = $(selected).val();

    highlights[id] = {
      id: id,
      gameEvent: gameEvents[id],
      commentary: grandSlalami.getComment({
        gameEvent: gameEvents[id].data,
      }),
    };
  });

  console.debug('generateHighlights:', highlights);
};

const renderGameEv = (gameEv) => {
  const data = gameEv.data;

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
    .attr('id', gameEv.hash)
    .attr('type', 'checkbox')
    .attr('name', 'game event')
    .val('');

  $label
    .addClass('form-check-label')
    .attr('for', gameEv.hash)
    .text(update);

  $chContainer
    .addClass('form-check col-7')
    .append($check)
    .append($label);

  // game event info
  const $gameEvInfo = $('<div>');
  const $score = $('<span>');
  //const $update = $('<span>');
  const $bases = $('<span>');
  const $count = $('<span>');

  let homeEmoji = data.homeTeamEmoji ? String.fromCodePoint(data.homeTeamEmoji) : '';
  let awayEmoji = data.awayTeamEmoji ? String.fromCodePoint(data.awayTeamEmoji) : '';
  let score = `${homeEmoji} ${data.homeScore} : ${awayEmoji} ${data.awayScore} | `;
  let bases = `R: | `;
  let balls = `B: ${data.atBatBalls}`;
  let strikes = `S: ${data.atBatStrikes}`;
  let outs = `O: ${data.halfInningOuts}`;
  let count = `${balls} ${strikes} ${outs}`;

  $score
    .text(score);
  //$update
    //.text(update);
  $bases
    .text(bases);
  $count
    .text(count);

  $gameEvInfo
    .addClass('col-5')
    .append($score)
    //.append($update)
    .append($bases)
    .append($count);



  $gameEv
    //.val(`${gameEv.hash}`)
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
      gameEvents[gameEv.hash] = gameEv;
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

const initApp = () => {
  const $gameEvForm = $('#game-event-form');

  $gameEvForm.on('submit', (ev) => {
    ev.preventDefault();

    const gameId = $gameEvForm.find('#game-id').val();
    getGameEvents(gameId);
  });

  const $highlightsSelectForm = $('#game-events-select__form');

  $highlightsSelectForm.on('submit', (ev) => {
    ev.preventDefault();
    generateHighlights();
  });

};

initApp();


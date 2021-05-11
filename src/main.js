const gameEventSelector = require('./game-event-selector');
const dialog = require('./dialog');
const visual = require('./visual');
const downloader = require('./downloader');
const teamsData = require('../lib/teams-data');

global.highlights = [];
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
  const hls = getHighlights();

  visual.showVisual(hls.cur.visual);
  visual.updateDiamond(hls);
  dialog.startHighlight(hls);
};

const continueHighlight = () => {
  return dialog.continueHighlight(getHighlights());
};

const playHighlight = () => {
  // do nothing if there's no more highlights
  if (highlights.length === curHighlight) { return };

  // if we're in the intro, start at the first highlight
  //if (intro) {
    //intro = false;
    //$('#intro').addClass('d-none');
    //$('#diamond').removeClass('d-none');

    //nextHighlight();
    //return;
  //}

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

const handleAction = (evt) => {
  if (evt.type === 'keyup' && !(
    evt.keyCode === 32 || // space
    evt.keyCode === 39 || // arrow right
    evt.keyCode === 40    // arrow down
  )) {
    return;
  }

  playHighlight();
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

  // set the diamond colours and add the diamond css
  const homeTeam = teamsData.data[gameEv.homeTeam];
  const $diamond = $('#diamond-svg');
  const $grass = $diamond.find('.grass');
  const $dirt = $diamond.find('.dirt');
  const $neutral = $diamond.find('.neutral');
  const $mound = $diamond.find('.mound');

  $grass.first()
    .attr('fill', `#${homeTeam.colours.grass}`)
    .attr('stroke', `#${homeTeam.colours.grass}`);
  $grass.last()
    .attr('fill', `#${homeTeam.colours.grass}`)
    .attr('stroke', `#${homeTeam.colours.dirtOutline}`);

  $dirt
    .attr('fill', `#${homeTeam.colours.dirt}`)
    .attr('stroke', `#${homeTeam.colours.dirtOutline}`);

  $mound
    .attr('fill', `#${homeTeam.colours.main}`)
    .attr('stroke', `#${homeTeam.colours.dirtOutline}`);

  $neutral
    .attr('fill', `#${homeTeam.colours.neutral}`)
    .attr('stroke', `#${homeTeam.colours.neutral}`);

  $('#diamond__image')
    .css('background-image', 'url(data:image/svg+xml;base64,'+ btoa($diamond.html()) + ')');

  $('.mound-logo').first().attr('src', homeTeam.homeLogoURL);

  nextHighlight();

  // add intro text to dialog
  //$('#highlights-dialog__text-one')
    //.text(`Season ${gameEv.season + 1}, Day ${gameEv.day + 1}. ${gameEv.homeTeamName}`);
  //$('#highlights-dialog__text-two')
    //.text(`vs. the ${gameEv.awayTeamName}.`);
};

const onHighlightsReady = (hls) => {
  highlights = hls;

  setupIntro();

  $(document).on('keyup', handleAction);
  $('#highlights-dialog__container').on('click', handleAction);
};

const initApp = () => {
  const highlightsData = $('#highlights-json').attr('data');

  // skip first steps and go straight to showing the reel if it's a published
  // story
  if (highlightsData.length) {
    onHighlightsReady(JSON.parse(highlightsData));
    //highlights = JSON.parse(highlightsData);
  } else {
    gameEventSelector.init(onHighlightsReady);
    downloader.init();
  }
};

initApp();


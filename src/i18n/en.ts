/** English strings. Every visible text must live here and in es.ts. */
export const en = {
  'meta.title': 'PerfectEye — How accurate is your eye?',
  'meta.description':
    'A free daily game of visual precision: five quick tests, the same for everyone, new every day.',

  'header.home': 'PerfectEye home',
  'header.help': 'How to play',
  'header.stats': 'Statistics',
  'header.toDark': 'Switch to dark mode',
  'header.toLight': 'Switch to light mode',
  'header.language': 'Language',

  'home.title': 'How accurate is your eye?',
  'home.description':
    'Five quick visual precision tests. Everyone gets the same challenge, and a new one arrives every day.',
  'home.challenge': 'Daily challenge #{n}',
  'home.meta': '≈ 3 minutes · no sign-up',
  'home.play': "Play today's challenge",
  'home.continue': "Continue today's challenge",
  'home.results': "See today's results",
  'home.doneToday': 'You scored {score}/500 today.',
  'home.resume': 'You have an unfinished challenge #{n} from yesterday.',
  'home.resumeCta': 'Finish it',
  'home.testsTitle': 'The five tests',
  'home.nextIn': 'Next challenge in',
  'home.resetInfo': 'A new challenge is released every day at 00:00 UTC ({local} your time).',

  'round.center.name': 'Find the Center',
  'round.center.short': 'Center',
  'round.center.summary': 'Tap the exact centre of a circle.',
  'round.center.instructions':
    'Tap where you think the centre of the circle is. Drag to adjust, then confirm.',
  'round.center.board': 'Circle. Tap or use the arrow keys to place your guess for its centre.',
  'round.center.error': 'Off by {pct}% of the radius',

  'round.half.name': 'Perfect Half',
  'round.half.short': 'Half',
  'round.half.summary': 'Mark the exact middle of a line.',
  'round.half.instructions': 'Place the marker at the exact middle of the line, then confirm.',
  'round.half.board': 'Line. Tap or use the arrow keys to move the marker along it.',
  'round.half.error': 'Off by {pct}% of the line length',

  'round.angle.name': 'Angle Master',
  'round.angle.short': 'Angle',
  'round.angle.summary': 'Memorise an angle, then rebuild it.',
  'round.angle.ready': 'An angle will appear for 3 seconds. Memorise how wide it opens.',
  'round.angle.instructions':
    'Rebuild the same opening from the new base line. Drag to rotate the free line.',
  'round.angle.board': 'Angle builder. Drag or use the arrow keys to rotate the free line.',
  'round.angle.error': 'Target {target}° · yours {yours}° · {err}° off',

  'round.distance.name': 'Equal Distance',
  'round.distance.short': 'Distance',
  'round.distance.summary': 'Make BC exactly as long as AB.',
  'round.distance.instructions':
    'Slide point C along its track until the distance B–C equals the distance A–B.',
  'round.distance.board': 'Points A, B and C. Drag or use the arrow keys to slide C.',
  'round.distance.error': 'B–C was {pct}% {dir} than A–B',
  'round.distance.longer': 'longer',
  'round.distance.shorter': 'shorter',

  'round.shape.name': 'Perfect Shape',
  'round.shape.short': 'Shape',
  'round.shape.summary': 'Memorise a triangle, then redraw it.',
  'round.shape.ready': 'A triangle will appear for 5 seconds. Memorise its size and position.',
  'round.shape.instructions':
    'Drag the three points to rebuild the triangle exactly where it was, then confirm.',
  'round.shape.board':
    'Triangle builder. Drag the points, or press 1, 2 or 3 to select a point and move it with the arrow keys.',
  'round.shape.error': 'Average vertex error: {pct}% of the board',

  'game.progress': 'Test {i} of {n}',
  'game.confirm': 'Confirm',
  'game.next': 'Next test',
  'game.finish': 'See results',
  'game.show': 'Show me',
  'game.memorise': 'Memorise it!',
  'game.alreadyShown': 'The figure was already shown. Rebuild it from memory.',
  'game.placeFirst': 'Place your answer on the board to confirm.',
  'game.back': 'Back to home',
  'game.legendYours': 'Your answer',
  'game.legendTarget': 'Correct',
  'game.points': 'points',

  'grade.perfect': 'Perfect!',
  'grade.excellent': 'Excellent',
  'grade.great': 'Great',
  'grade.good': 'Good',
  'grade.ok': 'Not bad',
  'grade.miss': 'Keep practising',

  'results.title': 'Challenge #{n} complete',
  'results.total': 'Total score',
  'results.firstGame': 'Your first PerfectEye! Come back tomorrow to start a streak.',
  'results.newBest': 'New personal best!',
  'results.best': 'Personal best: {best}',
  'results.vsAverage': '{diff} vs your average ({avg})',
  'results.streak': 'Daily streak',
  'results.days': '{n} days',
  'results.day': '{n} day',
  'results.home': 'Back to home',
  'results.disclaimer': 'Just for fun: scores are not a scientific measure of your eyesight.',

  'share.title': 'Share your result',
  'share.native': 'Share…',
  'share.whatsapp': 'WhatsApp',
  'share.x': 'X',
  'share.telegram': 'Telegram',
  'share.copy': 'Copy',
  'share.copied': 'Copied to clipboard!',
  'share.copyFailed': "Couldn't copy automatically. Select the text and copy it.",
  'share.cta': 'Can you beat my score?',
  'share.total': 'TOTAL',

  'stats.title': 'Statistics',
  'stats.played': 'Played',
  'stats.best': 'Best',
  'stats.average': 'Average',
  'stats.streak': 'Streak',
  'stats.maxStreak': 'Max streak',
  'stats.last30': 'Last 30 days',
  'stats.byTest': 'By test',
  'stats.avg': 'avg {v}',
  'stats.bestOf': 'best {v}',
  'stats.empty': "No games yet. Play today's challenge to start your stats.",
  'stats.local':
    'Your stats are stored only in this browser on this device. Clearing your browser data will erase them.',
  'stats.dayScore': '{day}: {score}',
  'stats.dayNone': '{day}: not played',

  'help.title': 'How to play',
  'help.intro':
    'Every day there is one challenge with five visual precision tests. Each test is worth up to 100 points, for a maximum of 500.',
  'help.how':
    'Tap or drag on the board to give your answer, adjust it if you want, and press Confirm. You then see the correct answer and your score.',
  'help.memory':
    'Angle Master and Perfect Shape show their figure only once. Reloading the page will not show it again.',
  'help.daily':
    'Everyone in the world plays the same challenge. It changes every day at 00:00 UTC ({local} your time).',
  'help.scoring':
    'Your score depends only on how far your answer is from the correct one, measured relative to the figure, so it is fair on any screen.',
  'help.privacy':
    'No account needed and no personal data collected. Your progress is saved only in this browser.',
  'help.accessibility':
    'PerfectEye is a visual game, so it cannot be fully played with a screen reader. All boards can be controlled with the keyboard (arrow keys, Shift for fine steps, Enter to confirm).',
  'help.close': 'Close',

  'common.close': 'Close',
  'error.storage':
    "Your browser is blocking local storage, so your progress won't be kept after you close this page.",
  'error.generic': 'Something went wrong. Please reload the page.',
  'error.reload': 'Reload',
  'footer.note': 'Just for fun — not a scientific test of eyesight. No account, no tracking.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

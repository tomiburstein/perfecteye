import type { Messages } from './en';

export const es: Messages = {
  'meta.title': 'PerfectEye — ¿Qué tan preciso es tu ojo?',
  'meta.description':
    'Un juego diario y gratuito de precisión visual: cinco pruebas rápidas, iguales para todos, nuevas cada día.',

  'header.home': 'Inicio de PerfectEye',
  'header.help': 'Cómo se juega',
  'header.stats': 'Estadísticas',
  'header.toDark': 'Cambiar a modo oscuro',
  'header.toLight': 'Cambiar a modo claro',
  'header.language': 'Idioma',

  'home.title': '¿Qué tan preciso es tu ojo?',
  'home.description':
    'Cinco pruebas rápidas de precisión visual. Todos reciben el mismo desafío, y cada día llega uno nuevo.',
  'home.challenge': 'Desafío diario #{n}',
  'home.meta': 'unos 3 minutos, sin registro',
  'home.note': 'Hoy todos juegan el mismo',
  'home.play': 'Jugar el desafío de hoy',
  'home.continue': 'Continuar el desafío de hoy',
  'home.results': 'Ver los resultados de hoy',
  'home.doneToday': 'Hoy obtuviste {score}/500.',
  'home.resume': 'Tienes el desafío #{n} de ayer sin terminar.',
  'home.resumeCta': 'Terminarlo',
  'home.testsTitle': 'Las cinco pruebas',
  'home.nextIn': 'Próximo desafío en',
  'home.resetInfo': 'Cada día se publica un desafío nuevo a las 00:00 UTC ({local} en tu hora).',

  'round.center.name': 'Encuentra el centro',
  'round.center.short': 'Centro',
  'round.center.summary': 'Toca el centro exacto de un círculo.',
  'round.center.instructions':
    'Toca donde creas que está el centro del círculo. Arrastra para ajustar y luego confirma.',
  'round.center.board':
    'Círculo. Toca o usa las flechas del teclado para marcar dónde crees que está el centro.',
  'round.center.error': 'Desvío del {pct}% del radio',

  'round.half.name': 'La mitad perfecta',
  'round.half.short': 'Mitad',
  'round.half.summary': 'Marca la mitad exacta de una línea.',
  'round.half.instructions': 'Coloca el marcador en la mitad exacta de la línea y luego confirma.',
  'round.half.board': 'Línea. Toca o usa las flechas del teclado para mover el marcador.',
  'round.half.error': 'Desvío del {pct}% del largo de la línea',

  'round.angle.name': 'Maestro del ángulo',
  'round.angle.short': 'Ángulo',
  'round.angle.summary': 'Memoriza un ángulo y reconstrúyelo.',
  'round.angle.ready': 'Verás un ángulo 3 segundos. Memoriza cuánto se abre.',
  'round.angle.instructions':
    'Reproduce la misma apertura desde la nueva línea base. Arrastra para girar la línea.',
  'round.angle.board':
    'Constructor de ángulos. Arrastra o usa las flechas del teclado para girar la línea libre.',
  'round.angle.error': 'Objetivo {target}° · el tuyo {yours}° · {err}° de error',

  'round.distance.name': 'Distancia igual',
  'round.distance.short': 'Distancia',
  'round.distance.summary': 'Haz que BC mida exactamente lo mismo que AB.',
  'round.distance.instructions':
    'Desliza el punto C por su guía hasta que B–C mida lo mismo que A–B.',
  'round.distance.board':
    'Puntos A, B y C. Arrastra o usa las flechas del teclado para deslizar C.',
  'round.distance.error': 'B–C quedó un {pct}% más {dir} que A–B',
  'round.distance.longer': 'larga',
  'round.distance.shorter': 'corta',

  'round.shape.name': 'La forma perfecta',
  'round.shape.short': 'Forma',
  'round.shape.summary': 'Memoriza un triángulo y vuelve a dibujarlo.',
  'round.shape.ready': 'Verás un triángulo 5 segundos. Memoriza su tamaño y posición.',
  'round.shape.instructions':
    'Arrastra los tres puntos para reconstruir el triángulo donde estaba y confirma.',
  'round.shape.board':
    'Constructor de triángulos. Arrastra los puntos, o pulsa 1, 2 o 3 para elegir un punto y muévelo con las flechas.',
  'round.shape.error': 'Error medio por vértice: {pct}% del tablero',

  'game.progress': 'Prueba {i} de {n}',
  'game.confirm': 'Confirmar',
  'game.next': 'Siguiente prueba',
  'game.finish': 'Ver resultados',
  'game.show': 'Mostrar',
  'game.memorise': '¡Memorízalo!',
  'game.alreadyShown': 'La figura ya se mostró. Reconstrúyela de memoria.',
  'game.placeFirst': 'Marca tu respuesta en el tablero para poder confirmar.',
  'game.back': 'Volver al inicio',
  'game.legendYours': 'Tu respuesta',
  'game.legendTarget': 'Correcto',
  'game.points': 'puntos',
  'game.keys': 'Teclado: flechas para ajustar · Mayús + flechas para pasos mínimos · Enter para confirmar',
  'game.keysShape': 'Teclado: 1, 2, 3 elige un punto · flechas lo mueven · Mayús para pasos mínimos · Enter para confirmar',
  'game.keysAngle': 'Teclado: flechas giran la línea · Mayús para décimas de grado · Enter para confirmar',

  'grade.perfect': '¡Perfecto!',
  'grade.excellent': 'Excelente',
  'grade.great': 'Muy bien',
  'grade.good': 'Bien',
  'grade.ok': 'Nada mal',
  'grade.miss': 'Sigue practicando',

  'results.title': 'Desafío #{n} completado',
  'results.total': 'Puntuación total',
  'results.firstGame': '¡Tu primer PerfectEye! Vuelve mañana para empezar una racha.',
  'results.newBest': '¡Nuevo récord personal!',
  'results.best': 'Récord personal: {best}',
  'results.vsAverage': '{diff} respecto a tu promedio ({avg})',
  'results.streak': 'Racha diaria',
  'results.days': '{n} días',
  'results.day': '{n} día',
  'results.home': 'Volver al inicio',
  'results.disclaimer':
    'Es solo un juego: la puntuación no es una medida científica de tu capacidad visual.',

  'share.title': 'Comparte tu resultado',
  'share.native': 'Compartir…',
  'share.whatsapp': 'WhatsApp',
  'share.x': 'X',
  'share.telegram': 'Telegram',
  'share.copy': 'Copiar',
  'share.copied': '¡Copiado al portapapeles!',
  'share.copyFailed': 'No se pudo copiar automáticamente. Selecciona el texto y cópialo.',
  'share.cta': '¿Puedes superarme?',
  'share.total': 'TOTAL',

  'stats.title': 'Estadísticas',
  'stats.played': 'Partidas',
  'stats.best': 'Mejor',
  'stats.average': 'Promedio',
  'stats.streak': 'Racha',
  'stats.maxStreak': 'Racha máx.',
  'stats.last30': 'Últimos 30 días',
  'stats.byTest': 'Por prueba',
  'stats.avg': 'prom. {v}',
  'stats.bestOf': 'mejor {v}',
  'stats.empty': 'Todavía no hay partidas. Juega el desafío de hoy para empezar tus estadísticas.',
  'stats.local':
    'Tus estadísticas se guardan solo en este navegador y en este dispositivo. Si borras los datos del navegador, se perderán.',
  'stats.dayScore': '{day}: {score}',
  'stats.dayNone': '{day}: sin jugar',

  'help.title': 'Cómo se juega',
  'help.intro':
    'Cada día hay un desafío con cinco pruebas de precisión visual. Cada prueba vale hasta 100 puntos, con un máximo de 500.',
  'help.how':
    'Toca o arrastra en el tablero para dar tu respuesta, ajústala si quieres y pulsa Confirmar. Luego verás la respuesta correcta y tu puntuación.',
  'help.memory':
    'Maestro del ángulo y La forma perfecta muestran su figura una sola vez. Recargar la página no la vuelve a mostrar.',
  'help.daily':
    'Todo el mundo juega el mismo desafío. Cambia cada día a las 00:00 UTC ({local} en tu hora).',
  'help.scoring':
    'Tu puntuación depende solo de cuánto se aleja tu respuesta de la correcta, medido en relación con la figura, así que es justa en cualquier pantalla.',
  'help.privacy':
    'No necesitas cuenta y no se recopilan datos personales. Tu progreso se guarda solo en este navegador.',
  'help.accessibility':
    'PerfectEye es un juego visual, por lo que no se puede jugar por completo con un lector de pantalla. Todos los tableros se pueden controlar con el teclado (flechas, Mayús para pasos finos, Enter para confirmar).',
  'help.close': 'Cerrar',

  'common.close': 'Cerrar',
  'error.storage':
    'Tu navegador está bloqueando el almacenamiento local, así que tu progreso no se conservará al cerrar esta página.',
  'error.generic': 'Algo salió mal. Por favor, recarga la página.',
  'error.reload': 'Recargar',
  'footer.note': 'Solo por diversión: no es un test científico de la vista. Sin cuentas, sin rastreo.',
};

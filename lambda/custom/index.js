/* eslint-disable  func-names */
/* eslint-disable  no-console */

/**
 * @name skill-raccolta-differenziata-lodi-vecchio
 * @author Caldi Gianfranco
 * @version 1.0.0
 * 
 * @see per il glossario rifiuti vedere http://www.linea-gestioni.it/it/glossario-rifiuti
 */

const Alexa = require('ask-sdk-core');
// const dayjs = require('dayjs');
// const dayjs_it = require('dayjs/locale/it');
const moment = require('moment-timezone');

const CARD_TITLE = 'Raccolta differenziata Lodi Vecchio',
  DAY_OF_WEEK = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
  DATE_FORMAT = 'YYYY-MM-DD',
  DATE_LONG_FORMAT = 'dddd, D MMMM',
  // data = require('data.json'),
  destinations = require('destinations.json'),
  calendar = require('calendar.json'),
  rcalendar = reveserCalendar()
  // , rgParticles = /\b(a|il|lo|la|l'|i|gli|le|un|uno|una|un'|di|del|della|dell'|delle|degli|al|in|da|per|\d+)\b/g
  ;
// tutti gli articoli con indicazione [P]lurarle, [S]ingolare
const ARTICLES = {
  "l": "S", // l con apostrofo
  "lo": "S",
  "la": "S",
  "il": "S",
  "un": "S",
  "uno": "S",
  "una": "S",
  "i": "P",
  "gli": "P",
  "le": "P"
};
/**
* 
* @param {Object} slot slot da cui estrarre il valore
* @param {Any} def valore di default nel caso lo slot non ne contenga
* @returns valore dello slot o def se non ne contiene (compreso null e undefined)
*/
function getSlotValue(slot, def) {
  if (!slot) return def;
  if (slot.value === undefined || slot.value === null) return def;
  return slot.value;
}

/**
 * 
 * @param {Object} filledSlots così come restituito da intent.slots
 * @returns ritorna un oggetto le cui proprietà sono i nomi degli slot, 
 *  e valorizzate con {id, resolved, synonym, isValidated}
 */
function getSlotValues(filledSlots) {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const name = filledSlots[item].name;

    if (filledSlots[item] &&
      filledSlots[item].resolutions &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
      filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            id: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.id,
            isValidated: true,
          };
          break;
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            synonym: filledSlots[item].value,
            resolved: filledSlots[item].value,
            id: null,
            isValidated: false,
          };
          break;
        default:
          break;
      }
    } else {
      slotValues[name] = {
        synonym: filledSlots[item].value,
        resolved: filledSlots[item].value,
        id: null,
        isValidated: false,
      };
    }
  }, this);
  console.log(`Slot values: ${JSON.stringify(slotValues)}`);
  return slotValues;
}

// /**
//  * Cerca un materiale da differenziare e ne ritorna la destinazione.
//  * TODO: ritornare un costrutto non formattato, in modo che possa essere poi formattato per la card o lo speaker
//  * 
//  * @param {String} query frase di ricerca
//  * @returns la frase in output già formattata per lo speaker
//  */
// function findWhere(query) {
//   if (query) {
//     // normalizzo la query
//     // - elimino le particelle grammaticali
//     // - elimino gli spazi multipli
//     // - trim
//     // TODO: sostituire lettere accentate? (anche in data.json)
//     // TODO: come gestire singolare/plurale? barattolo/barattoli
//     const normalizedQuery = query
//       .replace(rgParticles, '')
//       .replace(/\s{2,}/g, ' ')
//       .trim();
//     let resp;
//     if (data[normalizedQuery]) {
//       resp = [data[normalizedQuery]];
//     } /* else {
//       NO! questo metodo può generare dei falsi (es "sacchetti di patatine" => "patatine" => "umido")
//       // se non trovo la query provo a cercare le singole parole
//       // TODO: concatenare meglio le risposte
//       resp = normalizedQuery
//         .split(/\s+/)
//         .map(w => data[w])
//         .filter(r => r);
//     } */
//     if (resp.length > 0) {
//       resp = resp.reduce((m, p) => {
//         if (typeof (p) === 'string') {
//           // se è una stringa allora è una chiave destinazione
//           m[m.length] = destinations[p];
//         } else {
//           // altrimenti è un oggetto le cui chiavi si riferiscono alla destinazione
//           //  e il valore descrive una variante del rifiuto cercato
//           //  per ogni variante compongo la frase "<destinazione>, per <variante>"
//           //  es: "carta e cartone, per le vaschette di cartone per uova"
//           Object.keys(p).reduce((m, k) => {
//             m[m.length] = `${destinations[k]}, per ${p[k]}`;
//             return m;
//           }, m);
//         }
//         return m;
//       }, []);
//       if (resp.length === 1) {
//         return resp[0];
//       } else {
//         return resp.map(r => `<s>${r}</s>`).join(' ');
//       }
//     } else {
//       // return `DEBUG: ${query} => ${normalizedQuery}`;
//       return destinations['?'];
//     }
//   } else {
//     return 'Non mi hai chiesto nulla.';
//   }
// }

/**
 * 
 * @param {Strign} idGarbage id rifiuto
 * @param {String} garbage frase pronunciata dall'utente
 * @returns la frase in output già formattata per lo speaker
 */
function findWhere(idGarbage, garbage) {
  const dest = destinations[idGarbage];
  const sp = /^[i|gli|le]\s+/.test(garbage) ? 'vanno' : 'va';
  console.log("WHERE", idGarbage, sp, JSON.stringify(dest));
  if (dest) {
    return `${garbage} ${sp} ${dest.where}`;
  } else {
    return `Mi spiace, non so dove buttare ${garbage}, prova a conttatare il comune`;
  }
}

/**
 * Dato il codice materiale ritorna il giorno di ritiro.
 * 
 * @param {String} idMaterial vedi chiavi in destinations.json
 * @returns la frase in output già formattata per lo speaker
 */
function findWhen(idMaterial) {
  const today = moment();
  const stoday = today.format(DATE_FORMAT);
  const stomorrow = moment().add(1, 'days').format(DATE_FORMAT);
  const dates = calendar[idMaterial];
  if (dates && dates.length > 0) {
    // cerco una data di ritiro maggiore o uguale a oggi/domani (in base all'ora)
    // TODO: recuperare la timezone 
    //  https://developer.amazon.com/docs/smapi/alexa-settings-api-reference.html#request
    //  access token e device id sono in handlerInput.requestEnvelope
    const refdate = today.tz('Europe/Rome').hour() > 6 ? stomorrow : stoday;
    const found = dates.find(d => d >= refdate);
    console.log('WHEN hh', today.tz('Europe/Rome').hour(),
      'ref', refdate,
      'found', found);
    if (found) {
      if (found === stoday) {
        return 'Il ritiro è previsto per oggi, entro le ore sei del mattino.';
      } else if (found === stomorrow) {
        return 'Il ritiro è previsto per domani.';
      } else {
        return `Il ritiro è previsto per
          ${moment(found).locale('it').format(DATE_LONG_FORMAT)}`;
      }
    } else {
      // il materiale è censito, ma non sono state trovate date utili
      return `Non sono state trovate date utili per il ritiro del materiale indicato,
        per maggiori informazioni contattare il comune.`;
    }
  }
  return `Non è previsto alcun ritiro per il materiale indicato, 
    contattare il comune per maggiori informazioni.`;
}

/**
 * ELenca i materiali ritirati nei giorni in input.
 * 
 * @param {Array<String>} dates array di date nel formato YYYY-MM-DD
 * @returns la frase in output già formattata per lo speaker
 */
function findWhat(dates) {
  let materials;
  let output = '';
  for (let ii = 0; ii < dates.length; ii++) {
    materials = rcalendar[dates[ii]];
    if (materials) {
      output += '<s>' + moment(dates[ii]).locale('it').format(DATE_LONG_FORMAT) + ', ritirano ';
      output += speakJoin(materials.map(m => destinations[m].what));
      output += '</s>';
    }
  }
  return output || 'Non è previsto alcun ritiro';
  // return dates.map(d => `${moment(d).locale('it').format(DATE_LONG_FORMAT)}`).join(', ');
}

/**
 * Analzza la stringa in input e ne ricava un elenco di date.
 * 
 * I formati riconosciuti sono:
 * - YYYY-MM-DD
 * - YYYY-W<numero settimana>
 * - YYYY-W<numero settimana>-WE (weekend)
 * - giorni della settimana
 * 
 * La settimana parte da lunedì.
 * 
 * @param {String} sdate data da analizzare
 * @returns {Array<String>} un array di date nel formato YYYY-MM-DD oppure null se il formato non è valido 
 */
function parseDateString(sdate) {
  const dayOfWeek = DAY_OF_WEEK.indexOf(sdate);
  if (dayOfWeek >= 0) {
    return [nextDay(moment(), dayOfWeek).format(DATE_FORMAT)];
  } else if (/^\d{4}-W\d{1,2}-WE$/.test(sdate)) {
    // il formato YYYY-Www ritorna un lunedì
    const date = moment(sdate.substr(0, 8));
    // ritorno il sabato e la domenica
    return [date.weekday(6).format(DATE_FORMAT),
    date.add(1, 'days').format(DATE_FORMAT)];
  } else if (/^\d{4}-W\d{1,2}$/.test(sdate)) {
    // il formato YYYY-Www ritorna un lunedì
    const date = moment(sdate);
    // ritorno dal lunedì a domenica
    return [date.format(DATE_FORMAT), 0, 0, 0, 0, 0, 0]
      .map(v => v || date.add(1, 'days').format(DATE_FORMAT));
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(sdate)) {
    // mi fido che il formato YYYY-MM-DD sia corretto
    return [sdate];
  } else {
    return null;
  }
}

/**
 * Ritorna mdate se il giorno della settimana corrisponde con dayOfWeek,
 * oppure il prossimo giorno con quel dayOfWeek.
 * 
 * @param {Moment} mdate istanza di moment da cui partire
 * @param {Number} dayOfWeek indice del giorno della settimana (domencia = 0)
 * @returns mdate (aggiornata)
 */
function nextDay(mdate, dayOfWeek) {
  // sono a domenica 0 e voglio martedì 0 + 2
  // sono a lunedì 1 e voglio martedì 2 - 1
  // sono a sabato 6 e voglio martedì 7 - 6 + 2
  // sono a venerdì 5 e voglio martedì 7 - 5 + 2

  const curDayOfWeek = mdate.day();
  if (curDayOfWeek === dayOfWeek) {
    return mdate;
  } else if (curDayOfWeek < dayOfWeek) {
    return mdate.add(dayOfWeek - curDayOfWeek, 'days');
  } else {
    return mdate.add(7 - curDayOfWeek + dayOfWeek, 'days');
  }
}

/**
 * Converte il formato <speak> in uno più adatto alla resa su schermo.
 * Quindi niente tag.
 * 
 * @param {String} speak stringa formattata per il sintetizzatore vocale
 * @returns stringa adatta alla stampa a schermo
 */
function speakToCard(speak) {
  // TODO: convertire speak a card
  return speak;
}

function speakJoin(phrases) {
  if (phrases.length === 1) {
    return phrases[0];
  } else {
    const tokens = [...phrases];
    const last = tokens.splice(-1);
    return tokens.join(', ') + ' e ' + last;
  }
}

function reveserCalendar() {
  return Object.keys(calendar).reduce((m, k) => {
    return calendar[k].reduce((m, d) => {
      (m[d] || (m[d] = [])).push(k);
      return m;
    }, m);
  }, {});
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = `Benvenuto. Puoi chiedermi ad esempio: 
      <s>dove devo buttare il sacchetto delle patatine?</s>`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard(CARD_TITLE, speechText)
      .getResponse();
  },
};

/**
 * Slots:
 * - {query} frase di ricerca
 */
const WhereIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'WhereIntent';
  },
  handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
    const slotValues = getSlotValues(filledSlots);
    let speechText;
    // se garbage è valorizzato allora proseguo con l'elaborazione
    //  altrimenti richiedo all'utente di indicare il nome del rifiuto
    if (slotValues.garbage && slotValues.garbage.id) {
      speechText = findWhere(slotValues.garbage.id,
        slotValues.garbage.synonym);
      // speechText = `Hai detto: ${slotValues.garbage.resolved}, ${slotValues.garbage.synonym} => ${slotValues.garbage.id}`;
    } else {
      speechText = 'Cosa vuoi buttare?';
      // TODO: va in errore, provare a rimettere in model prompt
      responseBuilder.addElicitSlotDirective('garbage');
    }
    console.log('*** response:', speechText);
    return responseBuilder
      .speak(speechText)
      .withSimpleCard(CARD_TITLE, speakToCard(speechText))
      .getResponse();
  },
};

/**
 * Intenet per conoscere le date di ritiro di una certa tipologia di rifiuti.
 * 
 * Slots:
 * - {article} articolo, non utilizzato
 * - {material} tipologia del rifiuto
 */
const WhenIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'WhenIntent';
  },
  handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
    const slotValues = getSlotValues(filledSlots);
    let speechText;
    if (slotValues.material && slotValues.material.id) {
      speechText = findWhen(slotValues.material.id);
    } else {
      speechText = 'Ripeti la tipologia dei rifiuti per favore.';
      responseBuilder.addElicitSlotDirective('material');
    }
    return responseBuilder
      .speak(speechText)
      .withSimpleCard(CARD_TITLE, speakToCard(speechText))
      .getResponse();
  }
}

/**
 * Intent per conoscere cosa viene ritirano un particolare giorno.
 * 
 * Slots:
 * - {date} nel formato YYYY-MM-DD, YYYY-W<numero settimana>, YYYY-W<numero settimana>-WE
 * - {dayOfWeek}  giorni della settimana
 */
const WhatIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'WhatIntent';
  },
  handle(handlerInput) {
    const responseBuilder = handlerInput.responseBuilder;
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
    const slotValues = getSlotValues(filledSlots);
    let speechText;

    // data -> date YYYY-MM-DD
    // domani -> date YYYY-MM-DD
    // questa maggina -> date YYYY-MM-DD
    // prossimo <giorno settimana> -> date YYYY-MM-DD
    // dopo domani -> non riconosciuto
    // primo <mese> -> date YYYY-MM-01
    // questa settimana -> date YYYY-W<numero settimana>
    // settimana prossima -> date YYYY-W<numero settimana>
    // prossima settimana -> date YYYY-W<numero settimana>
    // questo fine settimana -> date 2018-W<numero settimana>-WE
    // giorno settimana -> dayOfWeek (lunedì, martedì, etc.)

    // TODO: prossimo <giorno settimana> non funziona bene
    //  se oggi è domenica "la prossima domenica" ritorna oggi

    // TODO: prevedere "fra n giorni"

    let date = (slotValues.date && slotValues.date.resolved) ||
      (slotValues.dayOfWeek && slotValues.dayOfWeek.resolved);
    if (date && (date = parseDateString(date))) {
      speechText = findWhat(date);
    } else {
      speechText = 'Ripeti la data per favore.';
      responseBuilder.addElicitSlotDirective('date');
    }
    return responseBuilder
      .speak(speechText)
      .withSimpleCard(CARD_TITLE, speakToCard(speechText))
      .getResponse();
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Puoi chiedermi dove si possono riciclare le lattine';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard(CARD_TITLE, speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Arrivederci!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard(CARD_TITLE, speechText)
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Scusa, non ho capito.')
      .reprompt('Scusa, non ho capito.')
      .withSimpleCard('ERROR', error.message)
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    WhereIntent,
    WhenIntent,
    WhatIntent,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

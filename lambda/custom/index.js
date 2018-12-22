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
const moment = require('moment-timezone');
const { createSessionHelper,
  getSlotValues,
  humanJoin,
  log,
  OUT_SPEAKER,
  OUT_CARD,
  COMPOSER } = require('./utility.js');

const CARD_TITLE = 'Raccolta differenziata Lodi Vecchio',
  DAY_OF_WEEK = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
  DATE_FORMAT = 'YYYY-MM-DD',
  DATE_LONG_FORMAT = 'dddd, D MMMM',
  MATERIALS = require('./materials.json'),
  CALENDAR = require('./calendar.json'),
  RCALENDAR = reveserCalendar(),
  rgPlural = /^(i|gli|le)$/i,
  // ora in cui viene ritirata la spazzatura
  TRASH_COLLECTION_HOUR = 6,
  // fuso orario italia
  // TODO: recuperare la timezone 
  //  https://developer.amazon.com/docs/smapi/alexa-settings-api-reference.html#request
  //  access token e device id sono in handlerInput.requestEnvelope
  TIMEZONE = 'Europe/Rome';

/**
 * 
 * @param {Strign} idGarbage id rifiuto
 * @param {String} article  particella articolo
 * @param {String} garbage frase pronunciata dall'utente
 * @param {OUT_SPEAKER|OUT_CARD} outDest  destinazione
 * @returns la frase in output già formattata in base alla destinazione
 */
function execWhere(idGarbage, article, garbage, outDest) {
  const C = COMPOSER[outDest];
  const dest = MATERIALS[idGarbage];
  const sp = rgPlural.test(article) ? 'vanno' : 'va';
  log('WHERE', idGarbage, article, garbage, sp, JSON.stringify(dest));
  if (dest) {
    return C.phrase(`${article} ${garbage} ${sp} ${dest.where}`);
  } else {
    return C.phrase(`Mi spiace, non so dove buttare ${article} ${garbage}, prova a conttatare il comune`);
  }
}

/**
 * Dato il codice materiale ritorna il giorno di ritiro.
 * 
 * @param {String} idMaterial vedi chiavi in materials.json
 * @param {OUT_SPEAKER|OUT_CARD} outDest  destinazione
 * @returns la frase in output già formattata in base alla destinazione
 */
function execWhen(idMaterial, outDest) {
  const C = COMPOSER[outDest];
  const today = moment();
  const stoday = today.format(DATE_FORMAT);
  const stomorrow = moment().add(1, 'days').format(DATE_FORMAT);
  const material = MATERIALS[idMaterial];
  const dates = CALENDAR[idMaterial];
  if (dates && dates.length > 0) {
    // cerco una data di ritiro maggiore o uguale a oggi/domani (in base all'ora)
    const refdate = today.tz(TIMEZONE).hour() > TRASH_COLLECTION_HOUR ? stomorrow : stoday;
    const found = dates.find(d => d >= refdate);
    log('WHEN hh', today.tz(TIMEZONE).hour(),
      'ref', refdate,
      'found', found);
    if (found) {
      if (found === stoday) {
        return C.phrase(`Il prossimo ritiro ${material.when} è previsto per oggi, entro le ore sei del mattino`);
      } else if (found === stomorrow) {
        return C.phrase(`Il prossimo ritiro ${material.when} è previsto per domani`);
      } else {
        return C.phrase(`Il prossimo ritiro ${material.when} è previsto per
          ${moment(found).locale('it').format(DATE_LONG_FORMAT)}`);
      }
    } else {
      // il materiale è censito, ma non sono state trovate date utili
      return C.phrase(`Non sono state trovate date utili per il ritiro del materiale indicato,
        per maggiori informazioni contattare il comune.`);
    }
  }
  if (material && material.help) {
    return C.phrase('Non è previsto alcun ritiro.', ...material.help);
  } else {
    return C.phrase(`Non è previsto alcun ritiro per il materiale indicato, 
      contattare il comune per maggiori informazioni.`);
  }
}

/**
 * ELenca i materiali ritirati nei giorni in input.
 * 
 * @param {Array<String>} dates array di date nel formato YYYY-MM-DD
 * @param {OUT_SPEAKER|OUT_CARD} outDest  destinazione 
 * @returns la frase in output già formattata in base alla destinazione
 */
function execWhat(dates, outDest) {
  const C = COMPOSER[outDest];
  const today = moment();
  const stoday = today.format(DATE_FORMAT);
  const stomorrow = moment().add(1, 'days').format(DATE_FORMAT);
  let materialsPerDate;
  let output = '';
  let sayRemember = Math.random() >= .5;
  for (let ii = 0; ii < dates.length; ii++) {
    materialsPerDate = RCALENDAR[dates[ii]];
    log('WHAT', dates[ii], materialsPerDate);
    if (materialsPerDate) {
      if (dates[ii] === stoday) {
        if (today.tz(TIMEZONE).hour() > TRASH_COLLECTION_HOUR) {
          sayRemember = true;
        }
        output += C.list(`Oggi ritirano ${humanJoin(materialsPerDate.map(m => MATERIALS[m].what), 'e')}`);
      } else if (dates[ii] === stomorrow) {
        output += C.list(`Domani, ${moment(dates[ii]).locale('it').format(DATE_LONG_FORMAT)},
          ritirano ${humanJoin(materialsPerDate.map(m => MATERIALS[m].what), 'e')}`);
      } else {
        output += C.list(`${moment(dates[ii]).locale('it').format(DATE_LONG_FORMAT)},
          ritirano ${humanJoin(materialsPerDate.map(m => MATERIALS[m].what), 'e')}`);
      }
    }
  }
  if (output) {
    if (sayRemember) {
      output + C.phrase('Ricordati che devi esporre i rifiuti entro le ore sei');
    }
  } else {
    if (dates.length === 1) {
      if (dates[0] === stoday) {
        output = C.phrase('Per oggi non è previsto alcun ritiro');
      } else if (dates[0] === stomorrow) {
        output = C.phrase('Per domani non è previsto alcun ritiro');
      } else {
        output = C.phrase(`${moment(dates[0]).locale('it').format(DATE_LONG_FORMAT)}, 
          non è previsto alcun ritiro`);
      }
    } else {
      output = C.phrase('Per il periodo indicato, non è previsto alcun ritiro');
    }
  }
  return output;
}

/**
 * Dato il codice materiale ne ritorna le informazioni.
 * 
 * @param {String} idMaterial vedi chiavi in materials.json
 * @param {OUT_SPEAKER|OUT_CARD} outDest  destinazione
 * @returns la frase in output già formattata in base alla destinazione
 */
function execInfo(idMaterial, outDest) {
  const C = COMPOSER[outDest];
  const material = MATERIALS[idMaterial];
  log('INFO', idMaterial, material);
  let output = '';
  if (material) {
    if (material.samples) {
      output += C.phrase(`Ecco alcuni esempi di rifiuti per la tipologia ${material.name}:`);
      output = material.samples.reduce((m, p) => {
        return m += C.phrase(p);
      }, output);
      output += C.break(250);
    }
    if (material.help) {
      output += C.phrase(...material.help);
    }
  }
  return output ||
    C.phrase(`Mi spiace, non ho informazioni su questa tipologia di rifiuti.`);
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
    return [nextDay(dayOfWeek).format(DATE_FORMAT)];
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
function nextDay(dayOfWeek) {
  const today = moment();
  const curDayOfWeek = today.day();
  if (curDayOfWeek === dayOfWeek) {
    if (today.tz(TIMEZONE).hour() > TRASH_COLLECTION_HOUR) {
      return today.add(7, 'days');
    } else {
      return today;
    }
  } else if (curDayOfWeek < dayOfWeek) {
    return today.add(dayOfWeek - curDayOfWeek, 'days');
  } else {
    return today.add(7 - curDayOfWeek + dayOfWeek, 'days');
  }
}

function reveserCalendar() {
  return Object.keys(CALENDAR).reduce((m, k) => {
    return CALENDAR[k].reduce((m, d) => {
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
    const C = COMPOSER[OUT_SPEAKER];
    return handlerInput.responseBuilder
      .speak(C.phrase(`Benvenuto in raccolta differenziata Lodi Vecchio,
              cosa vuoi sapere?`))
      .reprompt('Per scoprire tutte le funzionalità di questa skill, prova a chiedere aiuto!')
      .withShouldEndSession(false)
      .getResponse();
  },
};

/**
 * Slots:
 * - {article} particella articolo
 * - {garbage} rifiuto
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
    // se garbage è valorizzato allora proseguo con l'elaborazione
    //  altrimenti richiedo all'utente di indicare il nome del rifiuto
    if (slotValues.garbage && slotValues.garbage.id) {
      responseBuilder
        .speak(execWhere(slotValues.garbage.id,
          (slotValues.article && slotValues.article.isValidated && slotValues.article.synonym) || '',
          slotValues.garbage.synonym, OUT_SPEAKER))
        /* .withSimpleCard(CARD_TITLE, execWhere(slotValues.garbage.id,
          (slotValues.article && slotValues.article.isValidated && slotValues.article.synonym) || '',
          slotValues.garbage.synonym, OUT_CARD)) */;
    } else {
      log('WHERE repeat');
      responseBuilder
        .speak('Quale rifiuto?')
        .withShouldEndSession(false)
        .addElicitSlotDirective('garbage');
    }
    return responseBuilder
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
    if (slotValues.material && slotValues.material.id) {
      responseBuilder
        .speak(execWhen(slotValues.material.id, OUT_SPEAKER))
        /* .withSimpleCard(CARD_TITLE, execWhen(slotValues.material.id, OUT_CARD)) */;
    } else {
      log('WHEN repeat');
      responseBuilder
        .speak('Quale tipologia di rifiuti?')
        .addElicitSlotDirective('material')
        .withShouldEndSession(false);
    }
    return responseBuilder
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

    // TODO: prevedere "fra n giorni"

    let date = (slotValues.date && slotValues.date.resolved) ||
      (slotValues.dayOfWeek && slotValues.dayOfWeek.resolved);
    if (date && (date = parseDateString(date))) {
      responseBuilder.speak(execWhat(date, OUT_SPEAKER))
        /* .withSimpleCard(CARD_TITLE, execWhat(date, OUT_CARD)) */;
    } else {
      log('WHAT repeat');
      responseBuilder.speak('Quando?')
        .addElicitSlotDirective('date')
        .withShouldEndSession(false);
    }
    return responseBuilder
      .getResponse();
  }
}

/**
 * Intenet per chiedere informazioni sulla tipologia di un rifiuto.
 * 
 * Slots:
 * - {article} articolo, non utilizzato
 * - {preposition} preposizione, non utilizzato
 * - {material} tipologia del rifiuto
 */
const InfoIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'InfoIntent';
  },
  handle(handlerInput) {
    const attr = createSessionHelper(handlerInput);
    const responseBuilder = handlerInput.responseBuilder;
    const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
    const slotValues = getSlotValues(filledSlots);
    if (slotValues.material && slotValues.material.id) {
      responseBuilder
        .speak(execInfo(slotValues.material.id, OUT_SPEAKER))
        /* .withSimpleCard(CARD_TITLE, execInfo(slotValues.material.id, OUT_CARD)) */;
    } else {
      log('INFO repeat');
      if (!attr.get('count')) {
        attr.set('count', 1);
        responseBuilder
          .speak('Quale tipologia di rifiuti?')
          .reprompt(`Puoi chiedere informazioni su queste tipologie di rifiuti: 
            umido, secco, plastica, carta, vetro, pile o farmaci.`)
          .withShouldEndSession(false);
      } else {
        attr.set('count', 0);
        responseBuilder
          .speak(`Puoi chiedere informazioni su queste tipologie di rifiuti: 
            umido, secco, plastica, carta, vetro, pile o farmaci.`)
          .withShouldEndSession(false);
      }
      responseBuilder.addElicitSlotDirective('material');
    }
    return responseBuilder
      .getResponse();
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = `Ad esempio mi puoi chiedere:
      <s>dove si buttano le lattine?</s>
      oppure
      <s>quando ritirano la plastica?</s>
      o ancora
      <s>cosa butto nell'umido?</s>
      e infine
      <s>cosa ritirano domani? (ma puoi anche indicare una data precisa, ad esempio 24 dicembre)</s>`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
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
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Scusa, non ho capito.')
      .reprompt('Scusa, non ho capito.')
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
    InfoIntent,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

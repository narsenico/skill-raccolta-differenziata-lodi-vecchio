/* eslint-disable  func-names */
/* eslint-disable  no-console */

const CAN_LOG = !process.env.NO_DEBUG;

/**
 * Crea un helper per gestire gli attributi di sessione.
 * Ritorna un oggetto con i metodi get, set, del.
 * 
 * @param {HandlerInput} handlerInput
 * @returns helper
 */
function createSessionHelper(handlerInput) {
    const manager = handlerInput.attributesManager;
    const attributes = manager.getSessionAttributes() || {};
    return {
        /**
         * Se l'attributo non è trovato, 
         * viene creato con il valore def specificato (ma non salvato in sessione).
         * 
         * @param {String} name nome dell'attributo
         * @param {Any} def valore di default
         * @returns il valore dell'attributo oppure def se non trovato
         */
        get(name, def) {
            if (attributes[name] === undefined) {
                attributes[name] = def;
            }
            return attributes[name];
        },
        /**
         * Ad ogni chiamata tutti gli attributi vengono salvati in sessione.
         * 
         * @param {String} name nome dell'attributo
         * @param {Any} value valore dell'attributo
         */
        set(name, value) {
            attributes[name] = value;
            manager.setSessionAttributes(attributes);
        },
        /**
         * Ad ogni chiamata tutti gli attributi vengono salvati in sessione.
         * 
         * @param {String} name nome dell'attributo
         */
        del(name) {
            delete attributes[name];
            manager.setSessionAttributes(attributes);
        }
    }
}

/**
 * 
 * @param {Object} filledSlots così come restituito da intent.slots
 * @returns ritorna un oggetto le cui proprietà sono i nomi degli slot, 
 *  e valorizzate con {id, resolved, synonym, isValidated}
 */
function getSlotValues(filledSlots) {
    const slotValues = {};

    log(`The filled slots: ${JSON.stringify(filledSlots)}`);
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
    log(`Slot values: ${JSON.stringify(slotValues)}`);
    return slotValues;
}

/**
 * Concatena in modo intelliggibile le frasi in input.
 * 
 * @param {Array<String>} phrases frasi da concatenare
 * @param {String} and congiunzione per l'ultima frase
 * @returns le frasi concatenate
 */
function humanJoin(phrases, and) {
    if (phrases.length === 1) {
        return phrases[0];
    } else {
        const tokens = [...phrases];
        const last = tokens.splice(-1);
        return `${tokens.join(', ')} ${and} ${last}`;
    }
}

function log() {
    if (CAN_LOG) {
        console.log.apply(null, arguments);
    }
}

// TOOD: è proprio brutto, rifare!
//  forse la soluzione miglire è generare SSML e per la card epurare i tag con regex
const OUT_SPEAKER = 'speaker',
    OUT_CARD = 'card',
    COMPOSER = {
        [OUT_SPEAKER]: {
            phrase(...strings) {
                return strings.reduce((m, p) => {
                    return m += `<s>${p}</s>`
                }, '');
            },
            list(string) {
                return `<s>${string}</s>`;
            },
            break(ms) {
                return `<break time="${ms}ms"/>`;
            },
            emphasis(string, level = 'moderate') {
                return `<emphasis level="${level}">${string}</emphasis>`;
            },
            prosody(string, { rate = '100%', pitch = '+0%', volume = '+0dB' }) {
                return `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${string}</prosody>`;
            }
        },
        [OUT_CARD]: {
            phrase(string) {
                return `${string}\n`;
            },
            list(string) {
                return `* ${string}\n`;
            },
            break() {
                return '\n';
            },
            emphasis(string, level) {
                return `"${string}"`;
            },
            prosody(string, { rate, pitch, volume }) {
                return string;
            }
        }
    }

module.exports = {
    createSessionHelper,
    getSlotValues,
    humanJoin,
    log,
    OUT_SPEAKER,
    OUT_CARD,
    COMPOSER
}
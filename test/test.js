/**
 * skill-raccolta-differenziata-lodi-vecchio
 * test con mocha e chai
 * 
 * mocha test.js --reporter list
 * mocha test.js --reporter markdown > README.md
 * 
 * @see https://github.com/BrianMacIntosh/alexa-skill-test-framework/blob/master/examples/skill-sample-nodejs-hello-world/helloworld-tests.js
 */

const alexaTest = require('alexa-skill-test-framework'),
    { expect } = require('chai'),
    moment = require('../lambda/custom/node_modules/moment-timezone');

const TEST_DEBUG = !!~process.argv.indexOf('--test-debug'),
    TEST_ALL = !!~process.argv.indexOf('--test-all'),
    TEST_LAUNCH = TEST_ALL || !!~process.argv.indexOf('--test-launch'),
    TEST_INFO = TEST_ALL || !!~process.argv.indexOf('--test-info'),
    TEST_WHEN = TEST_ALL || !!~process.argv.indexOf('--test-when'),
    TEST_WHERE = TEST_ALL || !!~process.argv.indexOf('--test-where'),
    TEST_WHAT = TEST_ALL || !!~process.argv.indexOf('--test-what');

// estraggo solo il tipo di dato TYPE_GARBAGE dal modello della skill
const { interactionModel: {
    languageModel: { types: [, , , TYPE_GARBAGE] }
} } = require('../models/it-IT.json');
const MATERIALS = require('../lambda/custom/materials.json');
const DATE_FORMAT = 'YYYY-MM-DD',
    DATE_LONG_FORMAT = 'dddd, D MMMM';

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

// disabilito il debug della skill, a meno che non passi l'arg --test-debug
if (!TEST_DEBUG) {
    process.env.NO_DEBUG = 'no';
}

alexaTest.initialize(
    require('../lambda/custom/index.js'),
    'amzn1.ask.skill.8a45b6a6-4785-44b7-8d5e-a9356944d206',
    'amzn1.ask.account.VOID');

alexaTest.setLocale('it-IT');

function createRequest(intentName, slots) {
    if (slots && !Array.isArray(slots)) {
        slots = [slots];
    }
    if (slots && slots.length > 0) {
        const request = alexaTest.getIntentRequest(intentName, slots.reduce((m, slot) => {
            m[slot.name] = slot.synonim;
            return m;
        }, {}));
        return slots.reduce((request, slot) => {
            return requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                request,
                slot.name,
                slot.type,
                slot.value,
                slot.id
            );
        }, request);
    } else {
        return alexaTest.getIntentRequest(intentName);
    }
}

function test(intentName, slots, repromptsNothing, shouldEndSession, cb) {
    alexaTest.test([
        {
            request: intentName ?
                createRequest(intentName, slots) :
                alexaTest.getLaunchRequest(),
            repromptsNothing,
            shouldEndSession,
            saysCallback: cb
        }
    ]);
}

describe('raccolta differenziata', function () {

    if (TEST_LAUNCH) {
        test(null, null, false, false, (context, speech) => {
            expect(context.framework.locale).is.eq('it-IT');
            expect(speech).contains('Benvenuto in raccolta differenziata Lodi Vecchio');
        });
    }

    if (TEST_WHERE) {
        describe('WhereIntent', function () {
            describe('Non trovato', function () {
                test('WhereIntent', {
                    name: 'garbage',
                    type: 'TYPE_GARBAGE',
                    value: 'xxxx',
                    synonim: null,
                    id: null
                }, true, true, (context, speech) =>
                        expect(speech).contains('Ripeti il nome del rifiuto per favore')
                );
            });

            describe('Il fiammifero', function () {
                test('WhereIntent', [{
                    name: 'garbage',
                    type: 'TYPE_GARBAGE',
                    value: 'SECC',
                    synonim: 'fiammifero',
                    id: 'SECC'
                }, {
                    name: 'article',
                    type: 'TYPE_ARTICLE',
                    value: 'il',
                    synonim: 'il',
                    id: null
                }], true, true, (context, speech) =>
                        expect(speech).contains('il fiammifero va')
                );
            });

            describe('Random garbage', function () {
                const tg = TYPE_GARBAGE.values.random();
                const synonim = tg.name.synonyms.random();
                const dest = MATERIALS[tg.id].where;
                test('WhereIntent', {
                    name: 'garbage',
                    type: 'TYPE_GARBAGE',
                    value: tg.name.value,
                    synonim: synonim,
                    id: tg.id
                }, true, true, (context, speech) =>
                        expect(speech).contains(dest)
                );
            });
        });
    }


    if (TEST_WHAT) {
        describe('WhatIntent', function () {
            describe('Oggi', function () {
                const stoday = moment().format(DATE_FORMAT);
                test('WhatIntent', {
                    name: 'date',
                    type: 'AMAZON.DATE',
                    value: stoday,
                    synonim: stoday,
                    id: null
                }, true, true, (context, speech) =>
                        expect(speech).to.match(/(Per\s)?oggi/i)
                );
            });

            describe('Domani', function () {
                const stomorrow = moment().add(1, 'days').format(DATE_FORMAT);
                test('WhatIntent', {
                    name: 'date',
                    type: 'AMAZON.DATE',
                    value: stomorrow,
                    synonim: stomorrow,
                    id: null
                }, true, true, (context, speech) =>
                        expect(speech).to.match(/(Per\s)?domani/i)
                );
            });

            describe('Random date', function () {
                const date = moment().add(2 + Math.random() * 10, 'days');
                const sdate = date.format(DATE_FORMAT);
                test('WhatIntent', {
                    name: 'date',
                    type: 'AMAZON.DATE',
                    value: sdate,
                    synonim: sdate,
                    id: null
                }, true, true, (context, speech) =>
                        expect(speech).contains(date.locale('it').format(DATE_LONG_FORMAT))
                );
            });
        });
    }

    if (TEST_WHEN) {
        describe('WhenIntent', function () {
            describe('Pile', function () {
                test('WhenIntent', {
                    name: 'material',
                    type: 'TYPE_MATERIAL',
                    value: 'pile',
                    synonim: 'pile',
                    id: 'PILE'
                }, true, true, (context, speech) =>
                        expect(speech).to.match(/Non\sè\sprevisto\salcun\sritiro.*Le\spile\ssono\sda\sbuttare/i)
                );
            });
        });
    }

    if (TEST_INFO) {
        describe('InfoIntent', function () {
            describe('Pile', function () {
                test('InfoIntent', {
                    name: 'material',
                    type: 'TYPE_MATERIAL',
                    value: 'pile',
                    synonim: 'pile',
                    id: 'PILE'
                }, true, true, (context, speech) =>
                        expect(speech).contains('Le pile sono da buttare')
                );
            });
        });
    }
});
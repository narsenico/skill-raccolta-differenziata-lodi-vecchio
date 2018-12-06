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

// disabilito il debug della skill
process.env.NO_DEBUG = true;

alexaTest.initialize(
    require('../lambda/custom/index.js'),
    'amzn1.ask.skill.8a45b6a6-4785-44b7-8d5e-a9356944d206',
    'amzn1.ask.account.VOID');

alexaTest.setLocale('it-IT');

describe('raccolta differenziata', function () {

    describe('LaunchRequest', function () {
        alexaTest.test([
            {
                request: alexaTest.getLaunchRequest(),
                repromptsNothing: false,
                shouldEndSession: false,
                saysCallback(context, speech) {
                    // console.log(speech);
                    expect(context.framework.locale).is.eq('it-IT');
                    expect(speech).contains('Benvenuto in raccolta differenziata Lodi Vecchio');
                }
            }
        ]);
    });

    describe('WhereIntent', function () {
        const WHERE_TEST_COUNT = 10;

        for (let ii = 0; ii < WHERE_TEST_COUNT; ii++) {
            const tg = TYPE_GARBAGE.values.random();
            const synonim = tg.name.synonyms.random();
            const dest = MATERIALS[tg.id].where;

            describe(`${synonim} -> ${dest}`, function () {
                const slotWithSynonym = { 'garbage': synonim };
                const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WhereIntent', slotWithSynonym),
                    'garbage',
                    'TYPE_GARBAGE',
                    tg.name.value,
                    tg.id
                );

                alexaTest.test([
                    {
                        request: requestWithEntityResolution,
                        repromptsNothing: true,
                        shouldEndSession: true,
                        saysCallback(context, speech) {
                            expect(speech).contains(dest);
                        }
                    }
                ]);
            });
        }
    });

    describe('WhatIntent', function () {
        describe('Oggi', function () {
            const stoday = moment().format(DATE_FORMAT);
            const slotWithSynonym = { 'date': stoday };
            const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                alexaTest.getIntentRequest('WhatIntent', slotWithSynonym),
                'date',
                'AMAZON.DATE',
                stoday,
                null
            );

            alexaTest.test([
                {
                    request: requestWithEntityResolution,
                    repromptsNothing: true,
                    shouldEndSession: true,
                    saysCallback(context, speech) {
                        expect(speech).contains('oggi');
                    }
                }
            ]);
        });

        describe('Domani', function () {
            const stomorrow = moment().add(1, 'days').format(DATE_FORMAT);
            const slotWithSynonym = { 'date': stomorrow };
            const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                alexaTest.getIntentRequest('WhatIntent', slotWithSynonym),
                'date',
                'AMAZON.DATE',
                stomorrow,
                null
            );

            alexaTest.test([
                {
                    request: requestWithEntityResolution,
                    repromptsNothing: true,
                    shouldEndSession: true,
                    saysCallback(context, speech) {
                        expect(speech).contains('domani');
                    }
                }
            ]);
        });

        const WHAT_TEST_COUNT = 10;

        for (let ii = 0; ii < WHAT_TEST_COUNT; ii++) {
            const date = moment().add(2 + Math.random() * 10, 'days');
            const sdate = date.format(DATE_FORMAT);
            describe(sdate, function () {
                const slotWithSynonym = { 'date': sdate };
                const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WhatIntent', slotWithSynonym),
                    'date',
                    'AMAZON.DATE',
                    sdate,
                    null
                );

                alexaTest.test([
                    {
                        request: requestWithEntityResolution,
                        repromptsNothing: true,
                        shouldEndSession: true,
                        saysCallback(context, speech) {
                            expect(speech).contains(date.locale('it').format(DATE_LONG_FORMAT));
                        }
                    }
                ]);
            });
        }
    });

    describe('WhenIntent', function () {
        describe('Oggi', function () {
            const slotWithSynonym = { 'material': 'pile' };
            const requestWithEntityResolution = alexaTest.addEntityResolutionToRequest(
                alexaTest.getIntentRequest('WhenIntent', slotWithSynonym),
                'material',
                'TYPE_MATERIAL',
                'pile',
                'PILE'
            );

            alexaTest.test([
                {
                    request: requestWithEntityResolution,
                    repromptsNothing: true,
                    shouldEndSession: true,
                    saysCallback(context, speech) {
                        // console.log(speech)
                        expect(speech).contains('è previsto');
                    }
                }
            ]);
        });
    });    
});
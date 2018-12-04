/**
 * skill-raccolta-differenziata-lodi-vecchio
 * test con mocha e chai
 * 
 * mocha test.js --reporter list
 * 
 * @see https://github.com/BrianMacIntosh/alexa-skill-test-framework/blob/master/examples/skill-sample-nodejs-hello-world/helloworld-tests.js
 */

const alexaTest = require('alexa-skill-test-framework'),
    { expect } = require('chai');

// estraggo solo il tipo di dato TYPE_GARBAGE dal modello della skill
const { interactionModel: {
    languageModel: { types: [, , , TYPE_GARBAGE] }
} } = require('../models/it-IT.json');
const MATERIALS = require('../lambda/custom/materials.json')

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Array.prototype.random = function () {
    return this[getRandom(0, this.length - 1)];
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
                    expect(context.framework.locale).is.eq('it-IT');
                    expect(speech).contains('Benvenuto in raccolta differenziata Lodi Vecchio');
                }
            }
        ]);
    });

    describe('WhereIntent', function() {
        const WHERE_TEST_COUNT = 10;

        for (let ii = 0; ii < WHERE_TEST_COUNT; ii++) {
            const tg = TYPE_GARBAGE.values.random();
            const synonim = tg.name.synonyms.random();
            const dest = MATERIALS[tg.id].where;

            it(`${synonim} -> ${dest}`, function () {
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

});
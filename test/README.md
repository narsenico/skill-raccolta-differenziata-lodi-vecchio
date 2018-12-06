# TOC
   - [raccolta differenziata](#raccolta-differenziata)
     - [LaunchRequest](#raccolta-differenziata-launchrequest)
     - [WhereIntent](#raccolta-differenziata-whereintent)
       - [vetro -> nel Vetro](#raccolta-differenziata-whereintent-vetro---nel-vetro)
       - [valigia -> a Humana o Caritas, oppure al Centro di Raccolta](#raccolta-differenziata-whereintent-valigia---a-humana-o-caritas-oppure-al-centro-di-raccolta)
       - [biro -> nel Secco](#raccolta-differenziata-whereintent-biro---nel-secco)
       - [scatole di alluminio -> in Lattine e Scatolame](#raccolta-differenziata-whereintent-scatole-di-alluminio---in-lattine-e-scatolame)
       - [cenere del camino -> nel Umido](#raccolta-differenziata-whereintent-cenere-del-camino---nel-umido)
       - [vaschetta di polistirolo -> nella Plastica](#raccolta-differenziata-whereintent-vaschetta-di-polistirolo---nella-plastica)
       - [pile -> nei Contenitori Stradali per Pile](#raccolta-differenziata-whereintent-pile---nei-contenitori-stradali-per-pile)
       - [etichette -> nel Secco](#raccolta-differenziata-whereintent-etichette---nel-secco)
       - [ossa -> nel Umido](#raccolta-differenziata-whereintent-ossa---nel-umido)
       - [confezione di tetrapak -> in Carta e Cartone](#raccolta-differenziata-whereintent-confezione-di-tetrapak---in-carta-e-cartone)
     - [WhatIntent](#raccolta-differenziata-whatintent)
       - [Oggi](#raccolta-differenziata-whatintent-oggi)
       - [Domani](#raccolta-differenziata-whatintent-domani)
       - [2018-12-14](#raccolta-differenziata-whatintent-2018-12-14)
       - [2018-12-17](#raccolta-differenziata-whatintent-2018-12-17)
       - [2018-12-12](#raccolta-differenziata-whatintent-2018-12-12)
       - [2018-12-11](#raccolta-differenziata-whatintent-2018-12-11)
       - [2018-12-08](#raccolta-differenziata-whatintent-2018-12-08)
       - [2018-12-13](#raccolta-differenziata-whatintent-2018-12-13)
       - [2018-12-10](#raccolta-differenziata-whatintent-2018-12-10)
     - [WhenIntent](#raccolta-differenziata-whenintent)
       - [Oggi](#raccolta-differenziata-whenintent-oggi)
<a name=""></a>
 
<a name="raccolta-differenziata"></a>
# raccolta differenziata
<a name="raccolta-differenziata-launchrequest"></a>
## LaunchRequest
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent"></a>
## WhereIntent
<a name="raccolta-differenziata-whereintent-vetro---nel-vetro"></a>
### vetro -> nel Vetro
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-valigia---a-humana-o-caritas-oppure-al-centro-di-raccolta"></a>
### valigia -> a Humana o Caritas, oppure al Centro di Raccolta
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-biro---nel-secco"></a>
### biro -> nel Secco
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-scatole-di-alluminio---in-lattine-e-scatolame"></a>
### scatole di alluminio -> in Lattine e Scatolame
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-cenere-del-camino---nel-umido"></a>
### cenere del camino -> nel Umido
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-vaschetta-di-polistirolo---nella-plastica"></a>
### vaschetta di polistirolo -> nella Plastica
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-pile---nei-contenitori-stradali-per-pile"></a>
### pile -> nei Contenitori Stradali per Pile
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-etichette---nel-secco"></a>
### etichette -> nel Secco
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-ossa---nel-umido"></a>
### ossa -> nel Umido
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whereintent-confezione-di-tetrapak---in-carta-e-cartone"></a>
### confezione di tetrapak -> in Carta e Cartone
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent"></a>
## WhatIntent
<a name="raccolta-differenziata-whatintent-oggi"></a>
### Oggi
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-domani"></a>
### Domani
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-14"></a>
### 2018-12-14
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-17"></a>
### 2018-12-17
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-12"></a>
### 2018-12-12
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-11"></a>
### 2018-12-11
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-08"></a>
### 2018-12-08
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-13"></a>
### 2018-12-13
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-08"></a>
### 2018-12-08
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-14"></a>
### 2018-12-14
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-10"></a>
### 2018-12-10
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whatintent-2018-12-13"></a>
### 2018-12-13
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```

<a name="raccolta-differenziata-whenintent"></a>
## WhenIntent
<a name="raccolta-differenziata-whenintent-oggi"></a>
### Oggi
returns the correct responses.

```js
var run = function (handler, sequenceIndex, attributes) {
	if (sequenceIndex >= sequence.length) {
		// all requests were executed
		done();
	}
	else {
		var ctx = awsContext(self.mockContextOptions);
		var currentItem = sequence[sequenceIndex];
		
		var request = currentItem.request;
		request.session.new = sequenceIndex === 0;
		if (attributes) {
			request.session.attributes = JSON.parse(JSON.stringify(attributes));
		} else {
			request.session.attributes = {};
		}
		request.session.sessionId = randomSessionId;
		var callback = function (err, result) {
			if (err) {
				return ctx.fail(err);
			}
			return ctx.succeed(result);
		};
		// adds values from withSessionAttributes to the session
		if (currentItem.withSessionAttributes) {
			var session = request.session.attributes;
			for (var newAttribute in currentItem.withSessionAttributes) {
				if (!session[newAttribute]) {
					session[newAttribute] = currentItem.withSessionAttributes[newAttribute];
				}
			}
		}
		
		var requestType = request.request.type;
		if (requestType === "IntentRequest") {
			requestType = request.request.intent.name;
		}
		var context = new CallbackContext(self, sequenceIndex, locale, requestType);
		
		if (self.dynamoDBTable) {
			self.dynamoDBGetMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Key[self.partitionKeyName], self.userId);
				
				const Item = {};
				Item[self.partitionKeyName] = self.userId;
				Item[self.attributesName] = currentItem.withStoredAttributes || {};
				callback(null, {TableName: self.dynamoDBTable, Item});
			};
			self.dynamoDBPutMock = (params, callback) => {
				self._assertStringEqual(context, "TableName", params.TableName, self.dynamoDBTable);
				self._assertStringEqual(context, "UserId", params.Item[self.partitionKeyName], self.userId);
				let storesAttributes = currentItem.storesAttributes;
				if (storesAttributes) {
					for (let att in storesAttributes) {
						if (storesAttributes.hasOwnProperty(att)) {
							const storedAttr = params.Item[self.attributesName][att];
							if (typeof storesAttributes[att] === "function") {
								if (!storesAttributes[att](storedAttr)) {
									context.assert({message: "the stored attribute " + att + " did not contain the correct value. Value was: " + storedAttr});
								}
							} else {
								self._assertStringEqual(context, att, storedAttr, storesAttributes[att]);
							}
						}
					}
				}
				callback(null, {});
			};
		}
		
		var result = handler(request, ctx, callback, true);
		if (result) {
			if (result.then) {
				result.then(ctx.succeed, ctx.fail);
			} else {
				ctx.succeed(result);
			}
		}
		
		ctx.Promise
			.then(response => {
				//TODO: null checks
				
				if (response.toJSON) {
					response = response.toJSON();
				}
				
				var actualSay = response.response && response.response.outputSpeech ? response.response.outputSpeech.ssml : undefined;
				var actualReprompt = response.response && response.response.reprompt && response.response.reprompt.outputSpeech ? response.response.reprompt.outputSpeech.ssml : undefined;
				
				// check the returned speech
				if (currentItem.says !== undefined) {
					self._assertStringPresent(context, 'speech', actualSay);
					var trimActualSay = actualSay.substring(7);
					trimActualSay = trimActualSay.substring(0, trimActualSay.length - 8).trim();
					if (Array.isArray(currentItem.says)) {
						self._assertStringOneOf(context, "speech", trimActualSay, currentItem.says);
					} else {
						self._assertStringEqual(context, "speech", trimActualSay, currentItem.says);
					}
				}
				if (currentItem.saysLike !== undefined) {
					self._assertStringContains(context, "speech", actualSay, currentItem.saysLike);
				}
				if (currentItem.saysNothing) {
					self._assertStringMissing(context, "speech", actualSay);
				}
				if (currentItem.reprompts !== undefined) {
					self._assertStringPresent(context, 'reprompt', actualReprompt);
					var trimActualReprompt = actualReprompt.substring(7);
					trimActualReprompt = trimActualReprompt.substring(0, trimActualReprompt.length - 8).trim();
					if (Array.isArray(currentItem.reprompts)) {
						self._assertStringOneOf(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					} else {
						self._assertStringEqual(context, "reprompt", trimActualReprompt, currentItem.reprompts);
					}
				}
				if (currentItem.repromptsLike !== undefined) {
					self._assertStringContains(context, "reprompt", actualReprompt, currentItem.repromptsLike);
				}
				if (currentItem.repromptsNothing) {
					self._assertStringMissing(context, "reprompt", actualReprompt);
				}
				
				if (currentItem.elicitsSlot) {
					let elicitSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ElicitSlot');
					let slot = elicitSlotDirective ? elicitSlotDirective.slotToElicit : '';
					self._assertStringEqual(context, "elicitSlot", slot, currentItem.elicitsSlot);
				}
				
				if (currentItem.confirmsSlot) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmSlot');
					let slot = confirmSlotDirective ? confirmSlotDirective.slotToConfirm : '';
					self._assertStringEqual(context, "confirmSlot", slot, currentItem.confirmsSlot);
				}
				
				if (currentItem.confirmsIntent) {
					let confirmSlotDirective = self._getDirectiveFromResponse(response, 'Dialog.ConfirmIntent');
					if (!confirmSlotDirective) {
						context.assert({message: "the response did not ask Alexa to confirm the intent"});
					}
				}
				
				if (currentItem.hasAttributes) {
					for (let att in currentItem.hasAttributes) {
						if (currentItem.hasAttributes.hasOwnProperty(att)) {
							if (typeof currentItem.hasAttributes[att] === "function") {
								if (!currentItem.hasAttributes[att](response.sessionAttributes[att])) {
									context.assert({message: "the attribute " + att + " did not contain the correct value. Value was: " + response.sessionAttributes[att]});
								}
							} else {
								self._assertStringEqual(context, att, response.sessionAttributes[att], currentItem.hasAttributes[att]);
							}
						}
					}
				}
				
				if (currentItem.hasCardTitle) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else {
						self._assertStringEqual(context, "cardTitle", response.response.card.title, currentItem.hasCardTitle);
					}
				}
				
				if (currentItem.hasCardContent) {
					if (!response.response.card) {
						context.assert({message: "the response did not contain a card"});
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringEqual(context, "cardContent", response.response.card.content, currentItem.hasCardContent);
					}
				}
				if (currentItem.hasCardContentLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Simple") {
						context.assert({ message: "the card in the response was not a simple card" });
					} else {
						self._assertStringContains(context, "cardContent", response.response.card.content, currentItem.hasCardContentLike);
					}
				}
				if (currentItem.hasCardText) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringEqual(context, "cardText", response.response.card.text, currentItem.hasCardText);
					}
				}
				if (currentItem.hasCardTextLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else {
						self._assertStringContains(context, "cardText", response.response.card.text, currentItem.hasCardTextLike);
					}
				}
				if (currentItem.hasSmallImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "smallImageUrl", response.response.card.image.smallImageUrl, currentItem.hasSmallImageUrlLike);
					}
				}
				if (currentItem.hasLargeImageUrlLike) {
					if (!response.response.card) {
						context.assert({ message: "the response did not contain a card" });
					} else if (response.response.card.type !== "Standard") {
						context.assert({ message: "the card in the response was not a standard card" });
					} else if (!response.response.card.image) {
						context.assert({ message: "the card in the response did not contain an image" });
					} else {
						self._assertStringContains(context, "largeImageUrl", response.response.card.image.largeImageUrl, currentItem.hasLargeImageUrlLike);
					}
				}
				// check the shouldEndSession flag
				if (currentItem.shouldEndSession === true && response.response.shouldEndSession === false) {
					context.assert(
						{
							message: "the response did not end the session",
							expected: "the response ends the session",
							actual: "the response did not end the session"
						});
				}
				else if (currentItem.shouldEndSession === false && response.response.shouldEndSession !== false) {
					context.assert(
						{
							message: "the response ended the session",
							expected: "the response does not end the session",
							actual: "the response ended the session"
						});
				}
				
				checkAudioPlayer(self, context, response, currentItem);
				
				// custom checks
				if (currentItem.saysCallback) {
					currentItem.saysCallback(context, actualSay);
				}
				if (currentItem.callback) {
					currentItem.callback(context, response);
				}
				
				// extra checks
				if (self.extraFeatures.questionMarkCheck) {
					context._questionMarkCheck(response);
				}
				
				run(handler, sequenceIndex + 1, response.sessionAttributes);
			})
			.catch(done);
	}
};
run(index.handler, 0, {});
```


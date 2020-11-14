const Alexa = require('ask-sdk-core');
const RecipeScreen = require('RecipeScreen.json');
const Welcome = require('Welcome.json');
const Datasources = require('Datasources.json'); 
var https = require('https');
var Houndify = require('houndify');
var path = require('path');
var WebSocketServer = require('websocket').Server;

//parse arguments
var argv = require('minimist')(process.argv.slice(2));

//config file
var configFile = argv.config || './config.json';
var config = require(path.join(__dirname, configFile));

/******** VARIABLES ********/

let currentChosenWord = null;
let currentMovie = null;
const welcomeMessage = `Welcome to Kitchen Assist! You can ask me to get a recipe of anything.`;
const helpMessage = `Ask kitchen assist for any recipe. While cooking, simply rotate between steps by asking for next, previous or repeat step.`;
const speechConsCorrect = ['Booya', 'All righty', 'Bam', 'Bazinga', 'Bingo', 'Boom', 'Bravo', 'Cha Ching', 'Cheers', 'Dynomite', 'Hip hip hooray', 'Hurrah', 'Hurray', 'Huzzah', 'Oh dear.  Just kidding.  Hurray', 'Kaboom', 'Kaching', 'Oh snap', 'Phew','Righto', 'Way to go', 'Well done', 'Whee', 'Woo hoo', 'Yay', 'Wowza', 'Yowsa'];
const speechConsWrong = ['Argh', 'Aw man', 'Blarg', 'Blast', 'Boo', 'Bummer', 'Darn', "D'oh", 'Dun dun dun', 'Eek', 'Honk', 'Le sigh', 'Mamma mia', 'Oh boy', 'Oh dear', 'Oof', 'Ouch', 'Ruh roh', 'Shucks', 'Uh oh', 'Wah wah', 'Whoops a daisy', 'Yikes'];
var finalString;
var recipe;
var conversationState;
var nextstep=0;
var stepLength = 0;
var currentStep = 0;

/******** HANDLERS ********/
const LaunchRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
      if (supportsAPL(handlerInput)) {
        return handlerInput.responseBuilder
          .speak(welcomeMessage)
          .reprompt(welcomeMessage)
          .addDirective({
            type : 'Alexa.Presentation.APL.RenderDocument',
            document : Welcome,
            datasources : {
                "bodyTemplate6Data": {
                    "type": "object",
                    "objectId": "bt6Sample",
                    "backgroundImage": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "image": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "textContent": {
                        "primaryText": {
                            "type": "PlainText",
                            "text": welcomeMessage
                        }
                    },
                    "logoUrl": "https://s3.amazonaws.com/recipe-alexa-skill/logo/SmallLogo.png",
                    "hintText": "Try, \"Alexa, get recipe for Pasta.\""
                }
            }
          })
          .getResponse();
      } else {
        return handlerInput.responseBuilder
          .speak(welcomeMessage)
          .reprompt(welcomeMessage)
          .getResponse();
      }
    },
  };


  /******** Recipe HANDLERS ********/
  const RecipeIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'recipeIntent';
    },
    async handle(handlerInput) {
        var recipeValue = handlerInput.requestEnvelope.request.intent.slots.recipeName.value;
        console.log("Got my recipe brooo", recipeValue);

        let response = await makeHoundifyRequest({
            query: "show me the recipe for " + recipeValue,
            clientId:  config.clientId, 
            clientKey: config.clientKey,
            requestInfo: {
                UserID: "test_user",
                Latitude: 37.388309, 
                Longitude: -121.973968
            },
            conversationState: conversationState
        })

        conversationState = response.AllResults[0].ConversationState;
        console.log(response.AllResults[0].WrittenResponse);

        recipe = response.AllResults[0].InformationNuggets[0].DishDetails;
        console.log('here is the response recipe////', recipe);
        stepLength = recipe.Instructions.length;

        let instructions = "";
        for (let i =0;i < recipe.Instructions.length; i++) {
            let j = i+1;
            instructions =  instructions + '<br>'+ j + ')' + recipe.Instructions[i]
        }

        console.log('in the response, here are the number of steps', stepLength, 'and instruction 0', recipe.Instructions[0], 'and ingredients', recipe.Ingredients[0])

    if (supportsAPL(handlerInput)) {
        console.log('now rendering');
        return handlerInput.responseBuilder
        .addDirective({
            type : 'Alexa.Presentation.APL.RenderDocument',
            version: '1.0',
            document: RecipeScreen,
            datasources: {
                "bodyTemplate3Data":{
                   "type":"object",
                   "objectId":"bt3Sample",
                   "backgroundImage":{
                      "contentDescription":null,
                      "smallSourceUrl":null,
                      "largeSourceUrl":null,
                      "sources":[
                         {
                            "url": recipe.ImageURL || "https://d2o906d8ln7ui1.cloudfront.net/images/BT2_Background.png",
                            "size":"small",
                            "widthPixels":0,
                            "heightPixels":0
                         },
                         {
                            "url": recipe.ImageURL || "https://d2o906d8ln7ui1.cloudfront.net/images/BT2_Background.png",
                            "size":"large",
                            "widthPixels":0,
                            "heightPixels":0
                         }
                      ]
                   },
                   "title":"Here is our top rated suggestion",
                   "image":{
                      "contentDescription":null,
                      "smallSourceUrl":null,
                      "largeSourceUrl":null,
                      "sources":[
                         {
                            "url":"https://d2o906d8ln7ui1.cloudfront.net/images/details_bt3.png",
                            "size":"small",
                            "widthPixels":0,
                            "heightPixels":0
                         },
                         {
                            "url":"https://d2o906d8ln7ui1.cloudfront.net/images/details_bt3.png",
                            "size":"large",
                            "widthPixels":0,
                            "heightPixels":0
                         }
                      ]
                   },
                   "textContent":{
                      "title":{
                         "type":"PlainText",
                         "text":recipe.Name
                      },
                      "subtitle":{
                         "type":"PlainText",
                         "text": recipe.TotalMinutes + 'minutes'
                      },
                      "primaryText":{
                         "type":"PlainText",
                         "text": recipe.Description
                      },
                      "InstructionsText":{
                         "type":"PlainText",
                         "text": instructions
                      }
                   },
                   "logoUrl":"https://s3.amazonaws.com/recipe-alexa-skill/logo/SmallLogo.png",
                   "hintText":"Try, \"Alexa, give me recipe for veggie sandwich.\""
                },
                "listTemplate2Metadata":{
                   "type":"object",
                   "objectId":"lt1Metadata",
                   "backgroundImage":{
                      "contentDescription":null,
                      "smallSourceUrl":null,
                      "largeSourceUrl":null,
                      "sources":[
                         {
                            "url": recipe.ImageURL || "https://d2o906d8ln7ui1.cloudfront.net/images/LT2_Background.png",
                            "size":"small",
                            "widthPixels":0,
                            "heightPixels":0
                         },
                         {
                            "url": recipe.ImageURL || "https://d2o906d8ln7ui1.cloudfront.net/images/LT2_Background.png",
                            "size":"large",
                            "widthPixels":0,
                            "heightPixels":0
                         }
                      ]
                   },
                   "title":"Ingredients",
                   "logoUrl":"https://s3.amazonaws.com/recipe-alexa-skill/logo/SmallLogo.png"
                },
                "listTemplate2ListData":{
                   "type":"list",
                   "listId":"lt2Sample",
                   "totalNumberOfItems":recipe.Ingredients.length,
                   "hintText":"Try, \"Alexa, give me recipe for veggie sandwich.\"",
                   "listPage":{
                      "listItems":recipe.Ingredients
                   }
                }
             }
        })
        .speak("There are " +  stepLength + " steps, I will read them one by one, when you ready, ask Kitchen assist for the next step, here is the first step" + recipe.Instructions[0])
        // .reprompt(recipe.Instructions[0])
        .getResponse();
    } else {
        console.log('now speaking');
        return handlerInput.responseBuilder
        .speak("There are " +  stepLength + " steps, I will read them one by one, when you ready, ask Kitchen assist for the next step, here is the first step" + recipe.Instructions[0])
        // .reprompt(recipe.Instructions[0])
        .getResponse();
    }
    }
  };

  /******** Multiple Recipe HANDLER ********/
  const MultipleRecipeIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'multipleRecipeIntent';
    },
    async handle(handlerInput) {
        var recipeValue = handlerInput.requestEnvelope.request.intent.slots.cuisine.value;
        console.log("Got my recipe for multiple response", recipeValue);

        let response = await makeHoundifyRequest({
            query: "Show me recipes for " + recipeValue,
            clientId:  config.clientId, 
            clientKey: config.clientKey,
            requestInfo: {
                UserID: "test_user",
                Latitude: 37.388309, 
                Longitude: -121.973968
            },
            conversationState: conversationState
        })

        conversationState = response.AllResults[0].ConversationState;
        console.log(response.AllResults[0].WrittenResponse);

        recipes = response.AllResults[0].InformationNuggets[0].Results;
        console.log('here is the response recipes+++++', recipes);

        let recipeList = [];

        for(var i=0; i<recipes.length; i++) {
          let recipe_i = {
            "primaryText": recipes[i].Name,
            "secondaryText": 'Cuisine type: ' + recipes[i].CuisineType,
            "ratingSlotMode": "multiple",
            "ratingNumber": recipes[i].StarRating,
            "ratingText": recipes[i].ReviewCount,
            "imageAlignment": "right",
            "imageSource": recipes[i].PhotoUrl,
            "primaryAction": [
                {
                    "type": "SetValue",
                    "componentId": "recipeList",
                    "property": "headerTitle",
                    "value": "${payload.imageListData.listItems["+i+"].primaryText} is selected"
                },
                {
                  "type": "SendEvent",
                  "arguments": [
                    "${payload.imageListData.listItems["+i+"].primaryText} is selected"
                  ]
                }
            ]
        }
        recipeList.push(recipe_i)
        }

    if (supportsAPL(handlerInput)) {
        console.log('now rendering');
        return handlerInput.responseBuilder
        .addDirective({
            type : 'Alexa.Presentation.APL.RenderDocument',
            token: 'tokenRenderDocument',
            version: '1.0',
            document: 
            {
              "type": "APL",
              "version": "1.4",
              "settings": {},
              "theme": "dark",
              "import": [
                  {
                      "name": "alexa-layouts",
                      "version": "1.2.0"
                  }
              ],
              "resources": [],
              "styles": {},
              "onMount": [],
              "graphics": {},
              "commands": {},
              "layouts": {},
              "mainTemplate": {
                  "parameters": [
                      "payload"
                  ],
                  "items": [
                      {
                          "type": "AlexaImageList",
                          "id": "recipeList",
                          "headerTitle": "${payload.imageListData.title}",
                          "headerBackButton": false,
                          "headerAttributionImage": "${payload.imageListData.logoUrl}",
                          "backgroundImageSource": "${payload.imageListData.backgroundImage.sources[0].url}",
                          "backgroundBlur": false,
                          "backgroundColorOverlay": true,
                          "imageAspectRatio": "square",
                          "imageMetadataPrimacy": true,
                          "imageScale": "best-fill",
                          "listItems": "${payload.imageListData.listItems}"
                      }
                  ]
              }
          },
            datasources: 
            {
              "imageListData": {
                  "type": "object",
                  "objectId": "imageListSample",
                  "backgroundImage": {
                      "contentDescription": null,
                      "smallSourceUrl": null,
                      "largeSourceUrl": null,
                      "sources": [
                          {
                              "url": "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v2/bg_cheese_1.jpg",
                              "size": "small",
                              "widthPixels": 0,
                              "heightPixels": 0
                          },
                          {
                              "url": "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v2/bg_cheese_1.jpg",
                              "size": "large",
                              "widthPixels": 0,
                              "heightPixels": 0
                          }
                      ]
                  },
                  "title": "I found these recipes",
                  "listItems": recipeList,
                  "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v2/icon_cheese.png",
                  "hintText": "Try, \"Alexa, what is today's cheesy joke?\""
              }
          }
        })
      //   .addDirective({
      //     type: 'Alexa.Presentation.APL.ExecuteCommands',
      //     token: 'tokenRenderDocument',
      //     commands: [
      //               {
      //                 "type": "TouchWrapper",
      //                 "id": "recipeList",
      //                 "items": {
      //                   "type": "Text",
      //                   "id": "recipeList",
      //                   "speech": "I told you not to touch",
      //                 },
      //                 "onPress": [
      //                   {
      //                     "type": "SpeakItem",
      //                     "componentId": "recipeList"
      //                   },
      //                   {
      //                     "type": "SendEvent",
      //                     "arguments": [
      //                       "The button was pushed and spoken have I"
      //                     ],
      //                     "components": [
      //                       "recipeList"
      //                     ]
      //                   }
      //                 ]
      //               }
      //             ]
      // })
        .speak("I found " +  recipes.length + " recipes.")
        // .reprompt(recipe.Instructions[0])
        .getResponse();
    } else {
        console.log('now speaking');
        return handlerInput.responseBuilder
        .speak("I found " +  recipes.Length + " recipes.")
        // .reprompt(recipe.Instructions[0])
        .getResponse();
    }
    }
  };

  const RecipeButtonEventHandler = {
    canHandle(handlerInput){
      console.log('I am in test testing test', handlerInput.requestEnvelope.request)
        return (handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent') },
    handle(handlerInput) {
      console.log('going to speak test')
        return handlerInput.responseBuilder
            .speak("Newton how do you do it.")
            .getResponse();
    }

};

    /******** NEXT HANDLERS ********/
    const NextStepHandler = {
        canHandle(handlerInput) {
          return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'nextStep';
        },
        async handle(handlerInput) {

            if(nextstep + 1 < recipe.Instructions.length) {
                nextstep = nextstep + 1;
                console.log('now speaking next+++++',recipe.Instructions[nextstep], nextstep);
                return handlerInput.responseBuilder
                .speak("Here is the next step" + recipe.Instructions[nextstep], nextstep + "After you are done with this, ask kitchen assist for the next step")
                // .reprompt(recipe.Instructions[nextstep], nextstep)
                .getResponse();
            } else {
                console.log('now speaking+++++', recipe.Instructions[nextstep], nextstep);
                return handlerInput.responseBuilder
                .speak("Here is the last step " + recipe.Instructions[nextstep], nextstep)
                // .reprompt(recipe.Instructions[nextstep], nextstep)
                .getResponse();
            }
        }
      };
    


        /******** PreviousStep HANDLERS ********/

const PreviousStepHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'previousStep';
    },
    async handle(handlerInput) {
        if (nextstep > 0 ){
            nextstep = nextstep - 1;

        } else {
            nextstep = 0;
        }
            console.log('now speaking previous ----', recipe.Instructions[nextstep], nextstep);
            return handlerInput.responseBuilder
            .speak("Here is the previous step " + recipe.Instructions[nextstep], nextstep)
            // .reprompt(recipe.Instructions[nextstep])
            .getResponse();
    }
    };

    const RepeatStepHandler = {
        canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'repeatStep';
        },
        async handle(handlerInput) {
                console.log('now speaking******', recipe.Instructions[nextstep], nextstep);
                return handlerInput.responseBuilder
                .speak(recipe.Instructions[nextstep], nextstep)
                // .reprompt(recipe.Instructions[nextstep])
                .getResponse();
        }
        };

/******** Cancel HANDLERS ********/
  const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
          || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
      const speechText = 'Thanks for using Kitchen Assist!';
  
      if (supportsAPL(handlerInput)) {
        return handlerInput.responseBuilder
          .speak(speechText)
          .addDirective({
            type : 'Alexa.Presentation.APL.RenderDocument',
            document : Welcome,
            datasources : {
                "bodyTemplate6Data": {
                    "type": "object",
                    "objectId": "bt6Sample",
                    "backgroundImage": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": "https://d2o906d8ln7ui1.cloudfront.net/images/BT6_Background.png",
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "image": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": "http://images.media-allrecipes.com/userphotos/250x250/303241.jpg",
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "textContent": {
                        "primaryText": {
                            "type": "PlainText",
                            "text": speechText
                        }
                    },
                    "logoUrl": "https://s3.amazonaws.com/recipe-alexa-skill/logo/SmallLogo.png"
                }
            }
          })
          .getResponse();
      } else {
        return handlerInput.responseBuilder
          .speak(speechText)
          .getResponse();
      }
    },
  };
  

/******** ASYNC HOUNDIFY ********/
  function makeHoundifyRequest(options) {
    return new Promise(((resolve, reject) => {

        let textRequestOptions = {
            onResponse(responseHoundify, info) {
                resolve(responseHoundify);
            },

            onError(errorObj) {
                reject(errorObj);
            }
        }

        textRequestOptions = Object.assign(textRequestOptions, options);

        new Houndify.TextRequest(textRequestOptions);
    }));
  }

/******** SESSION END HOUNDIFY ********/
  const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
      console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
      currentChosenWord = null;
      return handlerInput.responseBuilder.getResponse();
    },
  };

/******** HELP HOUNDIFY ********/
  const HelpIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
      const speechText = "You can ask me to get a recipe of anything."
  
      return handlerInput.responseBuilder
        .speak(helpMessage)
        .reprompt(helpMessage)
        .getResponse();
    }
  };
  
/******** ERROR HOUNDIFY ********/
  const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log("ERROR" + JSON.stringify(error));
  
      return handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Please say again.')
        .reprompt('Sorry, I can\'t understand the command. Please say again.')
        .getResponse();
    },
  };

/******** HELPER FUNCTIONS ********/
  function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface != null && aplInterface != undefined;
}

  /******** LAMBDA SETUP ********/

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    RecipeIntentHandler,
    MultipleRecipeIntentHandler,
    RecipeButtonEventHandler,
    // YesIntentHandler,
    // AnswerIntentHandler,
    NextStepHandler,
    PreviousStepHandler,
    RepeatStepHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();


//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const categories = require('./categories');
const events = require('./events');
const NodeCache = require('node-cache');

var EventSearch = require("facebook-events-by-location-core");
var Wit = require('node-wit').Wit;
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h3>QHacks 2017 Facebook Messenger Bot Example</h3>This is a bot based on Messenger Platform QuickStart. Find more details <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">here</a><br><hr><p><a href=\"https://gomix.com/#!/remix/messenger-bot/ca73ace5-3fff-4b8f-81c5-c64452145271\"><img src=\"https://gomix.com/images/background-light/remix-on-gomix.svg\"></a></p><p><a href=\"https://gomix.com/#!/project/messenger-bot\">View Code</a></p></body></html>";

// The rest of the code implements the routes for our Express server.
const myCache = new NodeCache();
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;
  
  // var lat = messageAttachments[0].payload.coordinates.lat;
  // var lng = messageAttachments[0].payload.coordinates.long;

  if (messageText) {
    
    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID);
        break;
      case 'add menu':
        createPersistentMenu();
        break 
        /*
      case 'hello':
        sendTextMessage(senderID, 'Hello yourself!');
        break;
        */
      default:
        //sendTextMessage(senderID, messageText);
        
        // We retrieve the user's current session, or create one if it doesn't exist
        // This is needed for our bot to figure out the conversation history
        const sessionId = findOrCreateSession(senderID);
        
        wit.runActions(
              sessionId, // the user's current session
              messageText, // the user's message
              //messageAttachments, // the users data
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
          
              console.log("sessions context")
              console.log(sessions[sessionId].context)
          
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //   delete sessions[sessionId];
              // }

              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
    }
  } else if (messageAttachments) {
    if (messageAttachments[0].type === "location"){
      let {lat, long} = messageAttachments[0].payload.coordinates
      var coordinates = { lat, long };
      var success = myCache.get("user_coordinates");
      
      if (success === undefined){
        var value = myCache.set("user_coordinates", coordinates);
      } else {
        var value = myCache.del("user_coordinates");
        value = myCache.set("user_coordinates", coordinates);
      }
      var value = myCache.get( "user_coordinates" );
      console.log(value);
      
      getLocalEvents(senderID, lat, long); //senderID
      
      // sendLocalEventGenericMessage(senderID, local_events);
    } else {
      sendTextMessage(senderID, "Message with attachment received");
    }
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}


// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

// Our bot actions
const actions = {
  send({sessionId, messageAttachments}, {text, quickreplies}) {
    
    console.log(messageAttachments);
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return sendTextMessage(recipientId, text, quickreplies);/*
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });*/
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },

  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  findAttributeByEvent({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      // Here should go the api call, e.g.:
      // context.forecast = apiCall(context.loc)
      
      console.log("Intent: ")
      console.log(entities.intent)
      
      if(entities.intent[0]) {
      
        switch (entities.intent[0].value) {
          case 'findEvent':
            console.log("Executing findEvent");

            let selectedEvent = selectEvent(entities)

            sendEventGenericMessage(sessions[sessionId].fbid, [selectedEvent]);

            context.eventTitle = selectedEvent.title;
            break;
          case 'findEventCategory':
            break;
          case 'findEventTime':
            console.log("Executing findEventTime");

            let result = selectEvent(entities);

            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

            context.startTime = dateToReadableString(result.startTime, options);
            context.endTime = dateToReadableString(result.endTime, options);
            break;
          case 'findEventLocation':
            console.log("Executing findEventLocation");
            console.log(entities);

            let selectedEvent2 = selectEvent(entities);
            console.log(context)
            console.log(selectedEvent2)

            context.eventTitle = selectedEvent2.title;
            context.locationPlace = selectedEvent2.location.place;
            context.locationCity = selectedEvent2.location.city;

            break;
          default:
            console.log("No")
            context.errorMessage = true;
        }
      }
      return resolve(context);
    });
  },
  
  getEvents({sessionId, context, entities}){
    return new Promise(function(resolve, reject) {
      //console.log("we exist");
      //console.log(events.slice(0,3))
      //var rand_id = Math.floor(Math.random() * (events.length));
      context.events = events.slice(0,5);//[rand_id];
      
      console.log(sessions[sessionId]);
      
      sendEventGenericMessage(sessions[sessionId].fbid, context.events);
      
      return resolve(context);
    });
  },
  
  getEventCategories({context, entities}){
    return new Promise(function(resolve, reject) {
      const categories_array = [];
      let categories_str = "";
      
      for (var key in categories) {
        if (categories.hasOwnProperty(key)) {
          categories_array.push(categories[key]);
        }
      }
      
      for (let key in categories) {
        
        if (categories[key] === categories_array[categories_array.length - 2])
          categories_str += categories[key] + ", and ";
        else if (categories[key] !== categories_array[categories_array.length - 1])
          categories_str += categories[key] + ", ";
        else
          categories_str += categories[key] + ". "
      }
      
      context.categoriesStr = categories_str;
     
      return resolve(context);
    });
  },
  
  findEventsByAttribute({sessionId, context, entities}){
    return new Promise(function(resolve, reject) {
      // Here should go the api call, e.g.:
      // context.forecast = apiCall(context.loc)
      //console.log(entities.category[0].value)
      //console.log(dateToReadableString(entities.datetime[0].value));
      
      var selectedEvents = events.filter(function(event) {
        
        // only consider checking whether this event should be returned
        // only if the user asked for events with these attributes
        // ie. these attributes are in entities
        if (entities.category && entities.datetime) {
          return event.category === entities.category[0].value &&  sameDate(event.startTime, entities.datetime[0].value);
        }
        else if (entities.category) {
          return event.category === entities.category[0].value;
        }
        else if (entities.datetime) {
          console.log("datetime")
          console.log(entities.datetime[0].values)
          if (typeof entities.datetime[0].to !== 'undefined') {
              return sameDate(event.startTime, entities.datetime[0].value) || withinDateRange(event.startTime, entities.datetime[0].to, entities.datetime[0].from);
          }
          return sameDate(event.startTime, entities.datetime[0].value);
        }
        
      });

      if (selectedEvents.length === 0) {
        context.missingEvents = 'missing';
      } else {
        context.events = selectedEvents;
        if (typeof entities.datetime !== 'undefined')
          context.eventDay = entities.datetime[0].value.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
      }
      if (context.events) { sendEventGenericMessage(sessions[sessionId].fbid, context.events); }
      
      return resolve(context);
    });
  },
  
  getLocalEventsByAttribute({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      //console.log(entities.intent);
      switch(entities.intent[0].value){
        case 'findLocalEventsDatetime':
          getLocalEvents(sessions[sessionId].fbid, null, null, 'time', datetimeToUnixtime(entities.datetime[0].value));
          context.events = true;
          context.time = dateToReadableString(entities.datetime[0].value);
          break;
        case 'findLocalEventsProximity':
          getLocalEvents(sessions[sessionId].fbid, null, null, 'distance', datetimeToUnixtime(entities.datetime[0].value));
          context.events = true;
          context.time = dateToReadableString(entities.datetime[0].value);
          break;
        default:
          getLocalEvents(sessions[sessionId].fbid);
      }
      return resolve(context);
    });
  },
  
  findLocalEvents({sessionId, context, entities}) {
    return new Promise(function(resolve, reject) {
      sendLocationPrompt(sessions[sessionId].fbid);
    });
  },
  
  getSecret({context, entities}){
    return new Promise(function(resolve, reject){
      context.secret = 'ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQB/nAmOjTmezNUDKYvEeIRf2YnwM9/uUG1d0BYsc8/tRtx+RGi7N2lUbp728MXGwdnL9od4cItzky/zVdLZE2cycOa18xBK9cOWmcKS0A8FYBxEQWJ/q9YVUgZbFKfYGaGQxsER+A0w/fX8ALuk78ktP31K69LcQgxIsl7rNzxsoOQKJ/CIxOGMMxczYTiEoLvQhapFQMs3FL96didKr/QbrfB1WT6s3838SEaXfgZvLef1YB2xmfhbT9OXFE3FXvh2UPBfN+ffE7iiayQf/2XR+8j4N4bW30DiPtOQLGUrH1y5X/rpNZNlWW2+jGIxqZtgWg7lTy3mXy5x836Sj/6L';
      resolve(context);
    });
}
};

// Setting up our bot
const wit = new Wit({
  accessToken: process.env.WIT_TOKEN ,
  actions,
});


//////////////////////////
// Helper functions
//////////////////////////
function selectEvent(entities) {
  
  // find event matching 
  return events.find(function(event) {
    return entities.event[0].value.toLowerCase() === event.title.toLowerCase();
/*
    if (entities.intent[0].value === 'findEvent' && ) {
      console.log(event.title)
      return event.title;
    }
    else if (entities.intent[0].value === 'findEventTime' && entities.event[0].value === event.title) {
      console.log(event.startTime)
      return event.startTime;
    }
    */
  });
}
    
function findByCategory(context, entities) {
  var selectedEvents = events.filter(function(event) { 
      // if (entities.datetime) {
      //   return event.category === entities.category[0].value && event.datetime === entities.datetime[0].value;
      // } else {
        return event.category === entities.category[0].value;
      //}
    });

    if (selectedEvents.length === 0) {
      context.missingEvents = 'missing';
    } else {
      context.events = selectedEvents;
      //context.startTime = selectedEvents.startTime;
    }
    
    console.log(context.missingEvents);
    return context;
}

// return true if two datetimes are on the same day
// check the exact time if sameTimeToo is true
function sameDate(dateTime1, dateTime2, sameTimeToo=false) {
  
  dateTime1 = new Date(Date.parse(dateTime1))
  dateTime2 = new Date(Date.parse(dateTime2))
  
  // check if the datetimes are on the same day if sameTimeToo is false
  if (!sameTimeToo) {
    dateTime1 = dateTime1.toDateString()
    dateTime2 = dateTime2.toDateString()
  }
  
  return dateTime1 === dateTime2;
}

function datetimeToUnixtime(dateTime){
  dateTime = new Date(Date.parse(dateTime));
  dateTime = dateTime.getTime()/1000;
  return dateTime
}

function withinDateRange(dateTime1, dateTimeRange1, dateTimeRange2) {
  dateTime1 = new Date(Date.parse(dateTime1))
  dateTimeRange1 = new Date(Date.parse(dateTimeRange1))
  dateTimeRange2 = new Date(Date.parse(dateTimeRange2))
  
  return dateTime1 >= dateTimeRange1 && dateTime1 <= dateTimeRange1;
}

function dateToReadableString(timestamp) {
  var result = new Date(Date.parse(timestamp));
  let formattingOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}
  
  return result.toLocaleString('en-US', formattingOptions) + " at " + result.toLocaleTimeString({hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
}

function getLocalEvents(recipientId, lat, lng, sort_type, time_filter){
  var events_limit;
  var es = new EventSearch({
    "lat": lat || 44.2312, //defaults to Kingston if no coordinates are passed in
    "lng": lng || -76.4860,
    "distance": 1000, // 1 km
    "sort": sort_type || "popularity",
    "since": time_filter || null
  });

  es.search().then(function (events) {
    if(events.events.length > 10){
      events_limit = events.events.slice(0,10);
    } else {
      events_limit = events.events;
    }
    sendLocalEventGenericMessage(recipientId, events_limit);
    
    }).catch(function (error) {
      console.error(JSON.stringify(error));
  });
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText, quickReplies) {
  if (typeof quickReplies !== 'undefined') {
    quickReplies = quickReplies.map(function(x) { 
                       return {  title: x,
                                 content_type: "text", 
                                 payload: "empty" }
    });
    console.log("quickReplies")
    console.log(quickReplies)
  }
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: quickReplies,
    }
  };

  callSendAPI(messageData);
}

// send location prompt to gain local data from user
function sendLocationPrompt(recipientId) {

  var messageData = {
    "recipient":{
      "id": recipientId
    },
    "message":{
      "text":"Please share your location:",
      "quick_replies":[
        {
          "content_type":"location",
        }
      ]
    }
  }
  callSendAPI(messageData);
}

// send event data following the generic template
function sendLocalEventGenericMessage(recipientId, eventObjectList) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  for (let e in eventObjectList) {
    
    let dateTime = new Date(Date.parse(eventObjectList[e].startTime))

    let item_url = 'https://facebook.com/events/' + eventObjectList[e].id;
    let {city, state, country} = eventObjectList[e].venue.location;
    let location = `\n${city}, ${state}, ${country}`
    
    messageData.message.attachment.payload.elements.push(
      {
        title: eventObjectList[e].name,
        subtitle: dateToReadableString(dateTime) + location, 
        item_url: item_url,
        image_url: eventObjectList[e].coverPicture,
        buttons: [{
          type: 'web_url',
          url: item_url,
          title: 'Learn More',
        },
        {
          type: "element_share"    
        }
        ],
      }
    );
  }
  
  callSendAPI(messageData);
}

function sendEventGenericMessage(recipientId, eventObjectList) {
 var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  for (let e in eventObjectList) {
    
    let dateTime = new Date(Date.parse(eventObjectList[e].startTime));
    let location = eventObjectList[e].location.city;
    
    messageData.message.attachment.payload.elements.push(
      {
        title: eventObjectList[e].title,
        subtitle: dateToReadableString(dateTime) + "\n" + location, 
        item_url: eventObjectList[e].item_url,
        image_url: eventObjectList[e].image_url,
        buttons: [{
          type: 'web_url',
          url: eventObjectList[e].item_url,
          title: 'Learn More',
        },
        {
          type: "element_share"    
        }
        ],
      }
    );
  }
  
  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

function createPersistentMenu() {
  
  let messageData = 
    {
      "setting_type" : "call_to_actions",
      "thread_state" : "existing_thread",
      "call_to_actions":[
        {
          "type":"postback",
          "title":"Help",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_HELP"
        },
        {
          "type":"postback",
          "title":"Start a New Order",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_START_ORDER"
        },
        {
          "type":"web_url",
          "title":"Checkout",
          "url":"http://petersapparel.parseapp.com/checkout",
          "webview_height_ratio": "full",
          "messenger_extensions": true
        },
        {
          "type":"web_url",
          "title":"View Website",
          "url":"http://petersapparel.parseapp.com/"
        }
      ]
    };
  
  
  
  request({
    uri: "https://graph.facebook.com/v2.6/me/thread_settings",
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  }), function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = body.result;

      console.log("%s", result);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  }  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});
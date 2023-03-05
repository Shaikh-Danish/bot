'use strict';
const router = require('express').Router();
const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');

require('dotenv').config();

const { 
    sendListItems, 
    sendTextMessageToClient, 
    sendMessageAsRead,
    sendRadioButtons,
    sendButtonMessageToClient  } = require('./listMessage')
const { postToSheet, getRows } = require('./postToSheet');
const EcommerceStore = require('./ecomm');


let Store = new EcommerceStore();
const Whatsapp = new WhatsappCloudAPI({
    accessToken: process.env.Meta_WA_accessToken,
    senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
    WABA_ID: process.env.Meta_WA_wabaId,
});

function validateVehicleNumber(vehicleNumber) {
    const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
    return regex.test(vehicleNumber);
}

function getTicketNumber() {
    return Math.floor(Math.random() * 10000)
}

const customerIssueSession = new Map()
const customerFeedbackSession = new Map()
const ticketBookingSession = new Map()
const EcommerceSession = new Map()
const orderMealSession = new Map()


router.get('/meta_wa_callbackurl', (req, res) => {
    try {
        console.log('GET: Someone is pinging me!');

        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];

        if (
            mode &&
            token &&
            mode === 'subscribe' &&
            '789' === token
        ) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } catch (error) {
        console.error({error})
        return res.sendStatus(500);
    }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
    try {
        console.log('POST: Someone is pinging me!');
        let data = Whatsapp.parseMessage(req.body);
    
        if (data?.isMessage) {
            let incomingMessage = data.message;
            // console.log(incomingMessage,'+++++++++ ye bhej rah hai+++++++')
            let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
            let recipientName = incomingMessage.from.name;
            let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
            let message_id = incomingMessage.message_id; // extract the message id

            if (!customerIssueSession.get(recipientPhone)) {
                customerIssueSession.set(recipientPhone, [])
            }
            if (!customerFeedbackSession.get(recipientPhone)) {
                customerFeedbackSession.set(recipientPhone, [])
            }
            if (!ticketBookingSession.get(recipientPhone)) {
                ticketBookingSession.set(recipientPhone, [])
            }
            if (!EcommerceSession.get(recipientPhone)) {
                EcommerceSession.set(recipientPhone, [])
            }    
            if (!orderMealSession.get(recipientPhone)) {
              orderMealSession.set(recipientPhone, [])
            }
            // console.log(recipientPhone/)
 
            let numberOfIssuesInFeedbackCart = customerFeedbackSession.get(recipientPhone).length;
            let numberOfissuesInCustomerCart = customerIssueSession.get(recipientPhone).length;
            let numberOfIssuesInBookingCart = ticketBookingSession.get(recipientPhone).length
            let numberOfIssuesInEcommerceCart = EcommerceSession.get(recipientPhone).length;
            let numberOfIssuesInMealCart = orderMealSession.get(recipientPhone).length

            // console.log(incomingMessage)

            // ? Issue registerations bot
            if (typeOfMsg === "text_message") {
                if (incomingMessage.text.body.toUpperCase() === "HI" && numberOfissuesInCustomerCart === 0) {
                  const listOfIssues = [
                    {
                      "title": "Issues",
                      "rows": [
                        {
                          "id": "rto",
                          "title": "RTO",
                        },
                        {
                          "id": "advance",
                          "title": "Advance",
                        },
                        {
                          "id": "challan",
                          "title": "Challan",
                        }
                      ]
                    }
                  ]
                  let message = `Hello there! 👋\n\nI'm your friendly 🚛 Truck Driver Support Bot 🤖, ready to assist you with any questions or concerns you may have. Whether you're on the road or taking a break, I'm here to help make your life easier.\n\n🛣️ Please don't hesitate to ask me anything about your truck, routes, or any other related topics. I'm always happy to help! 😊`
                  sendListItems(recipientPhone, "Support Bot", message, "Issues", listOfIssues)
                  customerIssueSession.set(recipientPhone, [])
                  customerIssueSession.get(recipientPhone).push([ "number", recipientPhone ])

                } else if (numberOfissuesInCustomerCart === 2) {
                    console.log(" in cart ")
                    if (validateVehicleNumber(incomingMessage.text.body.toUpperCase())) {
                        let vehicleNo = incomingMessage.text.body.toUpperCase()
                        // console.log(vehicleNo)
                        customerIssueSession.get(recipientPhone).push([ "vehicleNo", vehicleNo ])

                        let message = `Please send me your current location.`
                        sendTextMessageToClient(message, recipientPhone)

                    }
                    else {
                        sendTextMessageToClient('Invalid vehicle number')
                    }
                }  
            }
            else if (typeOfMsg === "radio_button_message" && numberOfissuesInCustomerCart === 1) {
                let issue = incomingMessage.list_reply.id
                let message =  `You are facing issue related to ${issue}\n\ncan you tell me what is your vehicle No.?`
                sendTextMessageToClient(message, recipientPhone)

                customerIssueSession.get(recipientPhone).push([ "issue", issue ])

            }
            else if (typeOfMsg === "location_message" && numberOfissuesInCustomerCart === 3) {
                const lat = incomingMessage.location.latitude
                const long = incomingMessage.location.longitude
                const data = "https://www.google.com/maps/place/" + lat + "," + long
                customerIssueSession.get(recipientPhone).push([ "location", data ])
                // console.log(customerIssueSession.get(recipientPhone), 'in cart')
                
                const ticketId = getTicketNumber()
                let message =  `Thanks for providing information.\n\nYour Ticket has been generated\nHere's your Ticket ID: ${ticketId}.\n\n Your Issue will be resolved soon.`
                sendTextMessageToClient(message, recipientPhone)
                customerIssueSession.get(recipientPhone).push([ "ticketId", ticketId ])
                
                postToSheet("Sheet1", customerIssueSession.get(recipientPhone))
                customerIssueSession.set(recipientPhone, [])
            }



            // ? Customer Feedback bot
            if (typeOfMsg === "text_message") {
                if (
                  incomingMessage.text.body.toUpperCase() === "FEEDBACK" &&
                  numberOfIssuesInFeedbackCart === 0
                ) {
                  let header = "Feedback Form";
                  let body =
                    "👋 Hi there! 😀 We would love ❤️ to hear your feedback 🗣️ on our serviclees. Can you take a moment ⏰ to let us know how we're doing? 😊";
                  let button = "Select Options";
                  let listOfRadioButtons = [
                    {
                      title: "give feedback",
                      rows: [
                        {
                          id: "excellent",
                          title: "Excellent",
                        },
                        {
                          id: "good",
                          title: "Good",
                        },
                        {
                          id: "average",
                          title: "Average",
                        },
                        {
                          id: "bad",
                          title: "Bad",
                        },
                        {
                          id: "verybad",
                          title: "Very Bad",
                        },
                      ],
                    },
                  ];
                  sendRadioButtons(
                    recipientPhone,
                    header,
                    body,
                    button,
                    listOfRadioButtons,
                    "by bot"
                  );
                  customerFeedbackSession.get(recipientPhone).push([ "number", recipientPhone ]);
                  console.log(customerFeedbackSession.get(recipientPhone));
                }
            }
            else if (typeOfMsg === "radio_button_message") {
              if (numberOfIssuesInFeedbackCart === 1) {
                let message = ""
                let feedback = incomingMessage.list_reply.id
                
                if (feedback === "excellent") {
                  message = `👋 Dear ${recipientName}!,\n\n 🙌 Thank you for taking the time ⏱️ to provide your feedback on our WhatsApp bot! We're thrilled to hear that you've had a positive 🌟 experience using it and that it's been helpful to you.`
                }
                else if (feedback === "average") {
                  message = `👋 Dear ${recipientName}!,\n\n  🙏 Thank you for taking the time to provide your feedback on our WhatsApp bot. . 😀 We're happy to hear that it was helpful, but 😔 sorry to know that your experience was just average.\n\nHope we can do better in the future! 🤞`
                }
                else if (feedback === "bad") {
                  message = `👋 Dear ${recipientName}!,\n\n  🙏 Thank you for 🕰️ taking the time to provide your feedback on our WhatsApp bot. We're sorry to hear 😔 that you had a bad 😞 experience while using it, and we apologize 💔 for any inconvenience or frustration 😤 that this may have caused.`
                }
                sendTextMessageToClient(message, recipientPhone)
                customerFeedbackSession.get(recipientPhone).push([ "feedback", feedback ]);

                postToSheet("Sheet1", customerFeedbackSession.get(recipientPhone))
                customerFeedbackSession.set(recipientPhone, [])
              }
            }


            
            // ? Ticket registration bot
            if (typeOfMsg === "text_message") {
              if (
                incomingMessage.text.body.toUpperCase() === "BOOK" &&
                numberOfIssuesInBookingCart === 0
              ) {

                ticketBookingSession.set(recipientPhone, [])
                let buttons = [
                  {
                    "type": "reply",
                    "reply": {
                      "id": "railway",
                      "title": "Railway Tickets",
                    }
                  },
                  {
                    "type": "reply",
                    "reply": {
                      "id": "plane",
                      "title": "Plane Tickets",
                    }
                  },
                ]
                let message = `👋 Welcome to our ticketing bot! We can help you book ✈️ airline, 🏨 hotel, and 🚆 railway tickets. \n\nSimply tell us what you need and we'll guide you through the booking process step by step. \n\nOur bot is ⚡ fast, 🤖 easy to use, and available 24/7, so you can book your tickets anytime, anywhere. Let's get started! 🚀`
                sendButtonMessageToClient(recipientPhone, message, buttons)
                ticketBookingSession.get(recipientPhone).push([ 'number', recipientPhone ])
              }
              else if (numberOfIssuesInBookingCart === 2) {
                let departure = incomingMessage.text.body.toUpperCase()
                let message = 'Whats is the destination location?'

                ticketBookingSession.get(recipientPhone).push([ "departure", departure ])
                sendTextMessageToClient(message, recipientPhone)
              }
              else if (numberOfIssuesInBookingCart === 3) {
                let destination = incomingMessage.text.body.toUpperCase()
                let message = 'Tell me the number of passengers?'

                ticketBookingSession.get(recipientPhone).push([ "destination", destination ])
                sendTextMessageToClient(message, recipientPhone)
              }
              else if (numberOfIssuesInBookingCart === 4) {
                let passengers = Number(incomingMessage.text.body)
                if (!isNaN(passengers)) {
                  ticketBookingSession.get(recipientPhone).push([ "passengers", passengers ])
                  let bookingInfo = ticketBookingSession.get(recipientPhone)
                  let message = `Would you like to confirm the process, The information you have entered:\n\nDeparture: ${bookingInfo[2][1]}\nDestination: ${bookingInfo[3][1]}\nPassengers: ${bookingInfo[4][1]}`
                  let buttons = [
                    {
                      "type": "reply",
                      "reply": {
                        "id": "yes",
                        "title": "YES",
                      }
                    },
                    {
                      "type": "reply",
                      "reply": {
                        "id": "no",
                        "title": "NO",
                      }
                    },
                  ]
                  sendButtonMessageToClient(recipientPhone, message, buttons)
                }
                else {
                  let message = "Sorry, you have given wrong info.\nplease try giving the information in number."
                  sendTextMessageToClient(message, recipientPhone)
                }
              }
            }
            else if (typeOfMsg === "simple_button_message") {
              let buttonsReply = incomingMessage.button_reply.id
              if (buttonsReply === "plane" || buttonsReply === "railway" && numberOfIssuesInBookingCart === 1) {
                ticketBookingSession.get(recipientPhone).push([ "ticketType", buttonsReply ])

                let message = `Great, you want to book tickets for ${buttonsReply}.\n\nTo book the tickets I want to know the departure location.`
                sendTextMessageToClient(message, recipientPhone)
              }
              else if (buttonsReply === "yes" && numberOfIssuesInBookingCart === 5) {
                let ticketNumber = getTicketNumber()
                let message = `Thank you for booking tickets.\n Your booking is successful.\n Your tickets number is ${ticketNumber}.`
                sendTextMessageToClient(message, recipientPhone)

                ticketBookingSession.get(recipientPhone).push([ "ticketNumber", ticketNumber ])
                postToSheet('Sheet1', ticketBookingSession.get(recipientPhone))
                ticketBookingSession.set(recipientPhone, [])
                
              }
              else if (buttonsReply === "no" && numberOfIssuesInBookingCart === 5) {
                let message = `Sorry, for the inconvenience.\nPlease restart your booking by typing BOOK.`
                sendTextMessageToClient(message, recipientPhone)
                ticketBookingSession.set(recipientPhone, [])
              }
            }
            
            
            // ? Order Meal Bot
            if (typeOfMsg === "text_message") {
              if (incomingMessage.text.body.toUpperCase() === "ORDER" && numberOfIssuesInMealCart === 0) {
              
                orderMealSession.set(recipientPhone, [])
                let message = `👋 Hello!\n\nWelcome to our 🍽️ meal order WhatsApp Bot 🤖.\nWe're excited to help you with your order today. How can we assist you? 🤔`
                let buttons = [
                  {
                    "type": "reply",
                    "reply": {
                      "id": "veg",
                      "title": "Veg",
                    },
                  },
                  {
                    "type": "reply",
                    "reply": {
                      "id": "nonveg",
                      "title": "Non Veg",
                    }
                  }
                ]      
                          
              sendButtonMessageToClient(recipientPhone, message, buttons)
              orderMealSession.get(recipientPhone).push( ["number", recipientPhone] )
            
            
              }
              if (numberOfIssuesInMealCart === 3) {
                var address = incomingMessage.text.body
                let message = `Would you like to confirm your delivery address - ${address}`
                let buttons = [
                  {
                    "type": "reply",
                    "reply": {
                      "id": "yes",
                      "title": "YES",
                    },
                  },
                  {
                    "type": "reply",
                    "reply": {
                      "id": "no",
                      "title": "NO",
                    }
                  }
                ]

                sendButtonMessageToClient(recipientPhone, message, buttons)
                orderMealSession.get(recipientPhone).push( ["address", address])
              }
            }
            else if (typeOfMsg === "simple_button_message") {
              const buttonId = incomingMessage.button_reply.id
              if (buttonId === "veg" && numberOfIssuesInMealCart === 1) {

                let message = `Welcome to our vegetarian menu! We're delighted to offer a variety of delicious vegetarian options for you to choose from.`
                let header = "Veg Menu"
                let buttonText = "Options"
                let menu = [
                  {
                    "title": "Veg Menu",
                    "rows": [
                      {
                        "id": "0",
                        "title": "Shahi Paneer",
                        "description": "$400"
                      },
                      {
                        "id": "1",
                        "title": "Veg. Kolhapuri",
                        "description": "$400"
                      },
                      {
                        "id": "2",
                        "title": "Chana Masala",
                        "description": "$400"
                      },
                    ],
                  }
                ]
                sendListItems(recipientPhone, header, message, buttonText, menu)
                orderMealSession.get(recipientPhone).push( ["type", buttonId ])
              }
              else if (buttonId === "nonveg" && numberOfIssuesInMealCart === 1) {
                let message = `Welcome to our non vegetarian menu! We're delighted to offer a variety of delicious non vegetarian options for you to choose from.`
                let header = "Non Veg Menu"
                let buttonText = "Options"
                let menu = [
                  {
                    "title": "Veg Menu",
                    "rows": [
                      {
                        "id": "4",
                        "title": "Butter Chicken",
                        "description": "$400"
                      },
                      {
                        "id": "5",
                        "title": "Chicken Biryani",
                        "description": "$400"
                      },
                      {
                        "id": "6",
                        "title": "Chicken Fried Rice",
                        "description": "$400"
                      },
                    ]
                  }
                ]
                sendListItems(recipientPhone, header, message, buttonText, menu)
                orderMealSession.get(recipientPhone).push( ["type", buttonId ])
              }
              else if (buttonId === "yes" && numberOfIssuesInMealCart === 4) {
                let message = `👍 Great! Your address 🏠 has been confirmed. We will deliver your order 🛍️ to the provided address 📍 as soon as possible.`
                sendTextMessageToClient(message, recipientPhone)
                postToSheet("Sheet1", orderMealSession.get(recipientPhone))
                orderMealSession.set(recipientPhone, [])
              }
              else if (buttonId === "no" && numberOfIssuesInMealCart === 4) {
                let message = "👍 Sure thing! Please provide us with the updated address 📍 so we can ensure a successful delivery of your order 🛍️. Thank you! 🙏"
                sendTextMessageToClient(message, recipientPhone)
                orderMealSession.get(recipientPhone).splice(3)
              }
            }
            else if (typeOfMsg === "radio_button_message") {
              if (numberOfIssuesInMealCart === 2) {
                let meal = incomingMessage.list_reply.title
                let message = `Thank you for selecting a meal 🍽️ from our menu. Your order ${meal} 🛍️ has been received and is being processed.\n\nPlease allow some time for our chefs 👨‍🍳 to prepare your meal to perfection 🤌.`
                sendTextMessageToClient(message, recipientPhone)

                // ? sometimes this message is sent before previous message is sent
                setTimeout(() => {
                  sendTextMessageToClient("Please provide your delivery address.", recipientPhone)
                }, 50)

                orderMealSession.get(recipientPhone).push( ["order", meal ])
              }
            }
            
            
            // sendMessageAsRead({ message_id })
        }
        return res.sendStatus(200);
    } catch (error) {
        // console.error({error})
        return res.sendStatus(500);
    }
});
module.exports = router;
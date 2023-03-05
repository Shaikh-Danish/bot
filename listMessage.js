var axios = require('axios');
require('dotenv').config();


const sendListItems = (recipientPhone, headerText, bodyText, buttonText, listItems) => {
  var data = JSON.stringify({
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": recipientPhone,
    "type": "interactive",
    "interactive": {
      "type": "list",
      "header": {
        "type": "text",
        "text": headerText
      },
      "body": {
        "text": bodyText
      },
      "action": {
        "button": buttonText,
        "sections": listItems
      }
    }
  });
  postMessageToClient(data)
}

function sendTextMessageToClient(textMessage, recipientPhone) {
  var data = JSON.stringify({
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": recipientPhone,
    "type": "text",
    "text": {
      "preview_url": false,
      "body": textMessage,
    }
  })
  postMessageToClient(data)
}

function sendButtonMessageToClient(recipientPhone, body, buttons) {
  var data = JSON.stringify({
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": recipientPhone,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": body
      },
      "action": {
        "buttons": buttons,
      }
    }
  });
  postMessageToClient(data)
}

function sendMessageAsRead(messsageId) {
  var data = JSON.stringify({
    "messaging_product": "whatsapp",
    "status": "read",
    "message_id": `"${messsageId}"`,
  });
  postMessageToClient(data, "put")

}

function sendRadioButtons(
  recipientPhone,
  headerText = "",
  bodyText = "",
  buttonText = "",
  radioButton = "",
  footerText = ""
) {

  var data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: headerText,
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: footerText,
      },
      action: {
        button: buttonText,
        sections: radioButton
      },
    },
  });

  postMessageToClient(data);
}

function postMessageToClient(data, method = "post") {
  var config = {
    method: method,
    maxBodyLength: Infinity,
    url: 'https://graph.facebook.com/v15.0/103553102674850/messages',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${process.env.Meta_WA_accessToken}`
    },
    data : data
  };
  
  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
}

module.exports = {
  sendListItems,
  sendTextMessageToClient,
  sendMessageAsRead,
  sendRadioButtons,
  sendButtonMessageToClient,
}
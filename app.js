const express = require("express");
const {
  WebhookClient,
} = require("dialogflow-fulfillment");
const {handleCityInfo,
  handleCurrentWeather,
  handleDefaultIntent,
  handleGoodBye,
  handleHistoryIndia,
  handleRouteDetails,
  handleWhereToVisit,
  handleWhereToVisitLoc,
} = require("./intent_handlers");
const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Server Is Working......");
});

app.post("/webhook", (req, res) => {
  // get agent from request
  let agent = new WebhookClient({ request: req, response: res });
  // create intentMap for handle intent
  let intentMap = new Map();
  // add intent map 2nd parameter pass function
  intentMap.set("Default", handleDefaultIntent);
  intentMap.set("CityInfo", handleCityInfo);
  intentMap.set("Goodbye", handleGoodBye);
  intentMap.set("CurrentWeather", handleCurrentWeather);
  intentMap.set("HistoryIndia", handleHistoryIndia);
  intentMap.set("RouteDetails", handleRouteDetails);
  intentMap.set("whereTovisit", handleWhereToVisit);
  intentMap.set("whereTovisit-loc", handleWhereToVisitLoc);
  // now agent is handle request and pass intent map
  agent.handleRequest(intentMap);
});


/**
 * now listing the server on port number 3000 :)
 * */
app.listen(3000, () => {
  console.log("Server is Running on port 3000");
});

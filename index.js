const express = require("express");
const {
  WebhookClient,
  Card,
  Image,
  Text,
  Suggestion,
} = require("dialogflow-fulfillment");
const app = express();
const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": "d7f822d3d8msh92a9e18cebc46e5p11cab1jsna6838d9ff918",
    "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
  },
};

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

  // now agent is handle request and pass intent map
  agent.handleRequest(intentMap);
});

// helper function

function getRouteDetails(origin,destination,mode) {
  const url = `https://router.hereapi.com/v8/routes?transportMode=${mode}&origin=${origin}&destination=${destination}&return=summary&apikey=W0LtOYvklDQE7DcthrtykD66xoSHg7-DPyGXtpgyQtA`;

}
function getQueryImage(q) {
  // any image on the page
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${q}&pithumbsize=500`;
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const pageId = Object.keys(data.query.pages)[0];
      let imageUrl = "";
      if (data.query.pages[pageId].thumbnail) {
        imageUrl = data.query.pages[pageId].thumbnail.source;
      } else {
        imageUrl =
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/1200px-No-Image-Placeholder.svg.png";
      }
      return imageUrl;
    });
}

function getDesc(q) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${q}&exintro=true&explaintext=true`;
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const pageId = Object.keys(data.query.pages)[0];
      let desc = "";
      if (data.query.pages[pageId].extract) {
        desc = data.query.pages[pageId].extract;
      } else {
        desc = "No description found";
      }
      return desc;
    });
}

// Intent handling

async function handleHistoryIndia(agent) {
    // give details about indian history
    console.log("history intent is working");
    agent.add(
      new Card(
        {
          title: "History of India",
          imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Rock_Shelter_15%2C_Bhimbetka_02.jpg/432px-Rock_Shelter_15%2C_Bhimbetka_02.jpg",
          text: "The history of India dates back to the Indus Valley Civilization of the 3rd millennium BCE. Over the centuries, various empires and dynasties, including the Maurya, Gupta, Mughal, and British, have ruled the land. India gained independence from British colonial rule in 1947, and became a republic in 1950. Throughout its history, India has been a melting pot of various cultures and religions, which have shaped its art, architecture, literature, and philosophy. The country has also been shaped by a number of significant events, including the Indian independence movement, the partition of British India, and the ongoing conflict in Kashmir. Today, India is the world's second-most populous country and one of the fastest-growing major economies.",
          buttonText: "Show History wiki",
          buttonUrl: "https://en.wikipedia.org/wiki/History_of_India"
        }

      )
    )
    
}


async function handleCurrentWeather(agent) {
  console.log("current weather intent is working");
  // get climate using weather api
  let city = agent.parameters["geo-city"];
  const url = `https://api.weatherapi.com/v1/current.json?key=51441fed7c4c42288dc63014232201&q=${city}(IN)`;
  const data = await fetch(url, options).then((res) => res.json());
  if (data.error) {
    agent.add("City not found");
    return;
  }
  const formatData = `
    According to weather api, it is ${data.current.condition.text} in ${city} with temperature of ${data.current.temp_c} degree celsius.
    
  `;
  agent.add(formatData);
}

async function handleCityInfo(agent) {
  console.log("city info intent is working");
  let city = await agent.parameters["geo-city"];
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?countryIds=IN&namePrefix=${city}`;
  const cityDetails = await fetch(url, options).then((res) => res.json());
  const desc = await getDesc(city);
  const formatDetails = `${desc}
It is located in ${cityDetails.data[0].region} region of ${cityDetails.data[0].country} country with population of ${cityDetails.data[0].population} people .`;
  const imageUrl = await getQueryImage(city);
  agent.add(
    new Card({
      title: city,
      imageUrl: imageUrl,
      text: formatDetails,
      buttonText: `Show ${city} wiki`,
      buttonUrl: `https://wikidata.org/wiki/${cityDetails.data[0].wikiDataId}`,
    })
  );
}
function handleDefaultIntent(agent) {
  // beautiful welcome to amusing bot message
  console.log("default intent is working");
  agent.add(
    new Text({
      text: "Welcome to Amusing Bot",
    })
  );
  agent.add(
    new Text({
      text: "How can I help you?",
    })
  );
}
function handleGoodBye(agent) {
  console.log("good bye intent is working");
  agent.add("Thank you for using Amusing Bot");
  agent.add(
    new Image({
      imageUrl:
        "https://thumbs.dreamstime.com/b/goodbye-group-stick-figures-holding-golden-balloon-letters-greeting-kids-say-farewell-goodbye-group-stick-figures-holding-158749409.jpg",
    })
  );
}
/**
 * now listing the server on port number 3000 :)
 * */
app.listen(3000, () => {
  console.log("Server is Running on port 3000");
});

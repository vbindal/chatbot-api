const {
  WebhookClient,
  Card,
  Image,
  Text,
  Suggestion,
  Payload,
} = require("dialogflow-fulfillment");
const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://shubh:eZ9n3bAxQ9dz0pzd@cluster0.8yaor.mongodb.net";
const client = new MongoClient(uri);
// Replace the uri string with your connection string.

const API_KEY = "3d726b9fa0msh5d8fd5e5319380fp1be7c9jsncd62fc614da6";
const WEATHER_API_KEY = "51441fed7c4c42288dc63014232201";
const HERE_API_KEY = "W0LtOYvklDQE7DcthrtykD66xoSHg7-DPyGXtpgyQtA";
const POSITION_STACK_API_KEY = "3b88eac52336361f8a98c3419085ff31";
const defaultImage =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/1200px-No-Image-Placeholder.svg.png";
const { CityInfo, HotelInfo } = require("./data");
const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": API_KEY,
    "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
  },
};
const db = client.db("amusingbot");

// helper function - get city image
async function getStateFromCity(city) {
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities/${city}`;
  return fetch(url, options)
    .then((res) => res.json())
    .then((data) => {
      if (data.data && data.data.length > 0) {
        return data.data[0].regionCode;
      }
      return null;
    });
}

async function getLatLong(city) {
  // get origin lat and long
  const url = `http://api.positionstack.com/v1/forward?access_key=${POSITION_STACK_API_KEY}&query=${city}`;
  console.log(url);
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (data.data && data.data.length > 0) {
        return `${data.data[0].latitude},${data.data[0].longitude}`;
      }
      return null;
    });
}

async function getRouteDetails(origin, destination, mode) {
  // get origin lat and long
  console.log("origin", origin, " destination ", destination, " mode ", mode);
  const orignLatLong = await getLatLong(origin);
  const destinationLatLong = await getLatLong(destination);
  if (!orignLatLong || !destinationLatLong) {
    return null;
  }
  console.log(orignLatLong, destinationLatLong);
  const url = `https://router.hereapi.com/v8/routes?transportMode=${mode}&origin=${orignLatLong}&destination=${destinationLatLong}&return=summary&apikey=${HERE_API_KEY}`;
  console.log(url);
  return fetch(url).then((res) => res.json());
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
        imageUrl = defaultImage;
      }
      return imageUrl;
    });
}

function getDesc(q) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${q}&exintro=true&explaintext=true`;
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.query || data.query.pages["-1"]) {
        return "No description found";
      }
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

function secondsToHms(d) {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor((d % 3600) / 60);
  var s = Math.floor((d % 3600) % 60);

  var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return hDisplay + mDisplay + sDisplay;
}
async function getStateFoods(state) {
  const foods = db.collection("foods");
  // use regex to match state
  const query = {
    state: { $regex: new RegExp(state, "i") },
  };
  return foods.find(query).toArray();
}
// getStateFoods('rajasthan').then((res)=>console.log(res));
// Intent handling - webhook functions

module.exports.handleCityVisit = async function handleCityVisit(agent) {
  console.log("hanleCityVisit called");
  const city = agent.parameters["geo-city"] ?? agent.parameters["geo-state"];
	console.log("city", city);
	//  share location with user
	//  https://maps.google.com/?q=<lat>,<lng>
  const latLong = await getLatLong(city);
	console.log("latLong", latLong);
	const payload = {
		"telegram": {
			"text": `Follow the link to see the location of the ${city}`,
			"reply_markup": {
				"inline_keyboard": [
					[
						{
							"text": "Location",
							"url": `https://maps.google.com/?q=${latLong}`
						}
					]
				]
			}
		}
	}
	agent.add(new Payload(agent.TELEGRAM, payload, { rawPayload: true, sendAsMessage: true }));
};

module.exports.handleHotelInfo = async function handleHotelInfo(agent) {
  console.log("handle hotel info intent called");
  const city = agent.parameters["geo-city"];
  if (!city) {
    for (const city of Object.keys(HotelInfo)) {
      agent.add(new Suggestion(city));
    }
    return;
  }
  console.log("hotel working with city ", city);
  let cnt = 0;
  const hotelInfo = HotelInfo[city];
  if (!hotelInfo) {
    agent.add(`Sorry, I don't know about hotels in this ${city}`);
    return;
  }
  for (const hotel of hotelInfo) {
    cnt++;
    agent.add(
      new Card({
        title: hotel.name,
        imageUrl: hotel.image,
        text: `
				${hotel.description}
				Contact: ${hotel.contact}
				Address: ${hotel.address}
				`,
        buttonText: "Book Now",
        buttonUrl: hotel.url,
      })
    );
  }
  if (cnt === 0) {
    agent.add(`Sorry, I don't know about this city`);
  }
};

module.exports.handleFamousFood = async function handleFamousFood(agent) {
  console.log("handle famous food intent called");
  const state = agent.parameters["geo-state"];
  if (!state) {
    agent.add(`Please provide a state for which you want to know about food`);
    return;
  }
  const foods = await getStateFoods(state);
  if (!foods || foods.length === 0) {
    agent.add(`Sorry, I don't know about this state`);
    return;
  }
  let cnt = 0;

  for (const food of foods) {
    const formatDetails = `
			Ingredients: ${food.ingredients} 
			Preparation Time: ${food.prep_time} minutes
			Cooking Time: ${food.cook_time} minutes
			Course: ${food.course} 
			State: ${food.state}
			region: ${food.region}
			`;
    const img = await getQueryImage(food.name);
    // if (img === defaultImage) {
    //   continue;
    // }
    cnt++;
    if (cnt == 4) {
      break;
    }
    agent.add(
      new Card({
        title: food.name,
        imageUrl: img,
        text: formatDetails,
      })
    );
  }
};
module.exports.handleWhereToVisitLoc = function handleWhereToVisitLoc(agent) {
  console.log("WhereToVisitLoc intent is working");
  const city = agent.parameters["geo-city"];
  const cityInfo = CityInfo[city];
  console.log("here city for visit loc ", city);
  if (!cityInfo) {
    agent.add("Sorry, I don't know about this city");
    return;
  }
  for (const place of cityInfo) {
    agent.add(
      new Card({
        title: place.title,
        imageUrl: place.img,
        text: place.desc,
        buttonText: "Visit",
        buttonUrl: place.url,
      })
    );
  }
};

module.exports.handleWhereToVisit = function handleWhereToVisit(agent) {
  console.log("WhereToVisit intent is working");
  agent.add("Where do you want to visit?");
  for (let city in CityInfo) {
    agent.add(new Suggestion(city));
  }
};
module.exports.handleRouteDetails = async function handleRouteDetails(agent) {
  // get route details
  console.log("route details intent is working");
  let origin = agent.parameters["from-geo"];
  let destination = agent.parameters["to-geo"];
  let mode = agent.parameters["mode"] ?? "car";
  const data = await getRouteDetails(origin, destination, mode);
  if (!data || !data.routes) {
    agent.add("Not valid route");
    return;
  }
  const distance = data.routes[0].sections[0].summary.length;
  const duration = data.routes[0].sections[0].summary.duration;
  agent.add(
    `The distance between ${origin} and ${destination} is ${
      distance / 1000
    }Km and the duration is ${secondsToHms(duration)} by ${mode}
		`
  );
};

module.exports.handleHistoryIndia = function handleHistoryIndia(agent) {
  // give details about indian history
  console.log("history intent is working");
  agent.add(
    new Card({
      title: "History of India",
      imageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Rock_Shelter_15%2C_Bhimbetka_02.jpg/432px-Rock_Shelter_15%2C_Bhimbetka_02.jpg",
      text: "The history of India dates back to the Indus Valley Civilization of the 3rd millennium BCE. Over the centuries, various empires and dynasties, including the Maurya, Gupta, Mughal, and British, have ruled the land. India gained independence from British colonial rule in 1947, and became a republic in 1950. Throughout its history, India has been a melting pot of various cultures and religions, which have shaped its art, architecture, literature, and philosophy. The country has also been shaped by a number of significant events, including the Indian independence movement, the partition of British India, and the ongoing conflict in Kashmir. Today, India is the world's second-most populous country and one of the fastest-growing major economies.",
      buttonText: "Show History wiki",
      buttonUrl: "https://en.wikipedia.org/wiki/History_of_India",
    })
  );
};

module.exports.handleCurrentWeather = async function handleCurrentWeather(
  agent
) {
  // get climate using weather api
  let city = agent.parameters["geo-city"];
  console.log("current weather intent is working with ", city);
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}(IN)`;
  const data = await fetch(url, options).then((res) => res.json());
  if (data.error) {
    agent.add("City not found");
    return;
  }
  const formatData = `
			According to weather api, it is ${data.current.condition.text} in ${city} with temperature of ${data.current.temp_c} degree celsius.
			
		`;
  agent.add(formatData);
};

module.exports.handleCityInfo = async function handleCityInfo(agent) {
  console.log("city info intent is working");
  let city = agent.parameters["geo-city"] || agent.parameters["geo-state"];
  if (!city) {
    agent.add("Please provide city/state name");
    return;
  }
  console.log("city info intent is working with ", city);
  const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?countryIds=IN&namePrefix=${city}`;
  const cityDetails = await fetch(url, options).then((res) => res.json());
  const desc = await getDesc(city);
  const formatDetails = `${desc.substring(0, 200)}...
	It is located in ${cityDetails.data[0].region} region of ${
    cityDetails.data[0].country
  } country with population of ${cityDetails.data[0].population} people .`;
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
};
module.exports.handleDefaultIntent = function handleDefaultIntent(agent) {
  // beautiful welcome to amusing bot message
  console.log("default intent is working");
  agent.add(
    new Text({
      text: "Welcome to Amusing Bot",
    })
  );
  // agent.add(
  //   `How can I help you?some suggested questions you can ask from me :
  //   best places in india,best foods in india,
  //   best foods/dishes of different states india,culture of india,
  //   info about different states in india,weather of different places in india,
  //   distance between two places`
  // );
  const payload = {
    telegram: {
      text: "What can i do for you?",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Suggest Places",
              callback_data: "Suggest me places to visit",
            },
            {
              text: "Suggest Foods",
              callback_data: "famous food of state",
            },
          ],
          [
            {
              text: "Current weather",
              callback_data: "Current weather",
            },
            {
              text: "Place Information",
              callback_data: "Info about",
            },
          ],
          [
            {
              text: "Route Details",
              callback_data: "Distance between two places",
            },
            {
              text: "Hotels",
              callback_data: "Hotels",
            },
          ],

          [
            {
              text: "Faqs",
              // link: https://drive.google.com/file/d/1ocCdUVs0Z-BN0zrZDhqc7AisDzk0MZBZ/view?usp=share_link
              url: "https://drive.google.com/file/d/1ocCdUVs0Z-BN0zrZDhqc7AisDzk0MZBZ/view?usp=sharing",
            },
          ],
        ],
      },
    },
  };
  agent.add(
    new Payload(agent.TELEGRAM, payload, {
      sendAsMessage: true,
      rawPayload: true,
    })
  );
};
module.exports.handleGoodBye = function handleGoodBye(agent) {
  console.log("good bye intent is working");
  agent.add("Thank you for using Amusing Bot");
  agent.add(
    new Image({
      imageUrl:
        "https://thumbs.dreamstime.com/b/goodbye-group-stick-figures-holding-golden-balloon-letters-greeting-kids-say-farewell-goodbye-group-stick-figures-holding-158749409.jpg",
    })
  );
};

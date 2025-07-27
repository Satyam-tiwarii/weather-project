const apiKey = "b8711879460f8ff8e1ad302732b6de8b";
let timeInterval;
let suggestion = "", forKids = "";

document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

window.addEventListener("load", () => {
  const lastCity = localStorage.getItem("lastCity");
  if (lastCity) {
    document.getElementById("cityInput").value = lastCity;
    getWeather();
  }
});

function getWeather() {
  const city = document.getElementById("cityInput").value;
  if (!city) return alert("Please enter a city name.");
  localStorage.setItem("lastCity", city);

  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
  fetchAndDisplay(weatherUrl, forecastUrl);
}

function getWeatherByLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      fetchAndDisplay(weatherUrl, forecastUrl);
    }, () => alert("Location access denied."));
  } else {
    alert("Geolocation not supported.");
  }
}

async function fetchAndDisplay(weatherUrl, forecastUrl) {
  document.getElementById("loader").style.display = "block";
  document.getElementById("weatherInfo").style.display = "none";
  document.getElementById("forecast").style.display = "none";

  try {
    const [weatherRes, forecastRes] = await Promise.all([fetch(weatherUrl), fetch(forecastUrl)]);
    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();

    if (weatherData.cod !== 200 || forecastData.cod !== "200") return alert("City not found!");

    const timezoneOffsetInSec = weatherData.timezone;
    document.getElementById("location").innerText = `${weatherData.name}, ${weatherData.sys.country}`;
    document.getElementById("temperature").innerText = weatherData.main.temp;
    document.getElementById("description").innerText = weatherData.weather[0].description;
    document.getElementById("humidity").innerText = weatherData.main.humidity;
    document.getElementById("wind").innerText = weatherData.wind.speed;
    document.getElementById("weatherInfo").style.display = "block";

    clearInterval(timeInterval);
    const getCityTime = () => {
      const nowUTC = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
      const localTime = new Date(nowUTC + timezoneOffsetInSec * 1000);
      return localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };
    document.getElementById("localTime").innerText = getCityTime();
    timeInterval = setInterval(() => {
      document.getElementById("localTime").innerText = getCityTime();
    }, 1000);

    const forecastEl = document.getElementById("forecast");
    forecastEl.innerHTML = "";
    const dailyForecasts = {};
    forecastData.list.forEach(entry => {
      const date = entry.dt_txt.split(" ")[0];
      const hour = entry.dt_txt.split(" ")[1];
      if (hour === "12:00:00" && !dailyForecasts[date]) {
        dailyForecasts[date] = entry;
      }
    });

    Object.keys(dailyForecasts).forEach(date => {
      const day = dailyForecasts[date];
      const dayName = new Date(day.dt_txt).toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric"
      });
      forecastEl.innerHTML += `<div class="forecast-day">
        <h4>${dayName}</h4>
        <p>${day.weather[0].main}</p>
        <p>${day.main.temp} °C</p>
      </div>`;
    });
    forecastEl.style.display = "flex";

    const temp = weatherData.main.temp;
    const condition = weatherData.weather[0].main.toLowerCase();
    let icon = "";
    if (condition.includes("clear")) icon = "☀️";
    else if (condition.includes("cloud")) icon = "☁️";
    else if (condition.includes("rain")) icon = "🌧️";
    else if (condition.includes("snow")) icon = "❄️";
    else if (condition.includes("thunder")) icon = "⛈️";
    else if (condition.includes("fog") || condition.includes("mist")) icon = "🌫️";
    document.getElementById("weatherIcon").innerText = icon;

    suggestion = temp <= 5 ? "Wear a heavy coat, gloves, and scarf. 🧥🧣" :
                 temp <= 15 ? "A jacket or hoodie is recommended. 🧥" :
                 temp <= 25 ? "Light clothing is fine. 👕" :
                 "Stay cool with shorts and a t-shirt. 🩳☀️";
    if (condition.includes("rain")) suggestion += " Don't forget an umbrella! ☔";
    if (condition.includes("snow")) suggestion += " Wear boots and stay warm! ❄️";
    if (condition.includes("clear")) suggestion += " Sunglasses recommended. 😎";

    const currentHour = new Date().getUTCHours() + timezoneOffsetInSec / 3600;
    const isEvening = currentHour >= 18 || currentHour <= 6;
    if (isEvening) suggestion += " It might get colder in the evening.";

    const forElderly = temp <= 15 ? " Elderly should dress warmly and avoid going out late." : " Elderly should stay hydrated and avoid direct sun.";
    forKids = temp <= 15 ? " Kids should wear warm clothes and stay indoors if windy." : " Kids can wear casual clothes, but don’t forget sunscreen!";
    suggestion += forElderly;

    document.getElementById("clothingAdvice").innerText = suggestion;
    document.getElementById("kidsAdvice").innerText = forKids;

    setTimeout(() => {
      speakForecast(weatherData.name, temp, weatherData.weather[0].description, suggestion);
    }, 300);
  } catch (err) {
    console.error(err);
    alert("Something went wrong!");
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}

function translateAdvice() {
  const lang = document.getElementById("languageSelect").value;
  if (lang === "hi") {
    document.getElementById("clothingAdvice").innerText = "कृपया गर्म कपड़े पहनें और छाता साथ रखें।";
    document.getElementById("kidsAdvice").innerText = "बच्चों को गर्म कपड़े पहनाएं और उन्हें सुरक्षित रखें।";
  } else {
    document.getElementById("clothingAdvice").innerText = suggestion;
    document.getElementById("kidsAdvice").innerText = forKids;
    fetchFamousPlaces(weatherData.name);

  }
}

function speakForecast(city, temp, description, suggestion) {
  const message = `In ${city}, it is ${Math.round(temp)} degrees Celsius and ${description}. ${suggestion}`;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function repeatForecast() {
  const city = document.getElementById("location").innerText;
  const temp = parseFloat(document.getElementById("temperature").innerText);
  const desc = document.getElementById("description").innerText;
  const suggest = document.getElementById("clothingAdvice").innerText;
  speakForecast(city, temp, desc, suggest);
}

function fetchFamousPlaces(city) {
  const query = `${city} tourist attractions`;
  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|extracts&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=200`;

  fetch(wikiUrl)
    .then(res => {
      if (!res.ok) {
        throw new Error("Wikipedia API fetch failed");
      }
      return res.json();
    })
    .then(data => {
      const placesEl = document.getElementById("famousPlaces");
      placesEl.innerHTML = "<h3>🌍 Famous Places:</h3>";

      if (!data.query || !data.query.pages) {
        placesEl.innerHTML += "<p>No famous places found.</p>";
        return;
      }

      const pages = Object.values(data.query.pages);
      pages.forEach(place => {
        const img = place.thumbnail
          ? `<img src="${place.thumbnail.source}" alt="${place.title}" />`
          : "";
        placesEl.innerHTML += `
          <div class="place-card">
            ${img}
            <div>
              <h4>${place.title}</h4>
              <p>${place.extract}</p>
            </div>
          </div>
        `;
      });
    })
    .catch(err => {
      console.error("Wiki fetch error:", err);
      const placesEl = document.getElementById("famousPlaces");
      placesEl.innerHTML = "<p>Could not load famous places.</p>";
    });
}

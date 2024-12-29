// Replace with your API keys
const OPENWEATHER_API_KEY = 'fed4f6f9a15b20f559a020c4353662ef';
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoicHJpc2hhNTUwMSIsImEiOiJjbTU3eXBlcnMwaDVxMnVzNzlhamhhZWFnIn0.tup6yO_yGBzQP1vJVnoX4w';

// Initialize Mapbox
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
let map;

// DOM Elements
const darkModeToggle = document.getElementById('darkModeToggle');
const unitToggle = document.getElementById('unitToggle');
const getCurrentWeatherBtn = document.getElementById('getCurrentWeather');
const searchWeatherBtn = document.getElementById('searchWeather');
const cityInput = document.getElementById('city');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
darkModeToggle.addEventListener('change', toggleDarkMode);
unitToggle.addEventListener('change', handleUnitToggle);
getCurrentWeatherBtn.addEventListener('click', getCurrentLocationWeather);
searchWeatherBtn.addEventListener('click', searchWeather);

function handleUnitToggle() {
    // Store the preference
    localStorage.setItem('tempUnit', unitToggle.checked ? 'F' : 'C');

    // Refresh weather data with new unit
    const locationText = document.getElementById('currentLocation').textContent;
    if (locationText !== 'Location: Not Available') {
        const currentCity = cityInput.value;
        if (currentCity) {
            searchWeather();
        } else {
            getCurrentLocationWeather();
        }
    }
}

// Initialize the application
function initializeApp() {
    // Initialize map with default location (London)
    initializeMap([-0.127758, 51.507351]);

    // Check for saved preferences
    if (localStorage.getItem('darkMode') === 'true') {
        darkModeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }
}

// Initialize Mapbox map
function initializeMap(coordinates) {
    try {
        if (map) {
            map.remove();
        }

        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: coordinates,
            zoom: 10
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Add marker
        new mapboxgl.Marker()
            .setLngLat(coordinates)
            .addTo(map);
    } catch (error) {
        console.error('Map initialization error:', error);
        document.getElementById('map').innerHTML = 'Error loading map. Please check your Mapbox API key.';
    }
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkModeToggle.checked);

    // Update map style if map exists
    if (map) {
        map.setStyle(darkModeToggle.checked ?
            'mapbox://styles/mapbox/dark-v10' :
            'mapbox://styles/mapbox/streets-v11'
        );
    }
}

// Get weather for current location
async function getCurrentLocationWeather() {
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        await getWeatherData(latitude, longitude);
        initializeMap([longitude, latitude]);
    } catch (error) {
        console.error('Location error:', error);
        alert('Error getting current location. Please ensure location access is enabled in your browser.');
    }
}

// Get current position
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

// Search weather by city name
async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        alert('Please enter a city name');
        return;
    }

    try {
        const coordinates = await getCityCoordinates(city);
        await getWeatherData(coordinates.lat, coordinates.lon);
        initializeMap([coordinates.lon, coordinates.lat]);
    } catch (error) {
        console.error('Search error:', error);
        alert('Error finding location. Please check the city name and try again.');
    }
}

// Get city coordinates from OpenWeather Geocoding API
async function getCityCoordinates(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (!data.length) {
            throw new Error('City not found');
        }

        return {
            lat: data[0].lat,
            lon: data[0].lon
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error('Error finding city coordinates');
    }
}

// Modify the getWeatherData function
async function getWeatherData(lat, lon) {
    try {
        // Get current weather
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${unitToggle.checked ? 'imperial' : 'metric'}`
        );

        if (!currentResponse.ok) {
            throw new Error('Error fetching current weather');
        }

        const currentWeather = await currentResponse.json();

        // Get additional data including UV index
        const airQualityResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
        );

        const airQualityData = await airQualityResponse.json();

        // Get forecast
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${unitToggle.checked ? 'imperial' : 'metric'}`
        );

        if (!forecastResponse.ok) {
            throw new Error('Error fetching forecast');
        }

        const forecast = await forecastResponse.json();

        updateEnhancedWeatherDisplay(currentWeather, airQualityData, forecast);
    } catch (error) {
        console.error('Weather data error:', error);
        alert('Error fetching weather data. Please check your API key and try again.');
    }
}

// Update the weather display function
function updateEnhancedWeatherDisplay(current, airQuality, forecast) {
    try {
        // Update location
        document.getElementById('currentLocation').textContent =
            `Location: ${current.name}, ${current.sys.country}`;

        const weatherHTML = `
    <div class="weather-grid">
        <div class="weather-item main-weather">
            <div class="weather-icon">
                <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png" alt="Weather icon">
            </div>
            <div class="main-temp">
                <h2>${Math.round(current.main.temp)}°${unitToggle.checked ? 'F' : 'C'}</h2>
                <p>${current.weather[0].main}</p>
                <p>Feels like: ${Math.round(current.main.feels_like)}°${unitToggle.checked ? 'F' : 'C'}</p>
            </div>
        </div>

        <div class="weather-item">
            <h3><i class="fas fa-wind"></i> Wind</h3>
            <p>Speed: ${current.wind.speed} ${unitToggle.checked ? 'mph' : 'm/s'}</p>
            <p>Direction: ${getWindDirection(current.wind.deg)}</p>
        </div>

        <div class="weather-item">
            <h3><i class="fas fa-tint"></i> Humidity & Pressure</h3>
            <p>Humidity: ${current.main.humidity}%</p>
            <p>Pressure: ${current.main.pressure} hPa</p>
        </div>

        <div class="weather-item">
            <h3><i class="fas fa-cloud"></i> Air Quality</h3>
            <p>AQI: ${getAQIDescription(airQuality.list[0].main.aqi)}</p>
            <p>PM2.5: ${airQuality.list[0].components.pm2_5.toFixed(1)} μg/m³</p>
        </div>

        <div class="weather-item">
            <h3><i class="fas fa-eye"></i> Visibility</h3>
            <p>${(current.visibility / 1000).toFixed(1)} km</p>
            <p>Cloud Cover: ${current.clouds.all}%</p>
        </div>

        <div class="weather-item sun-times">
            <h3><i class="fas fa-sun"></i> Sun Times</h3>
            <div class="sun-time-grid">
                <div>
                    <i class="fas fa-sunrise"></i>
                    <p>Sunrise</p>
                    <p>${new Date((current.sys.sunrise + current.timezone) * 1000).toUTCString().slice(17, 22)}</p>
                </div>
                <div>
                    <i class="fas fa-sunset"></i>
                    <p>Sunset</p>
                    <p>${new Date((current.sys.sunset + current.timezone) * 1000).toUTCString().slice(17, 22)}</p>
                </div>
            </div>
        </div>
    </div>
`;
        document.getElementById('weatherDetails').innerHTML = weatherHTML;
        updateForecastDisplay(forecast);
    } catch (error) {
        console.error('Display update error:', error);
        alert('Error updating weather display');
    }
}
// Add these helper functions in your main.js file
function getAQIDescription(aqi) {
    const aqiLevels = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor'
    };
    return aqiLevels[aqi] || 'Not available';
}

function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}


// Update weather display
function updateWeatherDisplay(current, forecast) {
    try {
        // Update current weather
        document.getElementById('currentLocation').textContent = `Location: ${current.name}, ${current.sys.country}`;
        document.getElementById('currentTemperature').textContent =
            `Temperature: ${Math.round(current.main.temp)}°${unitToggle.checked ? 'F' : 'C'}`;
        document.getElementById('currentDetails').textContent =
            `Weather: ${current.weather[0].main} - ${current.weather[0].description}`;

        // Update sunrise/sunset with timezone adjustment
        const timezoneOffset = current.timezone; // Timezone offset in seconds
        const sunrise = new Date((current.sys.sunrise + timezoneOffset) * 1000).toUTCString().slice(17, 22);
        const sunset = new Date((current.sys.sunset + timezoneOffset) * 1000).toUTCString().slice(17, 22);
        document.getElementById('sunriseSunset').textContent =
            `Sunrise: ${sunrise} / Sunset: ${sunset} (Local Time)`;

        // Update forecast
        updateForecastDisplay(forecast);
    } catch (error) {
        console.error('Display update error:', error);
        alert('Error updating weather display');
    }
}

// Update forecast display
function updateForecastDisplay(forecast) {
    try {
        const forecastContainer = document.getElementById('forecastCards');
        forecastContainer.innerHTML = '';

        // Get one forecast per day
        const dailyForecasts = forecast.list.filter(item =>
            item.dt_txt.includes('12:00:00')
        ).slice(0, 7);

        dailyForecasts.forEach(day => {
            const date = new Date(day.dt * 1000);
            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <h3>${date.toLocaleDateString()}</h3>
                <p>${Math.round(day.main.temp)}°${unitToggle.checked ? 'F' : 'C'}</p>
                <p>${day.weather[0].main}</p>
                <p>Humidity: ${day.main.humidity}%</p>
            `;
            forecastContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Forecast display error:', error);
        alert('Error updating forecast display');
    }
}
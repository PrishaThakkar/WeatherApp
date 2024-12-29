from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
from datetime import datetime, timezone, timedelta


app = Flask(__name__)
CORS(app)

API_KEY = "fed4f6f9a15b20f559a020c4353662ef"
WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
ONE_CALL_BASE_URL = "https://api.openweathermap.org/data/2.5/onecall"
GEOCODE_BASE_URL = "http://api.openweathermap.org/geo/1.0/direct"


def get_units_label(units):
    return "Celsius" if units == "metric" else "Fahrenheit"

def format_unix_time(unix_time, timezone_offset):
    local_time = datetime.fromtimestamp(unix_time + timezone_offset, tz=timezone.utc)
    return local_time.strftime('%H:%M:%S')


def fetch_current_weather(lat, lon, units="metric"):
    try:
        url = f"{WEATHER_BASE_URL}?lat={lat}&lon={lon}&appid={API_KEY}&units={units}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "cod" in data and data["cod"] != 200:
            raise ValueError(data.get("message", "Unknown error"))
        return data
    except (requests.exceptions.RequestException, ValueError) as e:
        print(f"Error fetching current weather: {e}")
        return {"error": f"Unable to fetch weather data: {str(e)}"}

def fetch_seven_day_forecast(lat, lon, units="metric"):
    try:
        url = f"{ONE_CALL_BASE_URL}?lat={lat}&lon={lon}&exclude=hourly,minutely,alerts&units={units}&appid={API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if "cod" in data and data["cod"] != 200:
            raise ValueError(data.get("message", "Unknown error"))
        return data
    except (requests.exceptions.RequestException, ValueError) as e:
        print(f"Error fetching 7-day forecast: {e}")
        return {"error": f"Unable to fetch forecast data: {str(e)}"}


@app.route('/weather', methods=['GET'])
def current_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    units = request.args.get('units', 'metric')

    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    weather_data = fetch_current_weather(lat, lon, units)
    if "error" in weather_data:
        return jsonify(weather_data), 500

    try:
        weather_info = {
            "latitude": lat,
            "longitude": lon,
            "temperature": weather_data["main"]["temp"],
            "feels_like": weather_data["main"]["feels_like"],
            "temp_min": weather_data["main"]["temp_min"],
            "temp_max": weather_data["main"]["temp_max"],
            "humidity": weather_data["main"]["humidity"],
            "pressure": weather_data["main"]["pressure"],
            "weather_condition": weather_data["weather"][0]["main"],
            "description": weather_data["weather"][0]["description"],
            "icon": weather_data["weather"][0]["icon"],
            "icon_url": f"http://openweathermap.org/img/wn/{weather_data['weather'][0]['icon']}@2x.png",
            "wind_speed": weather_data["wind"]["speed"],
            "city": weather_data["name"],
            "country": weather_data["sys"]["country"],
            "sunrise": format_unix_time(weather_data["sys"]["sunrise"], weather_data["timezone"]),
            "sunset": format_unix_time(weather_data["sys"]["sunset"], weather_data["timezone"]),
            "units": get_units_label(units)
        }
    except KeyError as e:
        print(f"Error parsing weather data: {e}")
        return jsonify({"error": "Unexpected data structure from API"}), 500

    return jsonify(weather_info)


@app.route('/seven_day_forecast', methods=['GET'])
def seven_day_forecast():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    units = request.args.get('units', 'metric')

    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    forecast_data = fetch_seven_day_forecast(lat, lon, units)
    if "error" in forecast_data:
        return jsonify(forecast_data), 500

    try:
        daily_forecast = [
            {
                "date": datetime.utcfromtimestamp(day["dt"]).strftime('%Y-%m-%d'),
                "temperature_day": day["temp"]["day"],
                "temperature_night": day["temp"]["night"],
                "temperature_feels_like_day": day["feels_like"]["day"],
                "temperature_feels_like_night": day["feels_like"]["night"],
                "weather_condition": day["weather"][0]["main"],
                "description": day["weather"][0]["description"],
                "humidity": day["humidity"],
                "wind_speed": day["wind_speed"],
                "icon": day["weather"][0]["icon"],
                "icon_url": f"http://openweathermap.org/img/wn/{day['weather'][0]['icon']}@2x.png"
            }
            for day in forecast_data.get("daily", [])
        ]
    except KeyError as e:
        print(f"Error parsing forecast data: {e}")
        return jsonify({"error": "Unexpected data structure from API"}), 500

    return jsonify({
        "latitude": forecast_data["lat"],
        "longitude": forecast_data["lon"],
        "units": get_units_label(units),
        "daily_forecast": daily_forecast
    })


@app.route('/geocode', methods=['GET'])
def geocode():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City name is required"}), 400

    try:
        url = f"{GEOCODE_BASE_URL}?q={city}&limit=1&appid={API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        if not data:
            return jsonify({"error": "City not found"}), 404

        city_info = {
            "name": data[0]["name"],
            "latitude": data[0]["lat"],
            "longitude": data[0]["lon"],
            "country": data[0]["country"],
        }
        return jsonify(city_info)
    except requests.exceptions.RequestException as e:
        print(f"Error fetching geocode: {e}")
        return jsonify({"error": f"Unable to fetch geocode data: {str(e)}"}), 500


@app.route('/')
def home():
    return "Backend is running!"


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

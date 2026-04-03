// Step A: You will need to replace this string with your actual API key from OpenWeatherMap
const apiKey = 'ef75ab0b22d7e108b75fda1dae3f1de4'; 

// Global variables for our map and chart
let weatherChart = null; 
let map = null; 

async function checkWeather() {
    const city = document.getElementById('cityInput').value;
    const weatherInfo = document.getElementById('weatherInfo');
    const errorText = document.getElementById('error');

    if (!city) return;

    try {
        // --- 1. Fetch Current Weather ---
        const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        if (!currentResponse.ok) throw new Error('City not found');
        const currentData = await currentResponse.json();

        // Inject text data into HTML
        document.getElementById('cityName').innerText = currentData.name;
        document.getElementById('temp').innerText = `Temperature: ${Math.round(currentData.main.temp)}°C`;
        document.getElementById('description').innerText = `Condition: ${currentData.weather[0].main}`;
        document.getElementById('humidity').innerText = `Humidity: ${currentData.main.humidity}%`;
        
        // Change the background theme
        updateTheme(currentData.weather[0].main);

        // --- 2. Update the Interactive Map ---
        const lat = currentData.coord.lat;
        const lon = currentData.coord.lon;

        if (map === null) {
            // Create map if it doesn't exist
            map = L.map('map').setView([lat, lon], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        } else {
            // Move map if it already exists
            map.setView([lat, lon], 10);
        }

        // Clear old markers and add a new one
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });
        L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${currentData.name}</b><br>${Math.round(currentData.main.temp)}°C`)
            .openPopup();

        // --- 3. Fetch the 5-Day Forecast ---
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`);
        const forecastData = await forecastResponse.json();
        
        drawChart(forecastData);

        // Show the entire dashboard, hide errors
        weatherInfo.style.display = 'block';
        errorText.style.display = 'none';

        // Bug fix: Leaflet sometimes renders weirdly when hidden, this forces it to resize properly
        setTimeout(() => { map.invalidateSize(); }, 100);

    } catch (error) {
        // Handle Errors (Typo in city name, etc.)
        weatherInfo.style.display = 'none';
        errorText.style.display = 'block';
        document.body.className = '';
        document.body.style.backgroundColor = '#f0f2f5';
        console.error("Dashboard Error:", error);
    }
}


// --- Helper Function: Update Professional Accent Theme ---
function updateTheme(weatherCondition) {
    const card = document.querySelector('.card');
    const condition = weatherCondition.toLowerCase();
    
    // Instead of the whole background, we change the card's top border accent
    if (condition.includes('clear')) {
        card.style.borderTopColor = '#eab308'; // Professional Gold/Yellow
    } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm')) {
        card.style.borderTopColor = '#3b82f6'; // Clean Blue
    } else if (condition.includes('cloud')) {
        card.style.borderTopColor = '#64748b'; // Slate Gray
    } else if (condition.includes('snow')) {
        card.style.borderTopColor = '#7dd3fc'; // Light Ice Blue
    } else {
        card.style.borderTopColor = '#0f172a'; // Default Dark Slate
    }
}

// --- Helper Function: Draw the Forecast Chart ---
function drawChart(forecastData) {
    // Filter to get roughly one reading per day (12:00 PM)
    const dailyData = forecastData.list.filter(item => item.dt_txt.includes('12:00:00'));

    const labels = dailyData.map(item => {
        const date = new Date(item.dt_txt);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    
    const temperatures = dailyData.map(item => Math.round(item.main.temp));

    if (weatherChart) {
        weatherChart.destroy(); // Remove old chart
    }

    const ctx = document.getElementById('forecastChart').getContext('2d');
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            // Inside your drawChart function...
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: '#0f172a', // 🌟 NEW: Sleek dark slate line
                backgroundColor: 'rgba(15, 23, 42, 0.1)', // 🌟 NEW: Very subtle fill
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: true, title: { display: true, text: 'Temp (°C)' } }
            }
        }
    });
}